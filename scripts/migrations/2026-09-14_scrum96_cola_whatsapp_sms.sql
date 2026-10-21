-- ============================================
-- SCRUM-96 HU-52: Cola de notificaciones WhatsApp + fallback SMS/email
-- Fecha: 2026-09-14
-- Descripción:
--   T2/SCRUM-171: tabla notificacion_whatsapp (cola de envío vía
--     Meta Cloud API con 1 número WABA sandbox existente).
--   T4/SCRUM-173: rate-limit máx 3 mensajes/hora por contacto
--     (bypass si severidad crítica — se evalúa en la Edge Function,
--     esta función SQL solo cuenta la ventana).
--   T5: auditoría de consentimiento (estado_opt_in ya existe por HU-54;
--     el webhook de Meta confirma OK/Recibido y actualiza la cola).
--   T3/SCRUM-172: fallback SMS + email se registra en la misma cola
--     con canal='sms'|'email' y estado='fallback_enviada'.
--
-- Ejecutar en: Supabase SQL Editor (staging hasta QA verde)
-- Secrets: solo vía env / supabase secrets, nunca hardcodeados.
-- ============================================

-- 1. Tabla cola (id_alerta, id_contacto, teléfono, plantilla, estado, intentos, respuesta)
CREATE TABLE IF NOT EXISTS notificacion_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_alerta uuid REFERENCES alerta(id) ON DELETE SET NULL,
  id_contacto uuid REFERENCES contacto_confianza(id) ON DELETE SET NULL,
  id_usuario uuid NOT NULL,
  telefono text NOT NULL,
  -- Canal efectivo: 'whatsapp' | 'sms' | 'email' (T3 fallback se loguea acá)
  canal varchar(20) NOT NULL DEFAULT 'whatsapp'
    CHECK (canal IN ('whatsapp', 'sms', 'email')),
  -- Plantilla Meta aprobada (fuera de ventana 24h solo plantillas).
  -- Por tipo de evento: fisiologico | medicacion | estado_animo.
  plantilla text NOT NULL,
  cuerpo text NULL,
  severidad varchar(20) NOT NULL DEFAULT 'advertencia'
    CHECK (severidad IN ('advertencia', 'critica')),
  estado varchar(30) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN (
      'pendiente', 'enviada', 'entregada', 'leida',
      'fallida', 'fallback_enviada', 'confirmada'
    )),
  intentos integer NOT NULL DEFAULT 0,
  respuesta jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Índices para rate-limit y trazabilidad
CREATE INDEX IF NOT EXISTS notificacion_whatsapp_contacto_created_idx
  ON notificacion_whatsapp (id_contacto, created_at DESC);

CREATE INDEX IF NOT EXISTS notificacion_whatsapp_alerta_idx
  ON notificacion_whatsapp (id_alerta);

CREATE INDEX IF NOT EXISTS notificacion_whatsapp_estado_idx
  ON notificacion_whatsapp (estado)
  WHERE estado IN ('pendiente', 'fallida');

-- 3. updated_at automático
CREATE OR REPLACE FUNCTION trg_notificacion_whatsapp_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificacion_whatsapp_updated_at ON notificacion_whatsapp;
CREATE TRIGGER trg_notificacion_whatsapp_updated_at
  BEFORE UPDATE ON notificacion_whatsapp
  FOR EACH ROW EXECUTE FUNCTION trg_notificacion_whatsapp_updated_at();

-- 4. Rate-limit T4/SCRUM-173: cuenta envíos de la última hora por contacto.
--    La Edge Function hace bypass cuando severidad='critica'.
--    Retorna TRUE si puede enviar (< 3 en la ventana), FALSE si excede.
CREATE OR REPLACE FUNCTION fn_whatsapp_rate_ok(p_contacto uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT count(*) < 3
  FROM notificacion_whatsapp
  WHERE id_contacto = p_contacto
    AND created_at > now() - interval '1 hour'
    AND estado NOT IN ('fallida');
$$;

COMMENT ON TABLE public.notificacion_whatsapp IS 'Cola WhatsApp HU-52 (SCRUM-96): 1 número WABA sandbox, plantillas Meta por tipo de evento, fallback SMS+email en la misma cola (canal sms|email), rate-limit 3/hora vía fn_whatsapp_rate_ok, consentimiento por estado_opt_in de contacto_confianza.';
COMMENT ON FUNCTION fn_whatsapp_rate_ok(uuid) IS 'T4/SCRUM-173: TRUE si el contacto tiene <3 envíos no fallidos en la última hora. Bypass crítica lo decide la Edge.';

-- ════════════════════ Verificación manual ════════════════════
-- 1) Tabla creada:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'notificacion_whatsapp' ORDER BY ordinal_position;
--
-- 2) Rate-limit: 3 envíos en la última hora → FALSE, con 2 → TRUE
-- SELECT fn_whatsapp_rate_ok('<ID_CONTACTO>');
--
-- 3) RLS: la Edge usa service_role; no se habilita RLS en staging
--    hasta QA verde (mismo criterio que evaluar-evento / DEC-2026-09-11).
