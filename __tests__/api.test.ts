import { getDatosReloj } from '../src/services/supabase/api';
import { supabase } from '../src/services/supabase/client';

jest.mock('../src/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('api.getDatosReloj', () => {
  beforeEach(() => {
    (supabase.from as jest.Mock).mockReset();
  });

  function makeQueryReturning(data: any) {
    const q: any = {};
    const chain = ['select', 'eq', 'order', 'gte', 'lte', 'limit'];
    for (const fn of chain) q[fn] = () => q;
    q.then = (resolve: any) => Promise.resolve(resolve({ data, error: null }));
    return q;
  }

  test('excludes suspicious records by default', async () => {
    const rows = [
      { id: '1', frec_cardiaca_bpm: 80, sospechoso: false },
      { id: '2', frec_cardiaca_bpm: 999, sospechoso: true },
    ];
    (supabase.from as jest.Mock).mockReturnValue(makeQueryReturning([rows[0]]));

    const res = await getDatosReloj('u1');
    expect(res.find(r => r.id === '2')).toBeUndefined();
    expect(res.find(r => r.id === '1')).toBeDefined();
  });

  test('includes suspicious when includeSuspicious=true', async () => {
    const rows = [
      { id: '1', frec_cardiaca_bpm: 80, sospechoso: false },
      { id: '2', frec_cardiaca_bpm: 999, sospechoso: true },
    ];
    (supabase.from as jest.Mock).mockReturnValue(makeQueryReturning(rows));

    const res = await getDatosReloj('u1', { includeSuspicious: true });
    expect(res.find(r => r.id === '2')).toBeDefined();
    expect(res.length).toBe(2);
  });
});
