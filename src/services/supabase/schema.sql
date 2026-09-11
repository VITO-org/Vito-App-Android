-- Schema SQL para Supabase
-- Versión post-migración HU-92: datos orientados a ML
-- Proyecto: VITO Health Connect
-- Schema de referencia: refleja el estado actual de la BD en Supabase
-- Proyecto: https://supabase.com/dashboard/project/rkgbedehkfpiylaubjbo

-- ============================================
-- TIPOS ENUM
-- ============================================
CREATE TYPE rol_usuario AS ENUM ('paciente', 'familiar', 'medico');
CREATE TYPE sexo_biologico AS ENUM ('M', 'F', 'otro');
CREATE TYPE tipo_patologia AS ENUM ('ninguna', 'diabetes', 'hipertension', 'alzheimer', 'otra');
CREATE TYPE cat_sintoma    AS ENUM ('fisico', 'emocional');
CREATE TYPE origen_sintoma AS ENUM ('chat_ia', 'manual');

-- ============================================
-- 1. USUARIO (tabla pública vinculada a auth.users)
-- ============================================
CREATE TABLE usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  contraseña_hash TEXT,
  google_id VARCHAR(255),
  rol rol_usuario NOT NULL,
  es_activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. PERFIL_USUARIO (con patologia, peso_kg, altura_cm)
-- ============================================
CREATE TABLE perfil_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
  nombre VARCHAR(100),
  apellido VARCHAR(100),
  dni VARCHAR(20),
  fecha_nac DATE,
  sexo sexo_biologico,
  genero VARCHAR(50),
  nacionalidad VARCHAR(100),
  telefono VARCHAR(30),
  direccion TEXT,
  avatar_url TEXT,
  peso_kg DECIMAL(5,2),
  altura_cm DECIMAL(5,2),
  patologia tipo_patologia DEFAULT 'ninguna',
  patologia_descripcion TEXT
);

-- ============================================
-- 3. PASSWORD_RESET_TOKENS
-- ============================================
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

