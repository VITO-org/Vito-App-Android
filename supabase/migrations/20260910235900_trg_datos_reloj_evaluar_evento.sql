-- ============================================
-- Trigger: datos_reloj -> Edge Function evaluar-evento
-- HU-BUG-PUSH-SERVER-01 / Session 2026-09-10
-- Idempotente: seguro re-ejecutar (SQL Editor o `supabase db push`).
--
-- Configuración (NO hardcodear service_role). Elegir UNA:
--   A) Dashboard → Vault → New secret:
--        name 'edge_evaluar_url'  = https://<ref>.supabase.co/functions/v1/evaluar-evento
--        name 'service_role_key'  = <service_role / sb_secret>
--   B) Settings: ALTER DATABASE postgres SET app.edge_evaluar_url = '...';
-- Deploy edge: supabase functions deploy evaluar-evento --no-verify-jwt
--   (el trigger ya firma con service_role en el header Authorization).
-- Sólo staging hasta QA verde; prod requiere aprobación explícita.
-- ============================================

-- pg_net provee net.http_post (idempotente).
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Función puente idempotente (CREATE OR REPLACE => re-ejecutable).
-- Sin bloques EXCEPTION (compat SQL Editor): vault se consulta sólo
-- si existe la tabla; current_setting(..., true) nunca levanta error.
CREATE OR REPLACE FUNCTION public.notify_evaluar_evento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  edge_url text := NULL;
  svc_key text := NULL;
  req_id bigint;
BEGIN
  -- 1) Vault (sólo si la extensión vault existe).
  IF to_regclass('vault.decrypted_secrets') IS NOT NULL THEN
    SELECT decrypted_secret INTO edge_url
    FROM vault.decrypted_secrets
    WHERE name = 'edge_evaluar_url'
    LIMIT 1;
    SELECT decrypted_secret INTO svc_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  END IF;

  -- 2) Fallback a settings app.* (missing_ok = true => NULL si faltan).
  IF edge_url IS NULL OR edge_url = '' THEN
    edge_url := current_setting('app.edge_evaluar_url', true);
  END IF;
  IF svc_key IS NULL OR svc_key = '' THEN
    svc_key := current_setting('app.service_role_key', true);
  END IF;

  -- 3) Sin config: NOTICE y deja pasar el INSERT (el push queda pendiente;
  --    jamás se revierte datos_reloj). OJO: en ese estado NO hay fan-out
  --    ni alerta (la crea la edge). Configurar Vault antes de QA.
  IF edge_url IS NULL OR edge_url = '' OR svc_key IS NULL OR svc_key = '' THEN
    RAISE NOTICE 'trg_datos_reloj_evaluar_evento: sin edge_evaluar_url/service_role_key (Vault); INSERT pasa sin fan-out';
    RETURN NEW;
  END IF;

  -- 4) Llamada async vía pg_net (sólo encola; no bloquea el INSERT).
  SELECT net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || svc_key
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  ) INTO req_id;

  RETURN NEW;
END;
$$;

-- Trigger idempotente: DROP IF EXISTS + CREATE.
DROP TRIGGER IF EXISTS trg_datos_reloj_evaluar_evento ON datos_reloj;

CREATE TRIGGER trg_datos_reloj_evaluar_evento
  AFTER INSERT ON datos_reloj
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_evaluar_evento();

-- Verificación (staging):
-- SELECT * FROM pg_trigger WHERE tgname = 'trg_datos_reloj_evaluar_evento';
-- Esperado: 1 fila (tgenabled = O).
-- QA: INSERT SpO2 82 en datos_reloj -> fila en alerta + push + notificacion_entrega.
