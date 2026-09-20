/**
 * HU-34 Fase A (extensión) — Tests del condensador Supabase → HealthSummary.
 * Función pura: filas literales, sin mocks.
 * SCRUM-202: tests de datosRelojToTrends.
 */
import {datosRelojToSummary, datosRelojToTrends} from '../supabaseMapper';
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

// ══════════════════════════════════════════════════════════════════
// Tests base: datosRelojToSummary
// ══════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════
// Tests SCRUM-202: datosRelojToTrends (tendencias 14d)
// Usa fechas fijas para no depender de la timezone del runner.
// ══════════════════════════════════════════════════════════════════

describe('datosRelojToTrends SCRUM-202', () => {
  // Fechas fijas — siempre dentro de las 24h o 14d desde "ahora" del runner
  // como el mapper usa Date.now() internamente, usamos fechas relativas
  // calculadas una sola vez al inicio del bloque.
  const now = new Date('2026-09-18T12:00:00.000Z').getTime();
  const H = 3600 * 1000;
  const D = 24 * H;
  const t = (offsetMs: number) => new Date(now - offsetMs).toISOString();
  const trends = (rows: DatosReloj[]) => datosRelojToTrends(rows, now);

  it('vacío o todo reemplazado: devuelve null', () => {
    expect(trends([])).toBeNull();
    expect(
      trends([row({reemplazado_por: 'otro', actividad_pasos: 5000})]),
    ).toBeNull();
  });

  it('un solo día de datos: calcula avg sin error', () => {
    const r = trends([
      row({actividad_pasos: 8000, horas_sueno: 7, frec_cardiaca_bpm: 72, recorded_at: t(6 * H)}),
    ]);
    expect(r).not.toBeNull();
    expect(r?.avgPasos14d).toBe(8000);
    expect(r?.avgSueno14dMin).toBe(420);
    expect(r?.deudaSuenoMin).toBe(0);
  });

  it('promedia pasos por día y luego promedia días', () => {
    const r = trends([
      // Día 1 (ayer): 6000 + 2000 = 8000
      row({actividad_pasos: 6000, recorded_at: t(30 * H)}),
      row({actividad_pasos: 2000, recorded_at: t(18 * H)}),
      // Día 2 (hace 2d): 10000
      row({actividad_pasos: 10000, recorded_at: t(42 * H)}),
    ]);
    expect(r).not.toBeNull();
    // Día1: 8000, Día2: 10000 → avg 14d = 9000
    expect(r?.avgPasos14d).toBe(9000);
  });

  it('sueño usa el máximo de horas por día (no suma)', () => {
    const r = trends([
      row({horas_sueno: 5, recorded_at: t(6 * H)}),
      row({horas_sueno: 3, recorded_at: t(2 * H)}),
    ]);
    expect(r).not.toBeNull();
    // Misma día: max(5, 3) = 5h = 300min
    expect(r?.avgSueno14dMin).toBe(300);
  });

  it('deuda de sueño: recientes con menos sueño que lejanos', () => {
    const r = trends([
      // Días lejanos: sueño normal (7h = 420min)
      row({horas_sueno: 7, recorded_at: t(8 * D)}),
      row({horas_sueno: 7, recorded_at: t(10 * D)}),
      // 3 días recientes: sueño bajo (5h = 300min)
      row({horas_sueno: 5, recorded_at: t(6 * H)}),
      row({horas_sueno: 5, recorded_at: t(1 * D + 6 * H)}),
      row({horas_sueno: 5, recorded_at: t(2 * D + 6 * H)}),
    ]);
    expect(r).not.toBeNull();
    // avg14d = (420 + 420 + 300 + 300 + 300) / 5 = 348
    expect(r?.avgSueno14dMin).toBe(348);
    // avg3d = (300 + 300 + 300) / 3 = 300
    expect(r?.avgSueno3dMin).toBe(300);
    // deuda = 348 - 300 = 48
    expect(r?.deudaSuenoMin).toBe(48);
  });

  it('tendencia pasos: ratio 3d vs 14d', () => {
    const r = trends([
      // 14d: pasos altos (10000/día, días lejanos)
      row({actividad_pasos: 10000, recorded_at: t(6 * D)}),
      row({actividad_pasos: 10000, recorded_at: t(8 * D)}),
      // 3d: pasos bajos (5000/día)
      row({actividad_pasos: 5000, recorded_at: t(6 * H)}),
      row({actividad_pasos: 5000, recorded_at: t(1 * D + 6 * H)}),
    ]);
    expect(r).not.toBeNull();
    // avg3d = 5000, avg14d = (10000+10000+5000+5000)/4 = 7500
    // tendencia = 5000/7500 ≈ 0.67
    expect(r?.tendenciaPasos).toBeCloseTo(0.67, 2);
  });

  it('filas reemplazadas se excluyen', () => {
    const r = trends([
      row({actividad_pasos: 10000, reemplazado_por: 'otro', recorded_at: t(1 * D)}),
      row({actividad_pasos: 5000, recorded_at: t(2 * D)}),
    ]);
    expect(r).not.toBeNull();
    // Solo la fila válida (5000) se cuenta
    expect(r?.avgPasos14d).toBe(5000);
  });

  it('FC y SpO2 promediados correctamente', () => {
    const r = trends([
      row({frec_cardiaca_bpm: 70, spo2_pct: 97, recorded_at: t(1 * D)}),
      row({frec_cardiaca_bpm: 80, spo2_pct: 99, recorded_at: t(2 * D)}),
    ]);
    expect(r).not.toBeNull();
    expect(r?.avgFc14d).toBe(75);
    expect(r?.avgSpo214d).toBe(98);
  });
});
