-- ============================================
-- RLS parte 1 (segura) — policies own-row + cierre del filtro de PII
-- ============================================
-- Fecha: 2026-10-20
-- Sesión: 2026-10-19_endurecer-el-dashboard-de-alertas-publicado-y-recuperar-su-capacidad-de-qa-rama-test
-- Idempotente: seguro re-ejecutar (SQL Editor o `supabase db push`).
--
-- ESTADO VERIFICADO (2026-10-20, con la publishable key pública del
-- bundle en GitHub Pages, sobre el proyecto rkgbedehkfpiylaubjbo):
--
--   GET /rest/v1/datos_reloj?select=*            -> 200, filas
--   GET /rest/v1/alerta?select=*                  -> 200, filas
--   GET /rest/v1/perfil_usuario?select=*          -> 200, filas
--   GET /rest/v1/notificacion_entrega?select=*    -> 200, filas
--   GET /rest/v1/preferencia_notificacion?select=*-> 200, filas
--   GET /rest/v1/dispositivo_usuario?select=*     -> 200, filas
--
-- O sea: con la clave que va hardcodeada en el bundle público del panel,
-- CUALQUIER VISITANTE puede leer el historial de signos vitales, las
-- alertas clínicas, los perfiles (nombre, apellido, dni, dirección,
-- teléfono) y los tokens FCM de los usuarios. Eso no puede seguir así.
--
-- QUÉ HACE ESTA MIGRACIÓN
-- -----------------------
-- 1) Crea las policies finas por `auth.uid()` (el usuario autenticado sólo
--    ve sus propias filas). Son ADITIVAS: no le quitan nada a nadie.
-- 2) Cierra el único filtro que no lo necesita nadie: la lectura anónima
--    de `perfil_usuario` (PII).
--
-- POR QUÉ ES SEGURA (no rompe la app)
-- -----------------------------------
-- - Las policies nuevas son aditivas: mientras la app siga usando la anon
--   key, no cambia nada.
-- - `perfil_usuario` sí se cierra porque la app lee su perfil con el
--   access token de sesión:
--     src/context/SupabaseProvider.tsx → loadProfile(userId, session.access_token)
--     → api.getProfile(userId, accessToken) → REST con `Authorization: Bearer <token>`
--   El camino anónimo de api.getPerfilUsuario (sin token) NO tiene call
--   sites en src/: es código muerto.
-- - El panel de alertas tampoco la necesita: lee los perfiles por la Edge
--   Function `panel-acceso` (service_role, allowlist en el servidor).
-- - En `datos_reloj` y `dispositivo_usuario` el RLS está DESHABILITADO, así
--   que las policies que se crean acá quedan inertes hasta que la parte 2
--   los habilite. Es deliberado: así la parte 2 es un diff chico y audited.
--
-- `usuario.id` es el id de auth.users (api.ts signUp: id: authData.user.id),
-- por lo que auth.uid() es el predicado de propiedad correcto.
-- ============================================

-- ============================================
-- 1. perfil_usuario — cerrar el filtro de PII
-- ============================================
DROP POLICY IF EXISTS "anon_select_perfil_usuario" ON perfil_usuario;

DROP POLICY IF EXISTS "perfil_usuario_select_own" ON perfil_usuario;
CREATE POLICY "perfil_usuario_select_own"
  ON perfil_usuario
  FOR SELECT
  TO authenticated
  USING (id_usuario = auth.uid());

DROP POLICY IF EXISTS "perfil_usuario_upsert_own" ON perfil_usuario;
CREATE POLICY "perfil_usuario_upsert_own"
  ON perfil_usuario
  FOR INSERT
  TO authenticated
  WITH CHECK (id_usuario = auth.uid());

DROP POLICY IF EXISTS "perfil_usuario_update_own" ON perfil_usuario;
CREATE POLICY "perfil_usuario_update_own"
  ON perfil_usuario
  FOR UPDATE
  TO authenticated
  USING (id_usuario = auth.uid())
  WITH CHECK (id_usuario = auth.uid());

-- ============================================
-- 2. alerta — el usuario autenticado ve y escribe sólo sus alertas
-- ============================================
-- Nota: la policy anon "anon_select_alertas" (USING true) se deja para la
-- parte 2: la app todavía lee alertas con la anon key y cerrarla ahora la
-- dejaría sin historial.
DROP POLICY IF EXISTS "alerta_select_own" ON alerta;
CREATE POLICY "alerta_select_own"
  ON alerta
  FOR SELECT
  TO authenticated
  USING (id_usuario = auth.uid());

DROP POLICY IF EXISTS "alerta_insert_own" ON alerta;
CREATE POLICY "alerta_insert_own"
  ON alerta
  FOR INSERT
  TO authenticated
  WITH CHECK (id_usuario = auth.uid());

DROP POLICY IF EXISTS "alerta_update_own" ON alerta;
CREATE POLICY "alerta_update_own"
  ON alerta
  FOR UPDATE
  TO authenticated
  USING (id_usuario = auth.uid())
  WITH CHECK (id_usuario = auth.uid());

-- ============================================
-- 3. preferencia_notificacion — preferencias y horario silencioso
-- ============================================
DROP POLICY IF EXISTS "preferencia_notificacion_select_own" ON preferencia_notificacion;
CREATE POLICY "preferencia_notificacion_select_own"
  ON preferencia_notificacion
  FOR SELECT
  TO authenticated
  USING (id_usuario = auth.uid());

