/**
 * Tests HU-98 — Baseline personalizado por paciente.
 *
 * Cubre:
 *  (a) deriveSpo2Thresholds: valores exactos y clamps en baselines extremos
 *  (b) deriveHrThresholds: atleta sin falsa bradicardia, criticals en guardarriles
 *  (c) deriveBpThresholds: paciente crónico relajado, jamás más sensible que OMS
 *  (d) resolveEffectiveThresholds: mezcla de métricas válidas y NULL → merge correcto
 *  (e) Guardarriles: ninguna derivación los viola, ni con stats absurdas
 *  (f) Engine: baseline personalizado → umbrales aplicados + tag umbral_origen
 *  (g) Cache: dos evaluaciones dentro del TTL → un solo fetch del baseline
 *  (h) Fallback: dep falla o datos insuficientes → umbrales estándar
 */
import {
  PERSONALIZATION_DEFAULTS,
  deriveSpo2Thresholds,
  deriveHrThresholds,
  deriveBpThresholds,
  resolveEffectiveThresholds,
  baselineRowToMetrics,
} from '../src/services/alerts/personalized';
import type {
  MetricStats,
  PersonalizedMetrics,
} from '../src/services/alerts/personalized';
import {AlertEngine} from '../src/services/alerts/engine';
import type {AlertSupabaseDeps} from '../src/services/alerts/engine';
import type {
  AlertRecord,
  AlertRecordInsert,
} from '../src/services/alerts/types';
import {
  DEFAULT_SPO2_THRESHOLDS,
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_HR_THRESHOLDS,
} from '../src/services/alerts/types';
import type {BaselinePersonalizado} from '../src/services/supabase/models';

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

const ms = (media: number, desvStd: number, nMuestras = 100): MetricStats => ({
  media,
  desvStd,
  p25: media - desvStd,
  p75: media + desvStd,
  nMuestras,
});

function makeMetrics(overrides: Partial<PersonalizedMetrics> = {}): PersonalizedMetrics {
  return {
    hr: ms(70, 7, 500),
    bpSistolica: ms(118, 7, 400),
    bpDiastolica: ms(76, 6, 400),
    spo2: ms(97, 1, 600),
    diasHistorial: 21,
    esValido: true,
    ...overrides,
  };
}

// ═══════════════════════════════════════════
// (a) deriveSpo2Thresholds
// ═══════════════════════════════════════════

describe('deriveSpo2Thresholds', () => {
  test('baseline sano alto → clamps al guardarril superior (warn 93 / crit 90)', () => {
    expect(deriveSpo2Thresholds(ms(97, 1))).toEqual({
      warningPercent: 93,
      criticalPercent: 90,
    });
  });

  test('COPD con baseline bajo (91 ± 1.5) → umbrales relajados sin romper el gap', () => {
    // warning = 91 - 2*1.5 = 88; critical = round(91 - 3*1.5) = 87 → gap fuerza 85
    expect(deriveSpo2Thresholds(ms(91, 1.5))).toEqual({
      warningPercent: 88,
      criticalPercent: 85,
    });
  });

  test('baseline extremadamente alto → nunca supera warningMax=93', () => {
    const t = deriveSpo2Thresholds(ms(100, 0.5));
    expect(t.warningPercent).toBeLessThanOrEqual(PERSONALIZATION_DEFAULTS.spo2.warningMax);
    expect(t.criticalPercent).toBeLessThanOrEqual(PERSONALIZATION_DEFAULTS.spo2.criticalMax);
    expect(t.criticalPercent).toBeLessThan(t.warningPercent);
  });

  test('baseline muy bajo (85 ± 2) → nunca baja de warningMin=88', () => {
    // warning = 85 - 4 = 81 → clamp a 88; critical = 85 - 6 = 79 → clamp a 83
    expect(deriveSpo2Thresholds(ms(85, 2))).toEqual({
      warningPercent: 88,
      criticalPercent: 83,
    });
  });
});

