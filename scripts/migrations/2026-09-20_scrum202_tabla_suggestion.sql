-- ============================================
-- SCRUM-202: Tabla suggestion para persistir
-- sugerencias de Vittito en Supabase.
-- ============================================

CREATE TABLE suggestion (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario uuid NOT NULL REFERENCES public.usuario(id),
    tipo varchar(50) NOT NULL,
    prioridad varchar(20) NOT NULL DEFAULT 'Media',
    titulo varchar(150) NOT NULL,
    descripcion text NOT NULL,
    motivo text,
    acciones jsonb,
    icon varchar(10),
    datos jsonb,
    leida_en timestamptz,
    hecha_en timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_suggestion_usuario_created
  ON suggestion(id_usuario, created_at DESC);

CREATE INDEX idx_suggestion_usuario_leida
  ON suggestion(id_usuario, leida_en)
  WHERE leida_en IS NULL;

CREATE INDEX idx_suggestion_tipo
  ON suggestion(tipo);

-- RLS: usuarios ven sus propias sugerencias
ALTER TABLE suggestion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios ven sus propias sugerencias"
  ON suggestion
  FOR ALL
  USING (auth.uid() = id_usuario);

-- Policy para anon (panel admin testing)
DROP POLICY IF EXISTS "anon_select_suggestions" ON suggestion;
CREATE POLICY "anon_select_suggestions"
  ON suggestion
  FOR SELECT
  TO anon
  USING (true);
