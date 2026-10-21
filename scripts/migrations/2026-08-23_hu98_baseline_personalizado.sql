-- ============================================
-- HU-98: Baseline personalizado por paciente
-- Fecha: 2026-08-23
-- Descripción: Crea la tabla `baseline_personalizado` (una fila por usuario)
--              con estadísticas por métrica (media, desviación estándar,
--              P25, P75), sus políticas RLS y las funciones de cálculo:
--              - recalcular_baseline_personalizado(): on-demand RPC
--              - recalcular_baselines_pendientes(): lote nocturno (pg_cron)
--
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TABLA baseline_personalizado
-- ============================================
CREATE TABLE baseline_personalizado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,

  -- ── FC (lpm) ──
  hr_media NUMERIC(6,2),
  hr_desv_std NUMERIC(6,2),
  hr_p25 NUMERIC(6,2),
  hr_p75 NUMERIC(6,2),
  hr_n_muestras INTEGER,

  -- ── PA sistólica (mmHg) ──
  bp_sist_media NUMERIC(6,2),
  bp_sist_desv_std NUMERIC(6,2),
  bp_sist_p25 NUMERIC(6,2),
  bp_sist_p75 NUMERIC(6,2),
  bp_sist_n_muestras INTEGER,

  -- ── PA diastólica (mmHg) ──
  bp_diast_media NUMERIC(6,2),
  bp_diast_desv_std NUMERIC(6,2),
  bp_diast_p25 NUMERIC(6,2),
  bp_diast_p75 NUMERIC(6,2),
  bp_diast_n_muestras INTEGER,

  -- ── SpO2 (%) ──
  spo2_media NUMERIC(5,2),
  spo2_desv_std NUMERIC(5,2),
  spo2_p25 NUMERIC(5,2),
  spo2_p75 NUMERIC(5,2),
  spo2_n_muestras INTEGER,

  -- ── Temperatura (°C) ──
  temp_media NUMERIC(5,2),
  temp_desv_std NUMERIC(5,2),
  temp_p25 NUMERIC(5,2),
  temp_p75 NUMERIC(5,2),
  temp_n_muestras INTEGER,

  -- ── Metadata del cálculo ──
  dias_historial INTEGER,
  ventana_dias INTEGER NOT NULL DEFAULT 28,
  -- true cuando hay >= min_días días y >= min_muestras por métrica;
  -- false => la app usa el fallback a rangos clínicos estándar (OMS).
  es_valido BOOLEAN NOT NULL DEFAULT FALSE,

  ultima_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice único sobre id_usuario: lookup O(1) + soporta ON CONFLICT para upserts.
CREATE UNIQUE INDEX idx_baseline_personalizado_usuario
  ON baseline_personalizado(id_usuario);

CREATE INDEX idx_baseline_personalizado_pendientes
  ON baseline_personalizado(ultima_actualizacion);

-- ============================================
-- 2. RLS: usuario lee solo su fila; escritura solo service_role
--    (el cálculo corre server-side vía SECURITY DEFINER)
-- ============================================
ALTER TABLE baseline_personalizado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "baseline_personalizado_select_own"
  ON baseline_personalizado FOR SELECT
  TO authenticated
  USING (auth.uid() = id_usuario);

CREATE POLICY "baseline_personalizado_service_role_all"
  ON baseline_personalizado FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. recalcular_baseline_personalizado()
