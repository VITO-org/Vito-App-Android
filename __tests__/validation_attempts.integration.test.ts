import { createClient } from '@supabase/supabase-js';

// Este test es de integración y toca la instancia real de Supabase.
// Se ejecuta solo si la variable de entorno RUN_INTEGRATION está en 'true'
// y SUPABASE_URL/SUPABASE_ANON_KEY están definidas.
const RUN_INTEG = process.env.RUN_INTEGRATION === 'true' && !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY;

(RUN_INTEG ? test : test.skip)('insert a validation_attempt into Supabase (integration)', async () => {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

  const attempt = {
    id_usuario: null,
    datos_reloj_id: null,
    payload: { integration: true, ts: new Date().toISOString() },
    errors: ['integration-test: insertar registro'],
    source: 'integration-test',
    recorded_at: new Date().toISOString(),
  } as any;

  const { data, error } = await supabase.from('validation_attempts').insert(attempt).select().single();
  if (error) throw error;
  expect(data).toBeDefined();
  expect((data as any).source).toBe('integration-test');
});
