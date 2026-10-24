-- ============================================
-- RLS parte 3 (cierre total) — policies anon que faltaban
-- ============================================
-- Fecha: 2026-10-23
-- Precondición: parte 2 aplicada y app con access token liberada/verificada.
-- Idempotente: seguro re-ejecutar en el SQL Editor.
--
-- La parte 2 cerró las 5 tablas críticas, pero quedaron dos policies anon
-- que permitían:
--   1) INSERT anónimo de alertas clínicas (alertas falsas).
--   2) SELECT anónimo de sugerencias con id_usuario e información clínica.
--
-- Esta migración elimina esas dos policies y, como defensa en profundidad,
-- revoca los privilegios directos de `anon` sobre las 6 tablas para que
-- tampoco aparezcan en el esquema GraphQL público. El rol `authenticated`
-- conserva sus grants y policies own-row.
-- ============================================

-- 1. alerta — el panel crea alertas vía Edge Function con service_role;
--    la app autenticada usa alerta_insert_own.
DROP POLICY IF EXISTS "Dashboard puede crear alertas" ON alerta;

-- 2. suggestion — cada usuario ve sólo sus propias sugerencias.
DROP POLICY IF EXISTS "anon_select_suggestions" ON suggestion;

-- 3. Defensa en profundidad: que `anon` no tenga grants directos sobre
--    datos de pacientes. Las policies own-row de `authenticated` siguen
--    funcionando porque PostgREST cambia el rol al validar el JWT.
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON alerta, datos_reloj, dispositivo_usuario, notificacion_entrega,
     preferencia_notificacion, suggestion
  FROM anon;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- No debe quedar ninguna policy con roles = {anon} en estas tablas:
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('alerta','datos_reloj','dispositivo_usuario',
--                     'notificacion_entrega','preferencia_notificacion','suggestion')
-- ORDER BY tablename, policyname;
--
-- Con la publishable key pública, todas estas consultas deben devolver
-- [] o 401/403:
--   /rest/v1/alerta?select=*&limit=1
--   /rest/v1/datos_reloj?select=*&limit=1
--   /rest/v1/dispositivo_usuario?select=*&limit=1
--   /rest/v1/notificacion_entrega?select=*&limit=1
--   /rest/v1/preferencia_notificacion?select=*&limit=1
--   /rest/v1/suggestion?select=*&limit=1
--
-- La app autenticada debe seguir viendo su historial, sync, alertas,
-- push y quiet-hours.
-- ============================================