// ═══════════════════════════════════════════
// (b) deriveHrThresholds
// ═══════════════════════════════════════════

describe('deriveHrThresholds', () => {
  test('atleta (48 ± 3): sin falsa bradicardia en reposo (bradyWarn 42, bradyCrit 37)', () => {
    const t = deriveHrThresholds(ms(48, 3));
    expect(t).toEqual({
      tachyWarning: 100,
      tachyCritical: 120,
      bradyWarning: 42,
      bradyCritical: 37,
    });
    // Semántica: FC de reposo 47 lpm ya NO dispara bradicardia
    expect(47 >= t.bradyWarning).toBe(true);
  });

  test('persona normal (70 ± 7) → reproduce exactamente los defaults OMS', () => {
    expect(deriveHrThresholds(ms(70, 7))).toEqual(DEFAULT_HR_THRESHOLDS);
  });

  test('alta variabilidad (85 ± 12) → criticals dentro de guardarriles', () => {
    const t = deriveHrThresholds(ms(85, 12));
    expect(t.tachyWarning).toBe(109);
    expect(t.tachyCritical).toBe(121);
    expect(t.bradyWarning).toBe(50);
    expect(t.bradyCritical).toBe(40);
    // Invariantes
    expect(t.bradyCritical).toBeLessThan(t.bradyWarning);
    expect(t.tachyWarning).toBeLessThan(t.tachyCritical);
  });

  test('taquicardia jamás más sensible que OMS (tachyWarn >= 100)', () => {
    expect(deriveHrThresholds(ms(50, 2)).tachyWarning).toBeGreaterThanOrEqual(
      PERSONALIZATION_DEFAULTS.hrTachy.warningMin,
    );
  });
});

// ═══════════════════════════════════════════
// (c) deriveBpThresholds
// ═══════════════════════════════════════════

describe('deriveBpThresholds', () => {
  test('paciente crónico relajado (135 ± 8): sube umbrales altos, jamás baja de OMS', () => {
    const t = deriveBpThresholds(ms(135, 8));
    expect(t.sistolicaWarning).toBe(151);
    expect(t.sistolicaCritical).toBe(166);
    // Jamás más sensible: los altos nunca por debajo del default OMS
    expect(t.sistolicaWarning).toBeGreaterThanOrEqual(DEFAULT_BP_THRESHOLDS.sistolicaWarning);
    expect(t.diastolicaWarning).toBeGreaterThanOrEqual(DEFAULT_BP_THRESHOLDS.diastolicaWarning);
    // Jamás más sensible: los bajos nunca por encima del default OMS
    expect(t.sistolicaLowWarning).toBeLessThanOrEqual(DEFAULT_BP_THRESHOLDS.sistolicaLowWarning);
    expect(t.diastolicaLowWarning).toBeLessThanOrEqual(DEFAULT_BP_THRESHOLDS.diastolicaLowWarning);
    // Con media alta, la hipotensión queda en los defaults OMS
    expect(t.sistolicaLowWarning).toBe(90);
    expect(t.sistolicaLowCritical).toBe(80);
  });

  test('BP normal (118 ± 7): sistólicos quedan en OMS, nada más sensible', () => {
    const t = deriveBpThresholds(ms(118, 7));
    expect(t.sistolicaWarning).toBe(140);
    expect(t.sistolicaCritical).toBe(160);
    expect(t.sistolicaLowWarning).toBe(90);
    expect(t.sistolicaLowCritical).toBe(80);
  });

  test('stats absurdas (200 ± 30) → todos los umbrales dentro de guardarriles', () => {
    const g = PERSONALIZATION_DEFAULTS;
    const t = deriveBpThresholds(ms(200, 30));
    expect(t.sistolicaWarning).toBe(160);
    expect(t.sistolicaWarning).toBeLessThanOrEqual(g.bpSistHigh.warningMax);
    expect(t.sistolicaCritical).toBe(185);
    expect(t.sistolicaCritical).toBeLessThanOrEqual(g.bpSistHigh.criticalMax);
    expect(t.diastolicaWarning).toBeLessThanOrEqual(g.bpDiastHigh.warningMax);
    expect(t.diastolicaLowWarning).toBeGreaterThanOrEqual(g.bpDiastLow.warningMin);
  });
});