DROP POLICY IF EXISTS "preferencia_notificacion_upsert_own" ON preferencia_notificacion;
CREATE POLICY "preferencia_notificacion_upsert_own"
  ON preferencia_notificacion
  FOR INSERT
  TO authenticated
  WITH CHECK (id_usuario = auth.uid());

DROP POLICY IF EXISTS "preferencia_notificacion_update_own" ON preferencia_notificacion;
CREATE POLICY "preferencia_notificacion_update_own"
  ON preferencia_notificacion
  FOR UPDATE
  TO authenticated
  USING (id_usuario = auth.uid())
  WITH CHECK (id_usuario = auth.uid());

-- ============================================
-- 4. notificacion_entrega — delivery log
-- ============================================
DROP POLICY IF EXISTS "notificacion_entrega_select_own" ON notificacion_entrega;
CREATE POLICY "notificacion_entrega_select_own"
  ON notificacion_entrega
  FOR SELECT
  TO authenticated
  USING (id_usuario = auth.uid());

DROP POLICY IF EXISTS "notificacion_entrega_update_own" ON notificacion_entrega;
CREATE POLICY "notificacion_entrega_update_own"
  ON notificacion_entrega
  FOR UPDATE
  TO authenticated
  USING (id_usuario = auth.uid())
  WITH CHECK (id_usuario = auth.uid());

-- ============================================
-- 5. datos_reloj — policies inertes (el RLS sigue deshabilitado)
-- ============================================
-- Se crean ahora para que la parte 2 sea un diff chico y audited.
-- Mientras el RLS esté deshabilitado son inertes (Postgres ignora las
-- policies cuando RLS está off).
DROP POLICY IF EXISTS "datos_reloj_insert_own" ON datos_reloj;
CREATE POLICY "datos_reloj_insert_own"
  ON datos_reloj
  FOR INSERT
  TO authenticated
  WITH CHECK (id_usuario = auth.uid());

DROP POLICY IF EXISTS "datos_reloj_select_own" ON datos_reloj;
CREATE POLICY "datos_reloj_select_own"
  ON datos_reloj
  FOR SELECT
  TO authenticated
  USING (id_usuario = auth.uid());

DROP POLICY IF EXISTS "datos_reloj_update_own" ON datos_reloj;
CREATE POLICY "datos_reloj_update_own"
  ON datos_reloj
  FOR UPDATE
  TO authenticated
  USING (id_usuario = auth.uid())
  WITH CHECK (id_usuario = auth.uid());

-- ============================================
-- 6. dispositivo_usuario — policies inertes (el RLS sigue deshabilitado)
-- ============================================
DROP POLICY IF EXISTS "dispositivo_usuario_select_own" ON dispositivo_usuario;
CREATE POLICY "dispositivo_usuario_select_own"
  ON dispositivo_usuario
  FOR SELECT
  TO authenticated
  USING (id_usuario = auth.uid());

DROP POLICY IF EXISTS "dispositivo_usuario_insert_own" ON dispositivo_usuario;
CREATE POLICY "dispositivo_usuario_insert_own"
  ON dispositivo_usuario
  FOR INSERT
  TO authenticated
  WITH CHECK (id_usuario = auth.uid());

DROP POLICY IF EXISTS "dispositivo_usuario_update_own" ON dispositivo_usuario;
CREATE POLICY "dispositivo_usuario_update_own"
  ON dispositivo_usuario
  FOR UPDATE
  TO authenticated
  USING (id_usuario = auth.uid())
  WITH CHECK (id_usuario = auth.uid());

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- 1) PII de perfil_usuario: ya NO es legible anónimamente.
-- SELECT tablename, policyname, cmd, roles FROM pg_policies
-- WHERE tablename = 'perfil_usuario' ORDER BY policyname;
-- Esperado: sólo *_own con roles = {authenticated}. Ninguna con {anon}.
--
-- 2) Las 6 tablas con policies own-row:
-- SELECT tablename, count(*) FILTER (WHERE 'authenticated' = ANY(roles)) AS propias,
--        count(*) FILTER (WHERE 'anon' = ANY(roles)) AS anon
-- FROM pg_policies
-- WHERE tablename IN ('datos_reloj','alerta','perfil_usuario','dispositivo_usuario','preferencia_notificacion','notificacion_entrega')
-- GROUP BY tablename ORDER BY tablename;
--
-- 3) Prueba de que anon ya NO lee el perfil (esperado: [] o 401/403):
-- curl -s "$SUPABASE_URL/rest/v1/perfil_usuario?select=id_usuario,nombre,dni&limit=1" \
--   -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
--
-- 4) Prueba de que la app sigue leyendo su perfil:
--    login en la app con un usuario de prueba → la pantalla de perfil carga.
--
-- 5) OJO: con esta migración el resto de las tablas SIGUEN legibles con la
--    anon key (ver cabecera). Eso se cierra en la parte 2, que requiere el
--    fix de autenticación de la app.
--
-- ============================================
-- ROLLBACK (revertir a lectura anónima de perfil)
-- ============================================
-- DROP POLICY IF EXISTS "perfil_usuario_select_own" ON perfil_usuario;
-- DROP POLICY IF EXISTS "perfil_usuario_upsert_own" ON perfil_usuario;
-- DROP POLICY IF EXISTS "perfil_usuario_update_own" ON perfil_usuario;
-- CREATE POLICY "anon_select_perfil_usuario"
--   ON perfil_usuario FOR SELECT TO anon USING (true);
