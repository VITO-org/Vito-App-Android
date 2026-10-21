-- ════════════════════════════════════════════════════════════════════
-- HU-25 / SCRUM-79 — Sincronización de datos de salud
-- Migración v1: versionado de origen en datos_reloj + intervalo configurable
--
-- ⚠️ EJECUTAR MANUALMENTE en el SQL Editor de Supabase (el repo no
--    mantiene migraciones versionadas; esto es documentación de deploy).
--    Idempotente: puede correrse varias veces (ADD COLUMN IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════

-- 1) Origen del dato en datos_reloj (CA-02/CA-03 y versionado auditable).
--    DEFAULT 'wearable': las filas históricas se asumen provenientes de
--    Health Connect (única fuente implementada antes de HU-25).
ALTER TABLE public.datos_reloj
  ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'wearable';

-- 2) Auditoría de resolución de conflictos: apunta al registro wearable
--    que ganó y reemplazó a un registro manual (CA-03).
ALTER TABLE public.datos_reloj
  ADD COLUMN IF NOT EXISTS reemplazado_por UUID REFERENCES public.datos_reloj(id) ON DELETE SET NULL;

-- 3) Intervalo de sincronización configurable (CA-01). NULL => default 10 min
--    en la app (src/services/healthSync.ts DEFAULT_SYNC_INTERVAL_MIN).
ALTER TABLE public.perfil_usuario
  ADD COLUMN IF NOT EXISTS intervalo_sync_min INTEGER;

-- 4) Índice para la consulta de ventana temporal de conflictos
--    (getDatosRelojInWindow en healthSync.ts: id_usuario + rango recorded_at).
CREATE INDEX IF NOT EXISTS idx_datos_reloj_usuario_fecha
  ON public.datos_reloj (id_usuario, recorded_at DESC);

-- ─── Comentarios de columna (documentación in-DB) ───
COMMENT ON COLUMN public.datos_reloj.origen IS 'Origen de dato: wearable | manual. En conflicto gana wearable (HU-25 CA-03).';
COMMENT ON COLUMN public.datos_reloj.reemplazado_por IS 'id del registro wearable que ganó el conflicto y reemplazó a este registro manual (HU-25 versionado).';
COMMENT ON COLUMN public.perfil_usuario.intervalo_sync_min IS 'Intervalo de sincronización automática en minutos (HU-25 CA-01). NULL => default 10 min.';