// ═══════════════════════════════════════════
// (d) resolveEffectiveThresholds — merge
// ═══════════════════════════════════════════

describe('resolveEffectiveThresholds', () => {
  const defaults = {
    spo2: DEFAULT_SPO2_THRESHOLDS,
    bp: DEFAULT_BP_THRESHOLDS,
    hr: DEFAULT_HR_THRESHOLDS,
  };

  test('todas las métricas válidas → aplica personalizadas y marca origen', () => {
    const r = resolveEffectiveThresholds(defaults, makeMetrics());
    expect(r.origen).toEqual({spo2: 'personalizado', bp: 'personalizado', hr: 'personalizado'});
    // Spo2 personalizada (97 ± 1)
    expect(r.spo2).toEqual({warningPercent: 93, criticalPercent: 90});
    // HR/BP normales → derivación coincide con OMS
    expect(r.hr).toEqual(DEFAULT_HR_THRESHOLDS);
    expect(r.bp).toEqual(DEFAULT_BP_THRESHOLDS);
  });

  test('es_valido=false → todo cae al fallback estándar aunque haya stats', () => {
    const r = resolveEffectiveThresholds(defaults, makeMetrics({
      hr: ms(48, 3, 500), // si se aplicara, bradyWarning sería 42
      esValido: false,
    }));
    expect(r.hr).toEqual(DEFAULT_HR_THRESHOLDS);
    expect(r.spo2).toEqual(DEFAULT_SPO2_THRESHOLDS);
    expect(r.bp).toEqual(DEFAULT_BP_THRESHOLDS);
    expect(r.origen).toEqual({spo2: 'estandar', bp: 'estandar', hr: 'estandar'});
  });

  test('mezcla válidas/NULL: solo HR tiene stats → merge correcto por métrica', () => {
    const r = resolveEffectiveThresholds(defaults, makeMetrics({
      hr: ms(48, 3, 500),
      bpSistolica: null,
      bpDiastolica: null,
      spo2: null,
    }));
    expect(r.origen).toEqual({spo2: 'estandar', bp: 'estandar', hr: 'personalizado'});
    expect(r.hr.bradyWarning).toBe(42);
    expect(r.spo2).toEqual(DEFAULT_SPO2_THRESHOLDS);
    expect(r.bp).toEqual(DEFAULT_BP_THRESHOLDS);
  });

  test('muestras insuficientes (< 30) en una métrica → esa métrica usa fallback', () => {
    const r = resolveEffectiveThresholds(defaults, makeMetrics({
      spo2: ms(91, 1.5, 29),
    }));
    expect(r.origen.spo2).toBe('estandar');
    expect(r.spo2).toEqual(DEFAULT_SPO2_THRESHOLDS);
    expect(r.origen.hr).toBe('personalizado');
  });

  test('fallback con historial insuficiente (5 días < 7) → todo estándar', () => {
    const r = resolveEffectiveThresholds(defaults, makeMetrics({
      hr: ms(48, 3, 900),
      spo2: ms(91, 1.5, 900),
      diasHistorial: 5,
    }));
    expect(r.origen).toEqual({spo2: 'estandar', bp: 'estandar', hr: 'estandar'});
    expect(r.hr).toEqual(DEFAULT_HR_THRESHOLDS);
  });

  test('metrics NULL/undefined → defaults puros', () => {
    expect(resolveEffectiveThresholds(defaults, null)).toEqual({
      spo2: DEFAULT_SPO2_THRESHOLDS,
      bp: DEFAULT_BP_THRESHOLDS,
      hr: DEFAULT_HR_THRESHOLDS,
      origen: {spo2: 'estandar', bp: 'estandar', hr: 'estandar'},
    });
  });

  test('baselineRowToMetrics mapea la fila BD y tolera campos NULL parciales', () => {
    const row: BaselinePersonalizado = {
      id: 'b1',
      id_usuario: 'u1',
      hr_media: 48,
      hr_desv_std: 3,
      hr_p25: 46,
      hr_p75: 51,
      hr_n_muestras: 500,
      bp_sist_media: 135,
      bp_sist_desv_std: 8,
      bp_sist_p25: 128,
      bp_sist_p75: 141,
      bp_sist_n_muestras: 320,
      bp_diast_media: null,
      bp_diast_desv_std: null,
      bp_diast_p25: null,
      bp_diast_p75: null,
      bp_diast_n_muestras: null,
      spo2_media: 91,
      spo2_desv_std: 1.5,
      spo2_p25: 90,
      spo2_p75: 92,
      spo2_n_muestras: 800,
      temp_media: null,
      temp_desv_std: null,
      temp_p25: null,
      temp_p75: null,
      temp_n_muestras: null,
      dias_historial: 24,
      ventana_dias: 28,
      es_valido: true,
      ultima_actualizacion: '2026-08-23T03:30:00Z',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-23T03:30:00Z',
    };
    const m = baselineRowToMetrics(row);
    expect(m.hr).toEqual({media: 48, desvStd: 3, p25: 46, p75: 51, nMuestras: 500});
    expect(m.bpDiastolica).toBeNull();
    expect(m.esValido).toBe(true);
    expect(m.diasHistorial).toBe(24);
  });
});

