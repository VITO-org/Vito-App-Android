-- ════════════════════════════════════════════════════════════════════
-- HU-51 / SCRUM-95 — Notificaciones push: quiet hours + delivery log
-- Migración v1: horario silencioso en preferencias y registro de entregas
--
-- ⚠️ EJECUTAR MANUALMENTE en el SQL Editor de Supabase (el repo no
--    mantiene migraciones versionadas; esto es documentación de deploy).
--    Base: vito-db-staging (verificar el selector de base antes de Run).
--    Idempotente: puede correrse varias veces (ADD COLUMN IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════

-- 1) CA-05: horario silencioso en preferencia_notificacion.
--    DEFAULT 23:00–07:00: coincide con el default del NotificationsProvider.
--    Las alertas críticas bypasean este filtro en app (no se filtra en DB).
ALTER TABLE public.preferencia_notificacion
  ADD COLUMN IF NOT EXISTS horario_silencioso_inicio time DEFAULT '23:00:00',
  ADD COLUMN IF NOT EXISTS horario_silencioso_fin time DEFAULT '07:00:00';

-- 2) CA-06: delivery log completo en notificacion_entrega.
--    Estados: 'enviada' (al programar) → 'recibida' (foreground) → 'leida' (tap).
ALTER TABLE public.notificacion_entrega
  ADD COLUMN IF NOT EXISTS id_usuario uuid REFERENCES public.usuario(id),
  ADD COLUMN IF NOT EXISTS recibida_en timestamptz,
  ADD COLUMN IF NOT EXISTS leida_en timestamptz;

ALTER TABLE public.notificacion_entrega
  ALTER COLUMN estado SET DEFAULT 'enviada';

CREATE INDEX IF NOT EXISTS idx_notificacion_entrega_usuario
  ON public.notificacion_entrega(id_usuario);

-- 3) Verificación: debe devolver 5 filas (2 en preferencias + 3 en entregas).
-- SELECT table_name, column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name IN ('preferencia_notificacion', 'notificacion_entrega')
--   AND column_name IN ('horario_silencioso_inicio','horario_silencioso_fin','id_usuario','recibida_en','leida_en')
-- ORDER BY table_name, column_name;
