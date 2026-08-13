import { validateDatosReloj, validateDatosRelojBatch, ValidationError } from '../src/services/validation';
import { supabase } from '../src/services/supabase/client';

jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('validation edge cases', () => {
  beforeEach(() => {
    (supabase.from as jest.Mock).mockReset();
  });

  test('accepts min and max boundary values', async () => {
    const rules = [
      { metric_key: 'spo2_pct', data_type: 'decimal', min_value: 50, max_value: 100, unit: '%', display_name: 'SpO2', is_active: true },
    ];
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: rules, error: null }) }) }),
    });

    await expect(validateDatosReloj({ id_usuario: 'u1', spo2_pct: 50 })).resolves.toBeUndefined();
    await expect(validateDatosReloj({ id_usuario: 'u1', spo2_pct: 100 })).resolves.toBeUndefined();
  });

  test('rejects decimal value when data_type is integer', async () => {
    const rules = [
      { metric_key: 'bp_sistolica', data_type: 'integer', min_value: 60, max_value: 250, unit: 'mmHg', display_name: 'PA sistólica', is_active: true },
    ];
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: rules, error: null }) }) }),
    });

    await expect(validateDatosReloj({ id_usuario: 'u1', bp_sistolica: 120.5 as any })).rejects.toBeInstanceOf(ValidationError);
  });

  test('rejects numeric strings (malformed)', async () => {
    const rules = [
      { metric_key: 'frec_cardiaca_bpm', data_type: 'integer', min_value: 25, max_value: 220, unit: 'lpm', display_name: 'FC', is_active: true },
    ];
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: rules, error: null }) }) }),
    });

    await expect(validateDatosReloj({ id_usuario: 'u1', frec_cardiaca_bpm: '120' as any })).rejects.toBeInstanceOf(ValidationError);
  });

  test('batch reports multiple indexed errors', async () => {
    const rules = [
      { metric_key: 'frec_cardiaca_bpm', data_type: 'integer', min_value: 25, max_value: 220, unit: 'lpm', display_name: 'FC', is_active: true },
    ];
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: rules, error: null }) }) }),
    });

    await expect(
      validateDatosRelojBatch([
        { id_usuario: 'u1', frec_cardiaca_bpm: 'nonnumeric' as any },
        { id_usuario: 'u1', frec_cardiaca_bpm: 10 }, // below min
        { id_usuario: 'u1', frec_cardiaca_bpm: 80 },
      ]),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