// ═══════════════════════════════════════════
// (e) Guardarriles jamás violados
// ═══════════════════════════════════════════

describe('guardarriles absolutos (HU-98)', () => {
  const defaults = {
    spo2: DEFAULT_SPO2_THRESHOLDS,
    bp: DEFAULT_BP_THRESHOLDS,
    hr: DEFAULT_HR_THRESHOLDS,
  };
  const g = PERSONALIZATION_DEFAULTS;

  test('stats patológicas extremas → ningún umbral sale de su rango', () => {
    const r = resolveEffectiveThresholds(defaults, makeMetrics({
      hr: ms(250, 80, 9999),
      bpSistolica: ms(250, 80, 9999),
      bpDiastolica: ms(150, 40, 9999),
      spo2: ms(250, 80, 9999),
      diasHistorial: 28,
    }));

    // SpO2
    expect(r.spo2.warningPercent).toBeGreaterThanOrEqual(g.spo2.warningMin);
    expect(r.spo2.warningPercent).toBeLessThanOrEqual(g.spo2.warningMax);
    expect(r.spo2.criticalPercent).toBeGreaterThanOrEqual(g.spo2.criticalMin);
    expect(r.spo2.criticalPercent).toBeLessThanOrEqual(g.spo2.criticalMax);

    // HR
    expect(r.hr.tachyWarning).toBeGreaterThanOrEqual(g.hrTachy.warningMin);
    expect(r.hr.tachyWarning).toBeLessThanOrEqual(g.hrTachy.warningMax);
    expect(r.hr.tachyCritical).toBeLessThanOrEqual(g.hrTachy.criticalMax);
    expect(r.hr.bradyWarning).toBeGreaterThanOrEqual(g.hrBrady.warningMin);
    expect(r.hr.bradyWarning).toBeLessThanOrEqual(g.hrBrady.warningMax);
    expect(r.hr.bradyCritical).toBeGreaterThanOrEqual(g.hrBrady.criticalMin);
    expect(r.hr.bradyCritical).toBeLessThanOrEqual(g.hrBrady.criticalMax);

    // BP — jamás más sensible que OMS en ninguno de los dos sentidos
    expect(r.bp.sistolicaWarning).toBeGreaterThanOrEqual(DEFAULT_BP_THRESHOLDS.sistolicaWarning);
    expect(r.bp.sistolicaWarning).toBeLessThanOrEqual(g.bpSistHigh.warningMax);
    expect(r.bp.diastolicaWarning).toBeGreaterThanOrEqual(DEFAULT_BP_THRESHOLDS.diastolicaWarning);
    expect(r.bp.diastolicaWarning).toBeLessThanOrEqual(g.bpDiastHigh.warningMax);
    expect(r.bp.sistolicaLowWarning).toBeLessThanOrEqual(DEFAULT_BP_THRESHOLDS.sistolicaLowWarning);
    expect(r.bp.sistolicaLowWarning).toBeGreaterThanOrEqual(g.bpSistLow.warningMin);
    expect(r.bp.diastolicaLowWarning).toBeLessThanOrEqual(DEFAULT_BP_THRESHOLDS.diastolicaLowWarning);
    expect(r.bp.diastolicaLowWarning).toBeGreaterThanOrEqual(g.bpDiastLow.warningMin);
  });

  test('la configuración default es internamente consistente', () => {
    for (const gr of [
      g.spo2, g.hrTachy, g.hrBrady, g.bpSistHigh, g.bpSistLow, g.bpDiastHigh, g.bpDiastLow,
    ]) {
      expect(gr.warningMin).toBeLessThanOrEqual(gr.warningMax);
      expect(gr.criticalMin).toBeLessThanOrEqual(gr.criticalMax);
      expect(gr.gap).toBeGreaterThan(0);
    }
    // Pares alto/bajo: critical fuera del rango de warning
    expect(g.hrTachy.criticalMin).toBeGreaterThan(g.hrTachy.warningMax);
    expect(g.hrBrady.criticalMax).toBeLessThan(g.hrBrady.warningMin);
  });
});

