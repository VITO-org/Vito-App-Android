-- ============================================
-- HU-54: Configuración granular de notificaciones por contacto
-- Fecha: 2026-09-09
-- Descripción: Extiende contacto_confianza con 4 columnas nuevas:
--              tipos_evento (jsonb), canal (varchar), estado_opt_in (varchar),
--              es_principal (boolean) + constraint UNIQUE parcial es_principal.
--
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- 1. Columnas nuevas
ALTER TABLE contacto_confianza
  ADD COLUMN tipos_evento jsonb NOT NULL DEFAULT '["fisiologico"]';

ALTER TABLE contacto_confianza
  ADD COLUMN canal varchar(20) NOT NULL DEFAULT 'app_interna'
  CHECK (canal IN ('app_interna', 'whatsapp'));

ALTER TABLE contacto_confianza
  ADD COLUMN estado_opt_in varchar(20) NOT NULL DEFAULT 'pendiente'
  CHECK (estado_opt_in IN ('pendiente', 'confirmado', 'rechazado', 'vencido'));

ALTER TABLE contacto_confianza
  ADD COLUMN es_principal boolean NOT NULL DEFAULT false;

-- 2. Constraint parcial UNIQUE: un solo contacto principal por usuario
CREATE UNIQUE INDEX contacto_confianza_un_principal
  ON contacto_confianza(id_usuario)
  WHERE es_principal = true;

-- 3. Comentario de tabla actualizado
COMMENT ON TABLE public.contacto_confianza IS 'Contactos de confianza del usuario (HU-16/HU-54). Columnas: id, id_usuario, nombre, relacion, telefono, email, frecuencia_notificacion, tipos_evento (jsonb), canal (app_interna|whatsapp), estado_opt_in (pendiente|confirmado|rechazado|vencido), es_principal. RLS: solo el dueño (auth.uid()=id_usuario) puede select/insert/update/delete.';

-- ════════════════════ Verificación manual ════════════════════
-- Ejecutar en el SQL Editor de Supabase.

-- 0) Confirmar que las 5 policies originales siguen existiendo
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename = 'contacto_confianza' ORDER BY policyname;

-- 1) Test de unicidad de es_principal: el segundo INSERT con es_principal=true para el mismo usuario debe fallar (error 23505)
-- INSERT INTO contacto_confianza (id_usuario, nombre, relacion, telefono, email, frecuencia_notificacion, es_principal)
-- VALUES ('<UID_A>', 'Contacto 1', 'familiar', '+5491100001111', 'c1@example.com', 'inmediata', true);
--
-- INSERT INTO contacto_confianza (id_usuario, nombre, relacion, telefono, email, frecuencia_notificacion, es_principal)
-- VALUES ('<UID_A>', 'Contacto 2', 'medico', '+5491100002222', 'c2@example.com', 'inmediata', true);
-- -- Esperado: ERROR 23505 (duplicate key value violates unique constraint "contacto_confianza_un_principal")
