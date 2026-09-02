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

CREATE POLICY "anon_select_alertas"
  ON alerta
  FOR SELECT
  TO anon
  USING (true);

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

-- Verificar que el panel puede leer alertas
SELECT * FROM alerta ORDER BY created_at DESC LIMIT 5;
-- Esperado: devuelve las alertas generadas

-- Verificar inserción manual en datos_reloj (simula lo que hace el panel)
INSERT INTO datos_reloj (id_usuario, spo2_pct, origen, recorded_at)
VALUES ('d11f3190-6d35-4b6e-b9c9-f75f55716b8b', 82, 'manual', NOW());
-- Esperado: inserción exitosa

-- Limpiar el registro de prueba
DELETE FROM datos_reloj WHERE origen = 'manual' AND spo2_pct = 82;