// ═══════════════════════════════════════════
// (f)/(g)/(h) Engine + baseline personalizado
// ═══════════════════════════════════════════

function makeEngineDeps(overrides: Partial<AlertSupabaseDeps> = {}): AlertSupabaseDeps & {
  inserted: AlertRecordInsert[];
  markedRead: string[];
} {
  const inserted: AlertRecordInsert[] = [];
  const markedRead: string[] = [];

  return {
    inserted,
    markedRead,
    insertAlert: async (alert) => {
      inserted.push(alert);
      return {
        id: `alert-${inserted.length}`,
        ...alert,
        leida_en: null,
        created_at: new Date().toISOString(),
        status: 'activa' as const,
      } as AlertRecord;
    },
    getActiveAlerts: async () => [],
    markAlertRead: async (alertId) => {
      markedRead.push(alertId);
    },
    updateAlertDatos: async () => {},
    ...overrides,
  };
}

/** Fila de baseline_personalizado de un atleta (HR 48 ± 3) con resto válido-normal. */
function makeAthleteBaselineRow(overrides: Partial<BaselinePersonalizado> = {}): BaselinePersonalizado {
  return {
    id: 'b1',
    id_usuario: 'u1',
    hr_media: 48,
    hr_desv_std: 3,
    hr_p25: 46,
    hr_p75: 51,
    hr_n_muestras: 500,
    bp_sist_media: 118,
    bp_sist_desv_std: 7,
    bp_sist_p25: 112,
    bp_sist_p75: 124,
    bp_sist_n_muestras: 400,
    bp_diast_media: 76,
    bp_diast_desv_std: 6,
    bp_diast_p25: 71,
    bp_diast_p75: 81,
    bp_diast_n_muestras: 400,
    spo2_media: 97,
    spo2_desv_std: 1,
    spo2_p25: 96,
    spo2_p75: 98,
    spo2_n_muestras: 600,
    temp_media: null,
    temp_desv_std: null,
    temp_p25: null,
    temp_p75: null,
    temp_n_muestras: null,
    dias_historial: 21,
    ventana_dias: 28,
    es_valido: true,
    ultima_actualizacion: '2026-08-23T03:30:00Z',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-23T03:30:00Z',
    ...overrides,
  };
}

