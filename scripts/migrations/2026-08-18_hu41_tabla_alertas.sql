-- ============================================
-- HU-41: Tabla de Alertas (Sistema de Alertas Inteligentes)
-- Fecha: 2026-08-18
-- Descripción: Crea la tabla `alertas` y sus tipos necesarios
--              para el motor de detección de hipoxia.
--
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- Tipos enum
CREATE TYPE tipo_alerta AS ENUM ('hipoxia');
CREATE TYPE severidad_alerta AS ENUM ('advertencia', 'critica');
CREATE TYPE estado_alerta AS ENUM ('activa', 'confirmada', 'escalada', 'resuelta');

-- Tabla alertas
CREATE TABLE alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  tipo tipo_alerta NOT NULL,
  severidad severidad_alerta NOT NULL,
  estado estado_alerta NOT NULL DEFAULT 'activa',
  valor_registrado DECIMAL(4,1) NOT NULL,
  umbral_configurado DECIMAL(4,1) NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  dispositivo_origen VARCHAR(100),
  confirmed_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  escalated_to VARCHAR(255),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_alertas_usuario_estado
  ON alertas(id_usuario, estado);

CREATE INDEX idx_alertas_usuario_fecha
  ON alertas(id_usuario, generated_at DESC);

-- RLS: los usuarios solo ven sus propias alertas
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propias alertas"
  ON alertas FOR ALL
  USING (id_usuario = auth.uid());
