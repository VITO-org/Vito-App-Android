/**
 * HU-34 Fase A (extensión) — Tests del condensador Supabase → HealthSummary.
 * Función pura: filas literales, sin mocks.
 */
import {datosRelojToSummary} from '../supabaseMapper';
import type {DatosReloj} from '../../supabase/models';

function row(over: Partial<DatosReloj> = {}): DatosReloj {
  return {
    id: 'r1',
    id_usuario: 'u1',
    bp_sistolica: null,
    bp_diastolica: null,
    frec_cardiaca_bpm: null,
    spo2_pct: null,
    temperatura: null,
    nivel_estres: null,
    actividad_pasos: null,
    horas_sueno: null,
    recorded_at: '2026-09-18T10:00:00.000Z',
    sospechoso: false,
    ...over,
  };
}

describe('supabaseSource HU-34', () => {
  it('vacío o todo reemplazado: devuelve null', () => {
    expect(datosRelojToSummary([])).toBeNull();
    expect(
      datosRelojToSummary([row({reemplazado_por: 'otro-id', frec_cardiaca_bpm: 150})]),
    ).toBeNull();
  });

  it('filas sin señales: devuelve null', () => {
    expect(datosRelojToSummary([row({})])).toBeNull();
  });

  it('FC: promedia lecturas no nulas', () => {
    const s = datosRelojToSummary([
      row({frec_cardiaca_bpm: 110, recorded_at: '2026-09-18T10:00:00.000Z'}),
      row({frec_cardiaca_bpm: 114, recorded_at: '2026-09-18T10:30:00.000Z'}),
    ]);
    expect(s?.averageBpm).toBeCloseTo(112);
  });

  it('último válido gana sin importar el orden de entrada', () => {
    const s = datosRelojToSummary([
      row({spo2_pct: 93, recorded_at: '2026-09-18T10:30:00.000Z'}),
      row({spo2_pct: 98, recorded_at: '2026-09-18T10:00:00.000Z'}),
      row({temperatura: 38.2, recorded_at: '2026-09-18T09:00:00.000Z'}),
      row({temperatura: 36.6, recorded_at: '2026-09-18T11:00:00.000Z'}),
    ]);
    expect(s?.spo2Percent).toBe(93);
    expect(s?.bodyTemperatureCelsius).toBe(36.6);
  });

  it('PA sistólica y diastólica pueden venir de filas distintas', () => {
    const s = datosRelojToSummary([
      row({bp_sistolica: 135, recorded_at: '2026-09-18T10:00:00.000Z'}),
      row({bp_diastolica: 88, recorded_at: '2026-09-18T10:30:00.000Z'}),
    ]);
    expect(s?.bloodPressureSystolic).toBe(135);
    expect(s?.bloodPressureDiastolic).toBe(88);
  });

  it('pasos se suman, sueño convierte horas a minutos', () => {
    const s = datosRelojToSummary([
      row({actividad_pasos: 800, recorded_at: '2026-09-18T10:00:00.000Z'}),
      row({actividad_pasos: 400, horas_sueno: 5, recorded_at: '2026-09-18T10:30:00.000Z'}),
    ]);
    expect(s?.steps).toBe(1200);
    expect(s?.sleepMinutes).toBe(300);
  });

  it('caso panel: FC 112 + SpO2 93 + pasos 1200 dispara el motor', () => {
    const s = datosRelojToSummary([
      row({frec_cardiaca_bpm: 112, recorded_at: '2026-09-18T10:00:00.000Z'}),
      row({spo2_pct: 93, recorded_at: '2026-09-18T10:30:00.000Z'}),
      row({actividad_pasos: 1200, recorded_at: '2026-09-18T11:00:00.000Z'}),
    ]);
    expect(s).not.toBeNull();
    expect(s?.averageBpm).toBe(112);
    expect(s?.spo2Percent).toBe(93);
    expect(s?.steps).toBe(1200);
  });
});
