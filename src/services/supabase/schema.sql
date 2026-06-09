-- Schema SQL para Supabase
-- Versión final — HU-92: Diseño de datos orientado a ML
-- Proyecto: VITO Health Connect
-- Copiar y pegar en SQL Editor del panel de Supabase
-- Proyecto: https://supabase.com/dashboard/project/rkgbedehkfpiylaubjbo

-- ============================================
-- TIPOS ENUM
-- ============================================
CREATE TYPE rol_usuario AS ENUM ('paciente', 'familiar', 'medico');
CREATE TYPE sexo_biologico AS ENUM ('M', 'F', 'otro');
CREATE TYPE opt_in_status AS ENUM ('pendiente', 'activo', 'rechazado');
CREATE TYPE canal_notif AS ENUM ('app', 'whatsapp', 'email');

-- ============================================
-- 1. PATOLOGIA
-- ============================================
CREATE TABLE patologia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(20) UNIQUE,
  descripcion TEXT,
  module_key VARCHAR(50)
);

-- ============================================
-- 2. CATALOGO_SINTOMA
-- ============================================
CREATE TABLE catalogo_sintoma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  categoria VARCHAR(50),
  id_patologia UUID REFERENCES patologia(id)
);

-- ============================================
-- 3. USUARIO (tabla pública vinculada a auth.users)
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
-- 4. PATOLOGIA_PACIENTE
-- ============================================
CREATE TABLE patologia_paciente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  id_patologia UUID NOT NULL REFERENCES patologia(id),
  fecha_diagnosticado DATE,
  notas TEXT
);

-- ============================================
-- 5. PERFIL_USUARIO (con peso_kg y altura_cn para ML)
-- ============================================
CREATE TABLE perfil_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
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
  altura_cm DECIMAL(5,2)
);

-- ============================================
-- 6. CONTACTO_CONFIANZA
-- ============================================
CREATE TABLE contacto_confianza (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  nombre VARCHAR(150) NOT NULL,
  rol VARCHAR(50),
  telefono VARCHAR(30),
  email VARCHAR(255),
  es_primario BOOLEAN DEFAULT FALSE,
  opt_in_status opt_in_status DEFAULT 'pendiente',
  opt_in_expires_at TIMESTAMPTZ,
  not_psicologica BOOLEAN DEFAULT FALSE,
  not_mood BOOLEAN DEFAULT FALSE,
  not_canal canal_notif DEFAULT 'app'
);

-- ============================================
-- 7. PASSWORD_RESET_TOKENS
-- ============================================
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

-- ============================================
-- 8. DATOS_RELOJ (cada 30 seg desde el smartwatch)
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
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_datos_reloj_usuario_fecha
  ON datos_reloj(id_usuario, recorded_at DESC);

-- ============================================
-- 9. BASELINE_CLINICO
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
-- 10. SINTOMA_RECORDS
-- ============================================
CREATE TABLE sintoma_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  id_sintoma UUID NOT NULL REFERENCES catalogo_sintoma(id),
  intensidad INTEGER CHECK (intensidad BETWEEN 1 AND 10),
  descripcion TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. FACTORES_RIESGO_CARDIACO (formulario opcional ML)
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
-- 12. PROMEDIO_SEMANAL_ML (agregación para features ML)
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
-- 13. PREDICCION_RIESGO (resultados del modelo ML)
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