--    Calcula media, desviación estándar, P25 y P75 por métrica sobre los
--    últimos 28 días de datos_reloj (excluyendo lecturas sospechosas).
--    Si no hay suficientes datos (< p_min_dias días o < p_min_muestras),
--    guarda stats NULL con es_valido=false → fallback a rangos estándar.
--    Idempotente: doble run → misma fila (upsert).
-- ============================================
CREATE OR REPLACE FUNCTION public.recalcular_baseline_personalizado(
  p_id_usuario uuid,
  p_min_dias int DEFAULT 7,
  p_min_muestras int DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_ventana_dias constant int := 28;
  v_desde timestamptz;
  v_dias_historial int;

  v_hr_n int;
  v_hr_media numeric(6,2);
  v_hr_desv numeric(6,2);
  v_hr_p25 numeric(6,2);
  v_hr_p75 numeric(6,2);

  v_bp_sist_n int;
  v_bp_sist_media numeric(6,2);
  v_bp_sist_desv numeric(6,2);
  v_bp_sist_p25 numeric(6,2);
  v_bp_sist_p75 numeric(6,2);

  v_bp_diast_n int;
  v_bp_diast_media numeric(6,2);
  v_bp_diast_desv numeric(6,2);
  v_bp_diast_p25 numeric(6,2);
  v_bp_diast_p75 numeric(6,2);

  v_spo2_n int;
  v_spo2_media numeric(5,2);
  v_spo2_desv numeric(5,2);
  v_spo2_p25 numeric(5,2);
  v_spo2_p75 numeric(5,2);

  v_temp_n int;
  v_temp_media numeric(5,2);
  v_temp_desv numeric(5,2);
  v_temp_p25 numeric(5,2);
  v_temp_p75 numeric(5,2);

  v_es_valido boolean := false;
BEGIN
  -- Solo el propio usuario (o service_role / pg_cron vía batch) puede recalcular.
  IF coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '') <> 'service_role'
     AND auth.uid() IS DISTINCT FROM p_id_usuario THEN
    RAISE EXCEPTION 'recalcular_baseline_personalizado: no autorizado para recalcular el baseline de otro usuario';
  END IF;

  v_desde := now() - make_interval(days => c_ventana_dias);

  -- Una sola pasada: agrega todas las métricas con FILTER,
  -- excluyendo lecturas sospechosas (filtro anti-outliers).
  SELECT
    count(DISTINCT dr.recorded_at::date),

    count(dr.frec_cardiaca_bpm),
    avg(dr.frec_cardiaca_bpm),
    stddev_samp(dr.frec_cardiaca_bpm),
    percentile_cont(0.25) WITHIN GROUP (ORDER BY dr.frec_cardiaca_bpm),
    percentile_cont(0.75) WITHIN GROUP (ORDER BY dr.frec_cardiaca_bpm),

    count(dr.bp_sistolica),
    avg(dr.bp_sistolica),
    stddev_samp(dr.bp_sistolica),
    percentile_cont(0.25) WITHIN GROUP (ORDER BY dr.bp_sistolica),
    percentile_cont(0.75) WITHIN GROUP (ORDER BY dr.bp_sistolica),

    count(dr.bp_diastolica),
    avg(dr.bp_diastolica),
    stddev_samp(dr.bp_diastolica),
    percentile_cont(0.25) WITHIN GROUP (ORDER BY dr.bp_diastolica),
    percentile_cont(0.75) WITHIN GROUP (ORDER BY dr.bp_diastolica),

    count(dr.spo2_pct),
    avg(dr.spo2_pct),
    stddev_samp(dr.spo2_pct),
    percentile_cont(0.25) WITHIN GROUP (ORDER BY dr.spo2_pct),
    percentile_cont(0.75) WITHIN GROUP (ORDER BY dr.spo2_pct),

    count(dr.temperatura),
    avg(dr.temperatura),
    stddev_samp(dr.temperatura),
    percentile_cont(0.25) WITHIN GROUP (ORDER BY dr.temperatura),
    percentile_cont(0.75) WITHIN GROUP (ORDER BY dr.temperatura)

  INTO
    v_dias_historial,

    v_hr_n, v_hr_media, v_hr_desv, v_hr_p25, v_hr_p75,
    v_bp_sist_n, v_bp_sist_media, v_bp_sist_desv, v_bp_sist_p25, v_bp_sist_p75,
    v_bp_diast_n, v_bp_diast_media, v_bp_diast_desv, v_bp_diast_p25, v_bp_diast_p75,
    v_spo2_n, v_spo2_media, v_spo2_desv, v_spo2_p25, v_spo2_p75,
    v_temp_n, v_temp_media, v_temp_desv, v_temp_p25, v_temp_p75

  FROM datos_reloj dr
  WHERE dr.id_usuario = p_id_usuario
    AND dr.recorded_at >= v_desde
    AND coalesce(dr.sospechoso, false) = false;

  -- Fallback (CA): sin >= min días o sin ninguna métrica con >= min muestras,
  -- la fila queda inválida y con stats NULL → la app usa umbrales estándar.
  v_es_valido :=
       v_dias_historial >= p_min_dias
   AND coalesce(greatest(v_hr_n, v_bp_sist_n, v_bp_diast_n, v_spo2_n, v_temp_n), 0) >= p_min_muestras;

  -- Stats por métrica solo si esa métrica alcanza el mínimo de muestras.
  INSERT INTO baseline_personalizado (
    id_usuario,
    hr_media, hr_desv_std, hr_p25, hr_p75, hr_n_muestras,
    bp_sist_media, bp_sist_desv_std, bp_sist_p25, bp_sist_p75, bp_sist_n_muestras,
    bp_diast_media, bp_diast_desv_std, bp_diast_p25, bp_diast_p75, bp_diast_n_muestras,
    spo2_media, spo2_desv_std, spo2_p25, spo2_p75, spo2_n_muestras,
    temp_media, temp_desv_std, temp_p25, temp_p75, temp_n_muestras,
    dias_historial, ventana_dias, es_valido,
    ultima_actualizacion, updated_at
  ) VALUES (
    p_id_usuario,
    CASE WHEN v_es_valido AND v_hr_n >= p_min_muestras THEN round(v_hr_media, 2) END,
    CASE WHEN v_es_valido AND v_hr_n >= p_min_muestras THEN round(v_hr_desv, 2) END,
    CASE WHEN v_es_valido AND v_hr_n >= p_min_muestras THEN round(v_hr_p25, 2) END,
    CASE WHEN v_es_valido AND v_hr_n >= p_min_muestras THEN round(v_hr_p75, 2) END,
    CASE WHEN v_es_valido THEN v_hr_n END,

    CASE WHEN v_es_valido AND v_bp_sist_n >= p_min_muestras THEN round(v_bp_sist_media, 2) END,
    CASE WHEN v_es_valido AND v_bp_sist_n >= p_min_muestras THEN round(v_bp_sist_desv, 2) END,
    CASE WHEN v_es_valido AND v_bp_sist_n >= p_min_muestras THEN round(v_bp_sist_p25, 2) END,
    CASE WHEN v_es_valido AND v_bp_sist_n >= p_min_muestras THEN round(v_bp_sist_p75, 2) END,
    CASE WHEN v_es_valido THEN v_bp_sist_n END,

    CASE WHEN v_es_valido AND v_bp_diast_n >= p_min_muestras THEN round(v_bp_diast_media, 2) END,
    CASE WHEN v_es_valido AND v_bp_diast_n >= p_min_muestras THEN round(v_bp_diast_desv, 2) END,
    CASE WHEN v_es_valido AND v_bp_diast_n >= p_min_muestras THEN round(v_bp_diast_p25, 2) END,
    CASE WHEN v_es_valido AND v_bp_diast_n >= p_min_muestras THEN round(v_bp_diast_p75, 2) END,
    CASE WHEN v_es_valido THEN v_bp_diast_n END,

    CASE WHEN v_es_valido AND v_spo2_n >= p_min_muestras THEN round(v_spo2_media, 2) END,
    CASE WHEN v_es_valido AND v_spo2_n >= p_min_muestras THEN round(v_spo2_desv, 2) END,
    CASE WHEN v_es_valido AND v_spo2_n >= p_min_muestras THEN round(v_spo2_p25, 2) END,
    CASE WHEN v_es_valido AND v_spo2_n >= p_min_muestras THEN round(v_spo2_p75, 2) END,
    CASE WHEN v_es_valido THEN v_spo2_n END,

    CASE WHEN v_es_valido AND v_temp_n >= p_min_muestras THEN round(v_temp_media, 2) END,
    CASE WHEN v_es_valido AND v_temp_n >= p_min_muestras THEN round(v_temp_desv, 2) END,
    CASE WHEN v_es_valido AND v_temp_n >= p_min_muestras THEN round(v_temp_p25, 2) END,
    CASE WHEN v_es_valido AND v_temp_n >= p_min_muestras THEN round(v_temp_p75, 2) END,
    CASE WHEN v_es_valido THEN v_temp_n END,

    v_dias_historial, c_ventana_dias, v_es_valido,
    now(), now()
  )
  ON CONFLICT (id_usuario) DO UPDATE SET
    hr_media            = excluded.hr_media,
    hr_desv_std         = excluded.hr_desv_std,
    hr_p25              = excluded.hr_p25,
    hr_p75              = excluded.hr_p75,
    hr_n_muestras       = excluded.hr_n_muestras,
    bp_sist_media       = excluded.bp_sist_media,
    bp_sist_desv_std    = excluded.bp_sist_desv_std,
    bp_sist_p25         = excluded.bp_sist_p25,
    bp_sist_p75         = excluded.bp_sist_p75,
    bp_sist_n_muestras  = excluded.bp_sist_n_muestras,
    bp_diast_media      = excluded.bp_diast_media,
    bp_diast_desv_std   = excluded.bp_diast_desv_std,
    bp_diast_p25        = excluded.bp_diast_p25,
    bp_diast_p75        = excluded.bp_diast_p75,
    bp_diast_n_muestras = excluded.bp_diast_n_muestras,
    spo2_media          = excluded.spo2_media,
    spo2_desv_std       = excluded.spo2_desv_std,
    spo2_p25            = excluded.spo2_p25,
    spo2_p75            = excluded.spo2_p75,
    spo2_n_muestras     = excluded.spo2_n_muestras,
    temp_media          = excluded.temp_media,
    temp_desv_std       = excluded.temp_desv_std,
    temp_p25            = excluded.temp_p25,
    temp_p75            = excluded.temp_p75,
    temp_n_muestras     = excluded.temp_n_muestras,
    dias_historial      = excluded.dias_historial,
    ventana_dias        = excluded.ventana_dias,
    es_valido           = excluded.es_valido,
    ultima_actualizacion = now(),
    updated_at           = now();