describe('AlertEngine con baseline personalizado (HU-98)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('atleta: FC 47 lpm NO genera bradicardia (umbral personal bradyWarn 42)', async () => {
    const getPersonalizedBaseline = jest.fn().mockResolvedValue(makeAthleteBaselineRow());
    const deps = makeEngineDeps({getPersonalizedBaseline});
    const engine = new AlertEngine(deps);

    const result = await engine.evaluateHrReading('u1', 47, 'wearable');
    expect(result).toBeNull();
    expect(deps.inserted).toHaveLength(0);

    engine.dispose();
  });

  test('alerta generada con baseline válido incluye tag umbral_origen=personalizado', async () => {
    const deps = makeEngineDeps({
      getPersonalizedBaseline: jest.fn().mockResolvedValue(makeAthleteBaselineRow()),
    });
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateHrReading('u1', 110, 'wearable');
    expect(alert).not.toBeNull();
    expect(alert!.tipo).toBe('taquicardia');
    expect(alert!.datos).toMatchObject({
      umbral_origen: 'personalizado',
      umbral_configurado: 100,
    });

    engine.dispose();
  });

  test('sin dep de baseline → tag umbral_origen=estandar', async () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateSpo2Reading('u1', 88, 'wearable');
    expect(alert).not.toBeNull();
    expect(alert!.datos).toMatchObject({umbral_origen: 'estandar'});

    engine.dispose();
  });

  test('cache: dos evaluaciones dentro del TTL → un solo fetch del baseline', async () => {
    const getPersonalizedBaseline = jest.fn().mockResolvedValue(makeAthleteBaselineRow());
    const deps = makeEngineDeps({getPersonalizedBaseline});
    const engine = new AlertEngine(deps);

    await engine.evaluateHrReading('u1', 47, 'wearable');
    await engine.evaluateHrReading('u1', 110, 'wearable');

    expect(getPersonalizedBaseline).toHaveBeenCalledTimes(1);

    engine.dispose();
  });

  test('si el fetch del baseline falla → fallback silencioso a estándar y alerta igual', async () => {
    const deps = makeEngineDeps({
      getPersonalizedBaseline: jest.fn().mockRejectedValue(new Error('supabase down')),
    });
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateSpo2Reading('u1', 89, 'wearable');
    // Estándar: warn < 90 → 89 dispara advertencia
    expect(alert).not.toBeNull();
    expect(alert!.severidad).toBe('advertencia');
    expect(alert!.datos).toMatchObject({umbral_origen: 'estandar', umbral_configurado: 90});

    engine.dispose();
  });

  test('COPD (spo2 91 ± 1.5): lectura 89 NO genera falsa hipoxia (umbral personal 88)', async () => {
    const row = makeAthleteBaselineRow({
      spo2_media: 91,
      spo2_desv_std: 1.5,
      spo2_p25: 90,
      spo2_p75: 92,
      spo2_n_muestras: 800,
    });
    const deps = makeEngineDeps({
      getPersonalizedBaseline: jest.fn().mockResolvedValue(row),
    });
    const engine = new AlertEngine(deps);

    const result = await engine.evaluateSpo2Reading('u1', 89, 'wearable');
    expect(result).toBeNull();
    expect(deps.inserted).toHaveLength(0);

    engine.dispose();
  });

  test('baseline inválido (es_valido=false) → comportamiento idéntico al estándar', async () => {
    const row = makeAthleteBaselineRow({es_valido: false});
    const deps = makeEngineDeps({
      getPersonalizedBaseline: jest.fn().mockResolvedValue(row),
    });
    const engine = new AlertEngine(deps);

    const result = await engine.evaluateHrReading('u1', 47, 'wearable');
    // Estándar: bradyWarn 50 → 47 dispara bradicardia
    expect(result).not.toBeNull();
    expect(result!.tipo).toBe('bradicardia');
    expect(result!.datos).toMatchObject({umbral_origen: 'estandar'});

    engine.dispose();
  });
});
