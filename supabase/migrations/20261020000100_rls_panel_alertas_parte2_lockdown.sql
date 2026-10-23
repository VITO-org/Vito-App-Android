-- ============================================
-- RLS parte 2 (lockdown) — policies finas por auth.uid()
-- ============================================
-- Fecha: 2026-10-20
-- Sesión: 2026-10-19_endurecer-el-dashboard-de-alertas-publicado-y-recuperar-su-capacidad-de-qa-rama-test
-- Idempotente: seguro re-ejecutar (SQL Editor o `supabase db push`).
--
-- ⚠️ PRECONDICIÓN OBLIGATORIA (leer antes de aplicar)
-- ====================================================
-- Esta migración CIERRA el acceso anónimo a datos de pacientes. Es
-- posible sólo si la app móvil manda su access token de sesión en TODAS
-- sus operaciones. Hoy NO lo hace: estos call sites de la app usan el
-- cliente anónimo (no hay accessToken):
--
--   src/services/supabase/api.ts → insertDatosReloj (POST datos_reloj)
--   src/services/supabase/api.ts → getDatosReloj    (SELECT datos_reloj)
--   src/services/supabase/api.ts → markDatosRelojReemplazado (PATCH)
--   src/services/supabase/api.ts → getAlertas / getAlertasActivas (SELECT alerta)
--   src/services/supabase/api.ts → insertAlerta (POST alerta)
--   src/context/HealthProvider.tsx → AlertEngine.insertAlert
--   src/context/NotificationsProvider.tsx → registerDispositivo
--   src/context/NotificationsProvider.tsx → getPreferenciaNotificacion
--   src/context/NotificationsProvider.tsx → upsertPreferenciaNotificacion
--
-- Por eso el RLS de `datos_reloj` está DESHABILITADO hoy: sin policy de
-- INSERT con WITH CHECK, la app no podía registrar sus propios datos
-- (ver DEC-2026-09-11).
--
-- CHECKLIST ANTES DE APLICAR (en este orden):
--   [ ] 1. El fix de autenticación de la app está mergeado y desplegado
--         (HealthProvider + NotificationsProvider pasan session.access_token
--         a las funciones de api.ts que ya lo soportan).
--   [ ] 2. La app sigue funcionando: login, sync de Health Connect,
--         generación de alerta local, push y edición de quiet-hours.
--   [ ] 3. La Edge Function `panel-acceso` está deployada y el panel
--         (vito-alert-dashboard) ya usa el gate: el panel NO necesita
--         ninguna policy anon.
--   [ ] 4. La publishable key vieja está rotada.
--
-- Si el checklist no está completo, NO apliques esto: usá la parte 1
-- (`20261020000000_rls_panel_alertas_parte1_segura.sql`) que sí es segura.
--
-- MODELO RESULTANTE
-- -----------------
--   authenticated → sólo sus propias filas (id_usuario = auth.uid())
--   anon          → sin acceso a datos de pacientes
--   service_role  → la Edge Function `panel-acceso` (allowlist en el server)
--
-- `usuario.id` es el id de auth.users (api.ts signUp: id: authData.user.id),
-- así que auth.uid() es el predicado de propiedad correcto en todas las
-- tablas que cuelgan de usuario.
-- ============================================

-- ============================================
-- 1. datos_reloj — historial de signos vitales
-- ============================================
ALTER TABLE datos_reloj ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_datos_reloj" ON datos_reloj;
DROP POLICY IF EXISTS "datos_reloj_insert_own" ON datos_reloj;
DROP POLICY IF EXISTS "datos_reloj_select_own" ON datos_reloj;
DROP POLICY IF EXISTS "datos_reloj_update_own" ON datos_reloj;

CREATE POLICY "datos_reloj_insert_own"
  ON datos_reloj
  FOR INSERT
  TO authenticated
  WITH CHECK (id_usuario = auth.uid());

CREATE POLICY "datos_reloj_select_own"
  ON datos_reloj
  FOR SELECT
  TO authenticated
  USING (id_usuario = auth.uid());

