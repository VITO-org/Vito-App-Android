import { validateDatosReloj, validateDatosRelojBatch, ValidationError } from '../src/services/validation';
import { supabase } from '../src/services/supabase/client';

jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('validation.ts', () => {
  beforeEach(() => {
    (supabase.from as jest.Mock).mockReset();
  });

  test('validateDatosReloj accepts valid numeric values within range', async () => {
    // mock rules for frec_cardiaca_bpm
    const rules = [
      { metric_key: 'frec_cardiaca_bpm', data_type: 'integer', min_value: 25, max_value: 220, unit: 'lpm', display_name: 'FC', is_active: true },
    ];

    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: rules, error: null }) }) }),
    });

    await expect(validateDatosReloj({ id_usuario: 'u1', frec_cardiaca_bpm: 80 })).resolves.toBeUndefined();
  });

  test('validateDatosReloj rejects non-numeric values', async () => {
    const rules = [
      { metric_key: 'frec_cardiaca_bpm', data_type: 'integer', min_value: 25, max_value: 220, unit: 'lpm', display_name: 'FC', is_active: true },
    ];
    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: rules, error: null }) }) }),
    });

    await expect(validateDatosReloj({ id_usuario: 'u1', frec_cardiaca_bpm: 'texto' as any })).rejects.toBeInstanceOf(ValidationError);
  });

  test('validateDatosRelojBatch reports indexed errors', async () => {
    const rules = [
      { metric_key: 'frec_cardiaca_bpm', data_type: 'integer', min_value: 25, max_value: 220, unit: 'lpm', display_name: 'FC', is_active: true },
    ];
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: rules, error: null }) }) }),
    });

    await expect(
      validateDatosRelojBatch([
        { id_usuario: 'u1', frec_cardiaca_bpm: 80 },
        { id_usuario: 'u1', frec_cardiaca_bpm: 'bad' as any },
      ]),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
