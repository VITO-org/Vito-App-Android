-- ============================================
-- Panel de Testing de Alertas - Configuración Supabase
-- Fecha: 2026-09-02
-- Descripción: Scripts SQL para habilitar el panel web de testing
--              de alertas y notificaciones de VITO.
--
-- ⚠️ ESTOS SCRIPTS SON SOLO PARA DESARROLLO/TESTING
-- ⚠️ NO EJECUTAR EN PRODUCCIÓN
--
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. datos_reloj: Deshabilitar RLS
-- ============================================
-- El panel web inserta datos de prueba usando la anon key.
-- RLS bloqueaba las inserciones porque no hay usuario autenticado.
--
-- Antes: RLS habilitado con policy "datos_reloj_insert_own" (solo authenticated)
-- Después: RLS deshabilitado (permite inserciones anónimas para testing)

ALTER TABLE datos_reloj DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. alerta: Policy de lectura para anon
-- ============================================
-- El panel web necesita leer las alertas generadas para mostrarlas.
-- La policy existente "Usuarios ven sus propias alertas" usa auth.uid()
-- que retorna NULL para el rol anon, por eso no devolvía resultados.

-- Idempotencia: DROP IF EXISTS antes de crear (re-ejecutable).
DROP POLICY IF EXISTS "anon_select_alertas" ON alerta;

CREATE POLICY "anon_select_alertas"
  ON alerta
  FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- 3. perfil_usuario: Policy de lectura para anon
-- ============================================
-- El panel web necesita leer los perfiles para mostrar el desplegable
-- de usuarios. Sin esta policy, el dropdown dice "No hay usuarios".

-- Idempotencia: DROP IF EXISTS antes de crear (re-ejecutable).
DROP POLICY IF EXISTS "anon_select_perfil_usuario" ON perfil_usuario;

CREATE POLICY "anon_select_perfil_usuario"
  ON perfil_usuario
  FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- 4. notificacion_entrega: lectura anon para Delivery Log
-- ============================================
-- ⚠️ STAGING-ONLY: el panel QA lee entregas con anon key.
-- NO EJECUTAR EN PRODUCCIÓN.
-- Idempotente via DROP POLICY IF EXISTS + CREATE POLICY.

DROP POLICY IF EXISTS "anon_select_notificacion_entrega" ON notificacion_entrega;

CREATE POLICY "anon_select_notificacion_entrega"
  ON notificacion_entrega
  FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- 5. preferencia_notificacion: lectura/escritura anon para editor quiet-hours
-- ============================================
-- ⚠️ STAGING-ONLY: el panel QA edita horario_silencioso_* con anon key.
-- NO EJECUTAR EN PRODUCCIÓN.
-- Idempotente via DROP POLICY IF EXISTS + CREATE POLICY.

DROP POLICY IF EXISTS "anon_select_preferencia_notificacion" ON preferencia_notificacion;

CREATE POLICY "anon_select_preferencia_notificacion"
  ON preferencia_notificacion
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "anon_upsert_preferencia_notificacion" ON preferencia_notificacion;

CREATE POLICY "anon_upsert_preferencia_notificacion"
  ON preferencia_notificacion
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_preferencia_notificacion" ON preferencia_notificacion;

CREATE POLICY "anon_update_preferencia_notificacion"
  ON preferencia_notificacion
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Verificación (ejecutar después de aplicar los cambios)
-- ============================================

-- Verificar que RLS está deshabilitado en datos_reloj
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'datos_reloj';
-- Esperado: rowsecurity = false

-- Verificar policies de datos_reloj
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'datos_reloj';
-- Esperado: solo "anon_insert_datos_reloj" (si se creó antes)

-- Verificar policies de alerta
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'alerta';
-- Esperado: "Usuarios ven sus propias alertas" (ALL, public) + "anon_select_alertas" (SELECT, anon)

-- Verificar policies de perfil_usuario
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'perfil_usuario';
-- Esperado: "anon_select_perfil_usuario" (SELECT, anon)

-- Verificar que el panel puede leer alertas
SELECT * FROM alerta ORDER BY created_at DESC LIMIT 5;
-- Esperado: devuelve las alertas generadas

-- Verificar inserción manual en datos_reloj (simula lo que hace el panel)
INSERT INTO datos_reloj (id_usuario, spo2_pct, origen, recorded_at)
VALUES ('d11f3190-6d35-4b6e-b9c9-f75f55716b8b', 82, 'manual', NOW());
-- Esperado: inserción exitosa

-- Limpiar el registro de prueba
DELETE FROM datos_reloj WHERE origen = 'manual' AND spo2_pct = 82;