-- El PATCH de conflicto (reemplazado_por) es sobre filas propias.
CREATE POLICY "datos_reloj_update_own"
  ON datos_reloj
  FOR UPDATE
  TO authenticated
  USING (id_usuario = auth.uid())
  WITH CHECK (id_usuario = auth.uid());

-- ============================================
-- 2. alerta — alertas clínicas (y las que genera el panel vía la edge)
-- ============================================
ALTER TABLE alerta ENABLE ROW LEVEL SECURITY;

-- La policy que decía "Usuarios ven sus propias alertas" se reemplaza por
-- las explícitas de abajo: no se sabe su definición exacta en la base y
-- puede ser más amplia que auth.uid().
DROP POLICY IF EXISTS "Usuarios ven sus propias alertas" ON alerta;
DROP POLICY IF EXISTS "anon_select_alertas" ON alerta;
DROP POLICY IF EXISTS "alerta_select_own" ON alerta;
DROP POLICY IF EXISTS "alerta_insert_own" ON alerta;
DROP POLICY IF EXISTS "alerta_update_own" ON alerta;

CREATE POLICY "alerta_select_own"
  ON alerta
  FOR SELECT
  TO authenticated
  USING (id_usuario = auth.uid());

CREATE POLICY "alerta_insert_own"
  ON alerta
  FOR INSERT
  TO authenticated
  WITH CHECK (id_usuario = auth.uid());

CREATE POLICY "alerta_update_own"
  ON alerta
  FOR UPDATE
  TO authenticated
  USING (id_usuario = auth.uid())
  WITH CHECK (id_usuario = auth.uid());

-- ============================================
-- 3. dispositivo_usuario — tokens FCM (push)
-- ============================================
-- Tenía el RLS deshabilitado (DEC-2026-09-11) y por eso la app registraba
-- su token con la anon key: cualquiera podía registrar un FCM token ajeno y
-- desviar los push de otro usuario.
ALTER TABLE dispositivo_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dispositivo_usuario_select_own" ON dispositivo_usuario;
DROP POLICY IF EXISTS "dispositivo_usuario_insert_own" ON dispositivo_usuario;
DROP POLICY IF EXISTS "dispositivo_usuario_update_own" ON dispositivo_usuario;

CREATE POLICY "dispositivo_usuario_select_own"
  ON dispositivo_usuario
  FOR SELECT
  TO authenticated
  USING (id_usuario = auth.uid());

CREATE POLICY "dispositivo_usuario_insert_own"
  ON dispositivo_usuario
  FOR INSERT
  TO authenticated
  WITH CHECK (id_usuario = auth.uid());

CREATE POLICY "dispositivo_usuario_update_own"
  ON dispositivo_usuario
  FOR UPDATE
  TO authenticated
  USING (id_usuario = auth.uid())
  WITH CHECK (id_usuario = auth.uid());

-- ============================================
-- 4. preferencia_notificacion — preferencias y horario silencioso
-- ============================================
ALTER TABLE preferencia_notificacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_preferencia_notificacion" ON preferencia_notificacion;
DROP POLICY IF EXISTS "anon_upsert_preferencia_notificacion" ON preferencia_notificacion;
DROP POLICY IF EXISTS "anon_update_preferencia_notificacion" ON preferencia_notificacion;
DROP POLICY IF EXISTS "preferencia_notificacion_select_own" ON preferencia_notificacion;
DROP POLICY IF EXISTS "preferencia_notificacion_upsert_own" ON preferencia_notificacion;
DROP POLICY IF EXISTS "preferencia_notificacion_update_own" ON preferencia_notificacion;

CREATE POLICY "preferencia_notificacion_select_own"
  ON preferencia_notificacion
  FOR SELECT
  TO authenticated
  USING (id_usuario = auth.uid());

CREATE POLICY "preferencia_notificacion_upsert_own"
  ON preferencia_notificacion
  FOR INSERT
  TO authenticated
  WITH CHECK (id_usuario = auth.uid());

