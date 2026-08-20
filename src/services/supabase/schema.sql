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
