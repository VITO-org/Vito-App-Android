-- Schema SQL para Supabase
-- Copiar y pegar en SQL Editor del panel de Supabase
-- Proyecto: https://supabase.com/dashboard/project/rkgbedehkfpiylaubjbo

-- TIPOS ENUM
CREATE TYPE rol_usuario AS ENUM ('paciente', 'familiar', 'medico');
CREATE TYPE sexo_biologico AS ENUM ('M', 'F', 'otro');
CREATE TYPE opt_in_status AS ENUM ('pendiente', 'activo', 'rechazado');
CREATE TYPE canal_notif AS ENUM ('app', 'whatsapp', 'email');
CREATE TYPE fuente_dato AS ENUM ('manual', 'wearable', 'api');
CREATE TYPE tipo_metrica AS ENUM (
  'FREC_CARDIACA', 'BP_SISTOLICA', 'BP_DIASTOLICA',
  'SPO2', 'TEMPERATURA'
);

-- 1. PATOLOGIA
CREATE TABLE patologia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(20) UNIQUE,
  descripcion TEXT,
  module_key VARCHAR(50)
);

-- 2. CATALOGO_SINTOMA
CREATE TABLE catalogo_sintoma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  categoria VARCHAR(50),
  id_patologia UUID REFERENCES patologia(id)
);

-- 3. USUARIO (tabla pública vinculada a auth.users)
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

-- 4. PATOLOGIA_PACIENTE
CREATE TABLE patologia_paciente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  id_patologia UUID NOT NULL REFERENCES patologia(id),
  fecha_diagnosticado DATE,
  notas TEXT
);

-- 5. PERFIL_USUARIO
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
  avatar_url TEXT
);

-- 6. CONTACTO_CONFIANZA
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

-- 7. PASSWORD_RESET_TOKENS
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

-- 8. DATOS_CLINICOS_CONFIG
CREATE TABLE datos_clinicos_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
  peso_kg DECIMAL(5,2),
  altura_cm DECIMAL(5,2),
  bp_sistolica INTEGER,
  bp_diastolica INTEGER,
  frec_cardiaca_bpm INTEGER,
  spo2_pct DECIMAL(4,1),
  temperatura DECIMAL(4,1),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BASELINE_CLINICO
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

-- 10. SIGNO_VITAL
CREATE TABLE signo_vital (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  tipo_metrica tipo_metrica NOT NULL,
  valor DECIMAL(8,2) NOT NULL,
  unidad VARCHAR(20),
  fuente fuente_dato DEFAULT 'manual',
  id_dispositivo VARCHAR(100),
  is_outlier BOOLEAN DEFAULT FALSE,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signo_vital_usuario_fecha
  ON signo_vital(id_usuario, recorded_at DESC);

-- 11. SINTOMA_RECORDS
CREATE TABLE sintoma_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  id_sintoma UUID NOT NULL REFERENCES catalogo_sintoma(id),
  intensidad INTEGER CHECK (intensidad BETWEEN 1 AND 10),
  descripcion TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. DATOS_RELOJ (lecturas automáticas desde wearable / smartwatch)
CREATE TABLE datos_reloj (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  bp_sistolica INTEGER,
  bp_diastolica INTEGER,
  frec_cardiaca_bpm INTEGER,
  spo2_pct NUMERIC(4,1),
  temperatura NUMERIC(4,1),
  nivel_estres INTEGER,
  actividad_pasos INTEGER,
  horas_sueno NUMERIC(4,1),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_datos_reloj_usuario_fecha
  ON datos_reloj(id_usuario, recorded_at DESC);