CREATE POLICY "preferencia_notificacion_update_own"
  ON preferencia_notificacion
  FOR UPDATE
  TO authenticated
  USING (id_usuario = auth.uid())
  WITH CHECK (id_usuario = auth.uid());

-- ============================================
-- 5. notificacion_entrega — delivery log
-- ============================================
ALTER TABLE notificacion_entrega ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_notificacion_entrega" ON notificacion_entrega;
DROP POLICY IF EXISTS "notificacion_entrega_select_own" ON notificacion_entrega;
DROP POLICY IF EXISTS "notificacion_entrega_update_own" ON notificacion_entrega;

CREATE POLICY "notificacion_entrega_select_own"
  ON notificacion_entrega
  FOR SELECT
  TO authenticated
  USING (id_usuario = auth.uid());

CREATE POLICY "notificacion_entrega_update_own"
  ON notificacion_entrega
  FOR UPDATE
  TO authenticated
  USING (id_usuario = auth.uid())
  WITH CHECK (id_usuario = auth.uid());

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Esperado: 0 policies con roles = {anon} en ninguna de las 5 tablas.
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE tablename IN ('datos_reloj','alerta','perfil_usuario','dispositivo_usuario','preferencia_notificacion','notificacion_entrega')
-- ORDER BY tablename, policyname;
--
-- Esperado: rowsecurity = true en las 5.
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE tablename IN ('datos_reloj','alerta','perfil_usuario','dispositivo_usuario','preferencia_notificacion','notificacion_entrega');
--
-- Prueba de que anon ya NO lee datos de pacientes (todas deberían dar [] o 401/403):
--   for t in datos_reloj alerta perfil_usuario notificacion_entrega preferencia_notificacion; do
--     echo "== $t"; curl -s "$SUPABASE_URL/rest/v1/$t?select=*&limit=1" \
--       -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"; echo;
--   done
--
-- Prueba de que anon ya NO inserta (esperado: 401/403 o error de policy):
--   curl -s -X POST "$SUPABASE_URL/rest/v1/datos_reloj" \
--     -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
--     -H "Content-Type: application/json" \
--     -d '{"id_usuario":"d11f3190-6d35-4b6e-b9c9-f75f55716b8b","spo2_pct":82,"origen":"dashboard_manual"}'
--
-- Prueba de que el panel sigue funcionando: generar una alerta de prueba
-- desde el panel (ahora vía la Edge Function `panel-acceso` con service_role).
--
-- Prueba de que la app sigue funcionando: login + sync + push + quiet-hours.
--
-- ============================================
-- ROLLBACK (vuelve al estado previo, con acceso anónimo)
-- ============================================
-- ALTER TABLE datos_reloj DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE dispositivo_usuario DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "anon_select_alertas" ON alerta;
-- CREATE POLICY "anon_select_alertas" ON alerta FOR SELECT TO anon USING (true);
-- DROP POLICY IF EXISTS "anon_select_notificacion_entrega" ON notificacion_entrega;
-- CREATE POLICY "anon_select_notificacion_entrega" ON notificacion_entrega FOR SELECT TO anon USING (true);
-- DROP POLICY IF EXISTS "anon_select_preferencia_notificacion" ON preferencia_notificacion;
-- CREATE POLICY "anon_select_preferencia_notificacion" ON preferencia_notificacion FOR SELECT TO anon USING (true);
-- DROP POLICY IF EXISTS "anon_upsert_preferencia_notificacion" ON preferencia_notificacion;
-- CREATE POLICY "anon_upsert_preferencia_notificacion" ON preferencia_notificacion FOR INSERT TO anon WITH CHECK (true);
-- DROP POLICY IF EXISTS "anon_update_preferencia_notificacion" ON preferencia_notificacion;
-- CREATE POLICY "anon_update_preferencia_notificacion" ON preferencia_notificacion FOR UPDATE TO anon USING (true) WITH CHECK (true);
