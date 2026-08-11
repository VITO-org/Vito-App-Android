import {
  DATOS_RELOJ_METRICAS,
  expandDatosRelojToDatoSaludML,
} from '../datoSaludML';
import type {DatosRelojInsert} from '../supabase/models';

describe('expandDatosRelojToDatoSaludML', () => {
  const base: DatosRelojInsert = {
    id_usuario: 'user-1',
    frec_cardiaca_bpm: 72,
    spo2_pct: 97.5,
    temperatura: 36.6,
    bp_sistolica: 120,
    bp_diastolica: 80,
    nivel_estres: null,
    actividad_pasos: 3400,
    horas_sueno: 7.5,
    recorded_at: '2026-08-10T10:00:00Z',
    sospechoso: false,
  };

  it('expande cada métrica no nula a una fila de dato_salud_ml', () => {
    const rows = expandDatosRelojToDatoSaludML(base, 'dispositivo');
    expect(rows).toHaveLength(7);
  });

  it('omite las métricas nulas', () => {
    const rows = expandDatosRelojToDatoSaludML(base, 'dispositivo');
    expect(rows.find(r => r.tipo_metrica === 'nivel_estres')).toBeUndefined();
  });

  it('asigna tipo_metrica y unidad canónica por columna', () => {
    const rows = expandDatosRelojToDatoSaludML(base, 'dispositivo');
    const byMetric = new Map(rows.map(r => [r.tipo_metrica, r]));
    expect(byMetric.get('frec_cardiaca_bpm')?.unidad).toBe('lpm');
    expect(byMetric.get('frec_cardiaca_bpm')?.valor).toBe(72);
    expect(byMetric.get('bp_sistolica')?.unidad).toBe('mmHg');
    expect(byMetric.get('spo2_pct')?.unidad).toBe('%');
    expect(byMetric.get('temperatura')?.unidad).toBe('°C');
    expect(byMetric.get('actividad_pasos')?.unidad).toBe('pasos');
    expect(byMetric.get('horas_sueno')?.unidad).toBe('horas');
  });

  it('propaga id_usuario, fuente y recorded_at', () => {
    const rows = expandDatosRelojToDatoSaludML(
      {...base, recorded_at: '2026-08-10T12:00:00Z'},
      'integracion',
    );
    for (const row of rows) {
      expect(row.id_usuario).toBe('user-1');
      expect(row.fuente).toBe('integracion');
      expect(row.recorded_at).toBe('2026-08-10T12:00:00Z');
    }
  });

  it('contempla las 8 columnas de datos_reloj en la configuración', () => {
    const columnas = DATOS_RELOJ_METRICAS.map(m => m.columna);
    expect(columnas).toEqual(
      expect.arrayContaining([
        'bp_sistolica',
        'bp_diastolica',
        'frec_cardiaca_bpm',
        'spo2_pct',
        'temperatura',
        'nivel_estres',
        'actividad_pasos',
        'horas_sueno',
      ]),
    );
  });
});