END;
$$;

-- El RPC lo llama el usuario autenticado para su propio baseline; service_role también.
REVOKE ALL ON FUNCTION public.recalcular_baseline_personalizado(uuid, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalcular_baseline_personalizado(uuid, int, int) TO authenticated, service_role;

-- ============================================
-- 4. recalcular_baselines_pendientes()
--    Lote nocturno: recalcula baselines con datos viejos (>7 días) o ausentes.
--    Solo service_role / pg_cron (los usuarios NO pueden llamarla).
-- ============================================
CREATE OR REPLACE FUNCTION public.recalcular_baselines_pendientes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT u.id AS id_usuario
    FROM usuario u
    LEFT JOIN baseline_personalizado bp ON bp.id_usuario = u.id
    WHERE u.es_activo = true
      AND (
        bp.id_usuario IS NULL
        OR bp.ultima_actualizacion < now() - interval '7 days'
      )
  LOOP
    PERFORM public.recalcular_baseline_personalizado(r.id_usuario);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.recalcular_baselines_pendientes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_baselines_pendientes() TO service_role;

-- ============================================
-- 5. Programación nocturna (pg_cron)
--    Riesgo conocido: pg_cron puede no estar disponible en free tier.
--    Fallback: Edge Function programada o llamada manual desde la app
--    vía recalcularBaseline(userId).
-- ============================================
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- SELECT cron.schedule(
--   'hu98-recalcular-baselines-nocturno',
--   '30 3 * * *',  -- todos los días 03:30 UTC
--   $$SELECT public.recalcular_baselines_pendientes();$$
-- );
