-- ============================================
-- HU-16: Registro de contactos de confianza
-- Fecha: 2026-09-08
-- Descripción: Tabla contacto_confianza (una fila por contacto del usuario)
--              con RLS "own" habilitado desde el alta (NO repetir el gap
--              de datos_reloj, que se creó sin RLS).
--
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- 1. TABLA contacto_confianza
CREATE TABLE contacto_confianza (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL REFERENCES public.usuario(id) ON DELETE CASCADE,
  nombre varchar(120) NOT NULL,
  relacion varchar(20) NOT NULL CHECK (relacion IN ('familiar', 'medico', 'otro')),
  telefono varchar(30) NOT NULL,
  email varchar(255) NOT NULL,
  frecuencia_notificacion varchar(20) NOT NULL DEFAULT 'inmediata'
    CHECK (frecuencia_notificacion IN ('inmediata', 'diaria', 'semanal', 'sin_notificaciones')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Índice por usuario: lookup de la lista de la pantalla + soporte del filtro id_usuario
CREATE INDEX idx_contacto_confianza_usuario
  ON contacto_confianza(id_usuario);

-- 3. RLS: el dueño solo ve/escribe sus contactos (CA-04)
ALTER TABLE contacto_confianza ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacto_confianza_select_own"
  ON contacto_confianza FOR SELECT
  TO authenticated
  USING (auth.uid() = id_usuario);

CREATE POLICY "contacto_confianza_insert_own"
  ON contacto_confianza FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id_usuario);

CREATE POLICY "contacto_confianza_update_own"
  ON contacto_confianza FOR UPDATE
  TO authenticated
  USING (auth.uid() = id_usuario)
  WITH CHECK (auth.uid() = id_usuario);

CREATE POLICY "contacto_confianza_delete_own"
  ON contacto_confianza FOR DELETE
  TO authenticated
  USING (auth.uid() = id_usuario);

-- Escrituras server-side futuras (motor de notificaciones / Edge Function).
-- Copia del patrón baseline_personalizado_service_role_all (hu98:85-89).
CREATE POLICY "contacto_confianza_service_role_all"
  ON contacto_confianza FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Comentario de tabla (documentación in-DB, como hu25/hu98)
COMMENT ON TABLE public.contacto_confianza IS 'Contactos de confianza del usuario (HU-16). RLS: solo el dueño (auth.uid()=id_usuario) puede select/insert/update/delete.';

-- ════════════════════ Verificación manual RLS cross-user — HU-16 ════════════════════
-- Ejecutar en el SQL Editor de Supabase. Reemplazar <UID_A>, <UID_B> e <ID_FILA_B>.

-- 0) Confirmar que las policies existen (5 esperadas)
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename = 'contacto_confianza' ORDER BY policyname;

-- 1) Simular sesión autenticada como usuario A
SELECT set_config('request.jwt.claims', '{"sub":"<UID_A>","role":"authenticated"}', false);
SELECT set_config('role', 'authenticated', false);

-- 2) INSERT de contacto propio → OK (esperado: 1 fila)
INSERT INTO contacto_confianza (id_usuario, nombre, relacion, telefono, email, frecuencia_notificacion)
VALUES ('<UID_A>', 'Familiar A', 'familiar', '+5491100001111', 'a@example.com', 'diaria');

-- 3) SELECT de filas de B siendo A → 0 filas (esperado: 0)
SELECT count(*) FROM contacto_confianza WHERE id_usuario = '<UID_B>';

-- 4) UPDATE de filas de B siendo A → 0 filas afectadas (esperado: 0)
UPDATE contacto_confianza SET nombre = 'hack' WHERE id_usuario = '<UID_B>';

-- 5) DELETE de fila de B siendo A → 0 filas eliminadas (esperado: 0)
DELETE FROM contacto_confianza WHERE id = '<ID_FILA_B>';

-- 6) INSERT con id_usuario ajeno siendo A → VIOLACIÓN RLS (WITH CHECK auth.uid()=id_usuario)
INSERT INTO contacto_confianza (id_usuario, nombre, relacion, telefono, email, frecuencia_notificacion)
VALUES ('<UID_B>', 'Invasor', 'familiar', '+5491199999999', 'b@example.com', 'inmediata');