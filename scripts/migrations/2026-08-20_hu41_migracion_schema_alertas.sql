-- ============================================
-- HU-41: Migración completa a nuevo schema de alertas
-- Fecha: 2026-08-20
-- Descripción: Reemplaza la tabla `alertas` (con enums) por
--              `alerta` (varchar, jsonb, FKs) y crea las tablas
--              de soporte: dispositivo_usuario, preferencia_notificacion,
--              notificacion_entrega.
--
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- ── PASO 1: Eliminar objetos dependientes ──
-- Eliminar la política RLS y la tabla vieja (si existe)
DROP POLICY IF EXISTS "Usuarios ven sus propias alertas" ON alertas;
DROP TABLE IF EXISTS alertas CASCADE;

-- Eliminar enums viejos (si existen)
DROP TYPE IF EXISTS tipo_alerta CASCADE;
DROP TYPE IF EXISTS severidad_alerta CASCADE;
DROP TYPE IF EXISTS estado_alerta CASCADE;

-- ── PASO 2: Crear tabla `alerta` (nuevo schema) ──
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

-- Índices para performance
CREATE INDEX idx_alerta_usuario_created
  ON alerta(id_usuario, created_at DESC);

CREATE INDEX idx_alerta_usuario_leida
  ON alerta(id_usuario, leida_en)
  WHERE leida_en IS NULL;

CREATE INDEX idx_alerta_tipo
  ON alerta(tipo);

-- RLS: los usuarios solo ven sus propias alertas
ALTER TABLE alerta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propias alertas"
  ON alerta FOR ALL
  USING (id_usuario = auth.uid());

-- ── PASO 3: Tabla dispositivo_usuario (push tokens) ──
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

ALTER TABLE dispositivo_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propios dispositivos"
  ON dispositivo_usuario FOR ALL
  USING (id_usuario = auth.uid());

-- ── PASO 4: Tabla preferencia_notificacion ──
CREATE TABLE preferencia_notificacion (
    id_usuario uuid PRIMARY KEY REFERENCES public.usuario(id),
    push_habilitado boolean DEFAULT true,
    alertas_criticas boolean DEFAULT true,
    alertas_info boolean DEFAULT true,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE preferencia_notificacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propias preferencias"
  ON preferencia_notificacion FOR ALL
  USING (id_usuario = auth.uid());

-- ── PASO 5: Tabla notificacion_entrega (Fase 2) ──
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

ALTER TABLE notificacion_entrega ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven entregas de sus alertas"
  ON notificacion_entrega FOR ALL
  USING (
    id_alerta IN (
      SELECT id FROM alerta WHERE id_usuario = auth.uid()
    )
  );