-- ============================================
-- 4. DATOS_RELOJ (cada 30 seg desde el smartwatch)
-- ============================================
CREATE TABLE datos_reloj (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  bp_sistolica INTEGER,
  bp_diastolica INTEGER,
  frec_cardiaca_bpm INTEGER,
  spo2_pct DECIMAL(4,1),
  temperatura DECIMAL(4,1),
  nivel_estres INTEGER,
  actividad_pasos INTEGER,
  horas_sueno DECIMAL(4,1),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  sospechoso BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_datos_reloj_usuario_fecha
  ON datos_reloj(id_usuario, recorded_at DESC);

-- ============================================
-- 4b. DATO_SALUD_ML (series de tiempo normalizado para ML)
--     Carga paralela a datos_reloj: una fila por métrica no nula.
-- ============================================
CREATE TYPE fuente_dato AS ENUM ('manual', 'dispositivo', 'integracion');

CREATE TABLE dato_salud_ml (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  tipo_metrica VARCHAR(50) NOT NULL,
  valor NUMERIC(12,4) NOT NULL,
  unidad VARCHAR(30) NOT NULL,
  fuente fuente_dato NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dato_salud_ml_usuario_metrica_fecha
  ON dato_salud_ml (id_usuario, tipo_metrica, recorded_at DESC);

CREATE INDEX idx_dato_salud_ml_fecha
  ON dato_salud_ml (recorded_at DESC);

-- ============================================
-- 5. BASELINE_CLINICO
-- ============================================
CREATE TABLE baseline_clinico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  hr_min INTEGER,
  hr_max INTEGER,
  bp_sist_min INTEGER,
  bp_sist_max INTEGER,
  bp_diast_min INTEGER,
  bp_diast_max INTEGER,
  spo2_min DECIMAL(4,1),
  temp_min DECIMAL(4,1),
  temp_max DECIMAL(4,1),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. SINTOMAS (catálogo controlado de síntomas)
--     Precargado con síntomas agrupados por categoría.
-- ============================================
CREATE TABLE sintomas (
  id_sintomas  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       VARCHAR(100) NOT NULL,
  descripcion  VARCHAR(255),
  categoria    cat_sintoma NOT NULL,
  icono        VARCHAR(10),
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6b. SINTOMAS_USUARIO (registro de síntomas del paciente)
--     Vinculado al catálogo + texto libre + intensidad.
-- ============================================
CREATE TABLE sintomas_usuario (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario    UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  id_sintomas   UUID REFERENCES sintomas(id_sintomas),
  descripcion   TEXT,
  categoria     cat_sintoma NOT NULL,
  intensidad    INTEGER CHECK (intensidad BETWEEN 1 AND 5),
  fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
  hora          TIME,
  origen        origen_sintoma NOT NULL DEFAULT 'manual',
  recorded_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sintomas_usuario_fecha
  ON sintomas_usuario(id_usuario, recorded_at DESC);

-- ============================================
-- 7. FACTORES_RIESGO_CARDIACO (formulario opcional ML)
-- ============================================
CREATE TABLE factores_riesgo_cardiaco (
  id_usuario UUID PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
  diabetes BOOLEAN,
  antecedentes_familiares BOOLEAN,
  fumador BOOLEAN,
  obesidad BOOLEAN,
  consumo_alcohol BOOLEAN,
  tipo_dieta VARCHAR(20) CHECK (tipo_dieta IN ('saludable', 'normal', 'no saludable')),
  problemas_cardiacos_previos BOOLEAN,
  uso_medicacion BOOLEAN,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. PROMEDIO_SEMANAL_ML (agregación para features ML)
--     Alimentado desde el pipeline Python
-- ============================================
CREATE TABLE promedio_semanal_ml (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  semana_inicio DATE NOT NULL,
  bp_sistolica_prom DECIMAL(6,2),
  bp_diastolica_prom DECIMAL(6,2),
  frec_cardiaca_prom DECIMAL(6,2),
  spo2_prom DECIMAL(4,1),
  nivel_estres_prom DECIMAL(4,1),
  pasos_diarios_prom INTEGER,
  horas_sueno_prom DECIMAL(4,1),
  total_lecturas INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id_usuario, semana_inicio)
);

CREATE INDEX idx_promedio_semanal_usuario
  ON promedio_semanal_ml(id_usuario, semana_inicio DESC);

-- ============================================
-- 9. PREDICCION_RIESGO (resultados del modelo ML)
-- ============================================
CREATE TABLE prediccion_riesgo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  riesgo VARCHAR(10) NOT NULL CHECK (riesgo IN ('bajo', 'medio', 'alto')),
  score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
  modelo_version VARCHAR(20),
  factores_mas_influyentes JSONB,
  datos_entrada VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prediccion_riesgo_usuario
  ON prediccion_riesgo(id_usuario, created_at DESC);

-- ============================================
-- 10. ALERTA (HU-41 — Sistema de Alertas Inteligentes)
--     Nuevo schema: titulo, mensaje, datos jsonb, leida_en, FKs.
--     Ciclo de vida: leída/no leída (leida_en null = no leída).
-- ============================================
CREATE TABLE alerta (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario uuid NOT NULL REFERENCES public.usuario(id),
    id_dato_reloj uuid REFERENCES public.datos_reloj(id),
    id_prediccion_riesgo uuid REFERENCES public.prediccion_riesgo(id),
    tipo varchar(50) NOT NULL,
    severidad varchar(20) NOT NULL DEFAULT 'INFO',
    titulo varchar(150) NOT NULL,
    mensaje text NOT NULL,
    datos jsonb,
    leida_en timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    expira_en timestamptz
);

CREATE INDEX idx_alerta_usuario_created
  ON alerta(id_usuario, created_at DESC);

CREATE INDEX idx_alerta_usuario_leida
  ON alerta(id_usuario, leida_en)
  WHERE leida_en IS NULL;

CREATE INDEX idx_alerta_tipo
  ON alerta(tipo);

-- ============================================
-- 11. DISPOSITIVO_USUARIO (tokens FCM para push)
-- ============================================
CREATE TABLE dispositivo_usuario (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario uuid NOT NULL REFERENCES public.usuario(id),
    fcm_token text NOT NULL,
    plataforma varchar(20) NOT NULL,
    activo boolean NOT NULL DEFAULT true,
    last_seen_at timestamptz DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(id_usuario, fcm_token)
);

CREATE INDEX idx_dispositivo_usuario_activo
  ON dispositivo_usuario(id_usuario)
  WHERE activo = true;

-- ============================================
-- 12. PREFERENCIA_NOTIFICACION
-- ============================================
CREATE TABLE preferencia_notificacion (
    id_usuario uuid PRIMARY KEY REFERENCES public.usuario(id),
    push_habilitado boolean DEFAULT true,
    alertas_criticas boolean DEFAULT true,
    alertas_info boolean DEFAULT true,
    updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 13. NOTIFICACION_ENTREGA (Fase 2 — registro de entregas push)
-- ============================================
CREATE TABLE notificacion_entrega (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_alerta uuid REFERENCES alerta(id),
    id_dispositivo uuid REFERENCES dispositivo_usuario(id),
    estado varchar(20) NOT NULL,
    enviado_en timestamptz,
    error_mensaje text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notificacion_entrega_alerta
  ON notificacion_entrega(id_alerta);

-- ============================================
-- 14. BASELINE_PERSONALIZADO (HU-98 — baseline personalizado por paciente)
--     Una fila por usuario con stats por métrica (media, desv. estándar,
--     P25, P75). Referida como "§9" en el documento de diseño HU-98.
--     RLS + funciones de cálculo: ver scripts/migrations/2026-08-23_hu98_baseline_personalizado.sql
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
  es_valido BOOLEAN NOT NULL DEFAULT FALSE,

  ultima_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice único sobre id_usuario: lookup + soporte de upsert (ON CONFLICT).
CREATE UNIQUE INDEX idx_baseline_personalizado_usuario
  ON baseline_personalizado(id_usuario);

CREATE INDEX idx_baseline_personalizado_pendientes
  ON baseline_personalizado(ultima_actualizacion);

-- ============================================
-- 15. CONTACTO_CONFIANZA (HU-16/HU-54 — registro de contactos de confianza)
--     Una fila por contacto del usuario (familiar / médico / otro) con
--     la frecuencia de notificación preferida por contacto.
--     HU-54 agrega: tipos_evento (jsonb), canal, estado_opt_in (dato, sin flujo),
--     es_principal (constraint parcial único: un solo principal por usuario).
--     RLS (select/insert/update/delete own + service_role_all): ver
--     scripts/migrations/2026-09-08_hu16_contacto_confianza.sql y
--     scripts/migrations/2026-09-09_hu54_configuracion_notificaciones_contacto.sql
-- ============================================
CREATE TABLE contacto_confianza (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL REFERENCES public.usuario(id) ON DELETE CASCADE,
  nombre varchar(120) NOT NULL,
  relacion varchar(20) NOT NULL CHECK (relacion IN ('familiar', 'medico', 'otro')),
  telefono varchar(30) NOT NULL,
  email varchar(255) NOT NULL,
  frecuencia_notificacion varchar(20) NOT NULL DEFAULT 'inmediata'
    CHECK (frecuencia_notificacion IN ('inmediata', 'diaria', 'semanal', 'sin_notificaciones')),
  tipos_evento jsonb NOT NULL DEFAULT '["fisiologico"]',
  canal varchar(20) NOT NULL DEFAULT 'app_interna'
    CHECK (canal IN ('app_interna', 'whatsapp')),
  estado_opt_in varchar(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado_opt_in IN ('pendiente', 'confirmado', 'rechazado', 'vencido')),
  es_principal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacto_confianza_usuario
  ON contacto_confianza(id_usuario);

CREATE UNIQUE INDEX contacto_confianza_un_principal
  ON contacto_confianza(id_usuario)
  WHERE es_principal = true;

COMMENT ON TABLE public.contacto_confianza IS 'Contactos de confianza del usuario (HU-16/HU-54). RLS: solo el dueño (auth.uid()=id_usuario) puede select/insert/update/delete.';

-- ============================================
-- 16. DATOS_PREDICCION_RIESGO (HU-91 — formulario dedicado para features ML)
--     Una fila por usuario (PK id_usuario). Almacena las features del contrato
--     v2 que Vito NO recolecta de forma nativa (peso/altura/BMI declarado,
--     presión manual, colesterol, diabetes, tabaquismo, alcohol) como fuente
--     de verdad para buildPredictionPayload. Sexo y edad se toman del perfil.
--     La app NUNCA imputa en silencio: PrediccionRiesgoScreen valida antes de
--     llamar a la Edge Function y deriva a DatosPrediccionScreen si faltan campos.
--     RLS incluido inline (patrón hu16): solo el dueño lee/escribe; service_role
--     tiene acceso total para pipelines y Edge Functions futuras.
-- ============================================
CREATE TABLE datos_prediccion_riesgo (
  id_usuario UUID PRIMARY KEY REFERENCES public.usuario(id) ON DELETE CASCADE,
  peso_kg NUMERIC(5,1),
  altura_cm NUMERIC(5,1),
  bp_sistolica INTEGER,
  bp_diastolica INTEGER,
  cholesterol_ord SMALLINT CHECK (cholesterol_ord IN (1, 2, 3)),
  diabetes BOOLEAN,
  smoking BOOLEAN,
  alcohol BOOLEAN,
  active BOOLEAN,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE datos_prediccion_riesgo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "datos_prediccion_riesgo_select_own"
  ON datos_prediccion_riesgo FOR SELECT
  TO authenticated
  USING (auth.uid() = id_usuario);

CREATE POLICY "datos_prediccion_riesgo_insert_own"
  ON datos_prediccion_riesgo FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id_usuario);

CREATE POLICY "datos_prediccion_riesgo_update_own"
  ON datos_prediccion_riesgo FOR UPDATE
  TO authenticated
  USING (auth.uid() = id_usuario)
  WITH CHECK (auth.uid() = id_usuario);

CREATE POLICY "datos_prediccion_riesgo_delete_own"
  ON datos_prediccion_riesgo FOR DELETE
  TO authenticated
  USING (auth.uid() = id_usuario);

CREATE POLICY "datos_prediccion_riesgo_service_role_all"
  ON datos_prediccion_riesgo FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.datos_prediccion_riesgo IS 'Features declaradas para la predicción de riesgo cardiovascular (HU-91). RLS: solo el dueño (auth.uid()=id_usuario) puede select/insert/update/delete.';
