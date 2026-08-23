/**
 * Tests del módulo de alertas HU-41 — Alerta por hipoxia (SpO₂ baja).
 * Extended HU-43: Alerta por presión arterial fuera de rango.
 * Extended HU-42: Alerta por frecuencia cardíaca fuera de rango.
 *
 * Adapted to new Supabase schema (2026-08-20):
 * - Table `alerta` with titulo, mensaje, datos jsonb, leida_en
 * - Lifecycle: read/unread (leida_en) instead of state machine
 * - Escalation tracked in datos jsonb
 *
 * Cubre:
 *  (a) Detector SpO2: classifySeverity, evaluateSpo2, isEpisodeResolved
 *  (b) Escalation: shouldEscalate, EscalationManager
 *  (c) Engine SpO2: evaluateSpo2Reading, confirmAlert, resolveAlert
 *  (d) Dedup SpO2: no duplicate alerts for same severity
 *  (e) Detector BP: evaluateBp, resolveBpThresholds, buildBpAlertRecord
 *  (f) Engine BP: evaluateBpReading
 *  (g) BP Combined alerts (CA-05)
 *  (h) BP Special contexts (CA-04)
 *  (i) Detector HR: classifyHr, evaluateHr, isHrEpisodeResolved, computeHrTrend, buildHrAlertRecord
 *  (j) Engine HR: evaluateHrReading (dedup CA-05, resolución, tendencia CA-04)
 */
import {
  evaluateSpo2,
  classifySeverity,
  buildAlertRecord,
  isEpisodeResolved,
  evaluateBp,
  resolveBpThresholds,
  buildBpAlertRecord,
  classifyHr,
  evaluateHr,
  isHrEpisodeResolved,
  computeHrTrend,
  buildHrAlertRecord,
} from '../src/services/alerts/detector';
import {
  shouldEscalate,
  EscalationManager,
} from '../src/services/alerts/escalation';
import {AlertEngine} from '../src/services/alerts/engine';
import type {AlertSupabaseDeps} from '../src/services/alerts/engine';
import type {
  AlertRecord,
  AlertRecordInsert,
  Spo2Thresholds,
  BpThresholds,
  BpEvaluationInput,
  HrThresholds,
  HrEvaluationInput,
} from '../src/services/alerts/types';
import {
  DEFAULT_SPO2_THRESHOLDS,
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_HR_THRESHOLDS,
} from '../src/services/alerts/types';

// ═══════════════════════════════════════════
// (a) Detector: classifySeverity
// ═══════════════════════════════════════════

describe('classifySeverity', () => {
  const thresholds: Spo2Thresholds = {warningPercent: 90, criticalPercent: 85};

  test('SpO₂ >= 90 → null (no alert)', () => {
    expect(classifySeverity(95, thresholds)).toBeNull();
    expect(classifySeverity(90, thresholds)).toBeNull();
    expect(classifySeverity(100, thresholds)).toBeNull();
  });

  test('SpO₂ 85-89 → advertencia', () => {
    expect(classifySeverity(89, thresholds)).toBe('advertencia');
    expect(classifySeverity(87, thresholds)).toBe('advertencia');
    expect(classifySeverity(85, thresholds)).toBe('advertencia');
  });

  test('SpO₂ < 85 → critica', () => {
    expect(classifySeverity(84, thresholds)).toBe('critica');
    expect(classifySeverity(80, thresholds)).toBe('critica');
    expect(classifySeverity(70, thresholds)).toBe('critica');
  });

  test('uses default thresholds when none provided', () => {
    expect(classifySeverity(89)).toBe('advertencia');
    expect(classifySeverity(84)).toBe('critica');
  });
});

// ═══════════════════════════════════════════
// (a) Detector: evaluateSpo2
// ═══════════════════════════════════════════

describe('evaluateSpo2', () => {
  const thresholds: Spo2Thresholds = {warningPercent: 90, criticalPercent: 85};

  test('normal reading → no alert', () => {
    const result = evaluateSpo2({
      spo2Percent: 97,
      thresholds,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      readingTimestamp: '2026-08-18T12:00:00Z',
      dispositivoOrigen: 'wearable',
    });
    expect(result.shouldAlert).toBe(false);
    expect(result.severity).toBeNull();
  });

  test('low reading + no active alert → new episode', () => {
    const result = evaluateSpo2({
      spo2Percent: 88,
      thresholds,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      readingTimestamp: '2026-08-18T12:00:00Z',
      dispositivoOrigen: 'wearable',
    });
    expect(result.shouldAlert).toBe(true);
    expect(result.severity).toBe('advertencia');
    expect(result.isNewEpisode).toBe(true);
  });

  test('critical reading + no active alert → new critical episode', () => {
    const result = evaluateSpo2({
      spo2Percent: 82,
      thresholds,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      readingTimestamp: '2026-08-18T12:00:00Z',
      dispositivoOrigen: 'wearable',
    });
    expect(result.shouldAlert).toBe(true);
    expect(result.severity).toBe('critica');
    expect(result.isNewEpisode).toBe(true);
  });

  test('same severity + active alert → dedup (no new alert)', () => {
    const result = evaluateSpo2({
      spo2Percent: 88,
      thresholds,
      hasActiveAlert: true,
      activeAlertSeverity: 'advertencia',
      readingTimestamp: '2026-08-18T12:00:00Z',
      dispositivoOrigen: 'wearable',
    });
    expect(result.shouldAlert).toBe(false);
    expect(result.severity).toBe('advertencia');
    expect(result.isNewEpisode).toBe(false);
  });

  test('worse severity + active alert → escalation', () => {
    const result = evaluateSpo2({
      spo2Percent: 82,
      thresholds,
      hasActiveAlert: true,
      activeAlertSeverity: 'advertencia',
      readingTimestamp: '2026-08-18T12:00:00Z',
      dispositivoOrigen: 'wearable',
    });
    expect(result.shouldAlert).toBe(true);
    expect(result.severity).toBe('critica');
    expect(result.isNewEpisode).toBe(false);
  });

  test('better severity + active alert → no new alert', () => {
    const result = evaluateSpo2({
      spo2Percent: 88,
      thresholds,
      hasActiveAlert: true,
      activeAlertSeverity: 'critica',
      readingTimestamp: '2026-08-18T12:00:00Z',
      dispositivoOrigen: 'wearable',
    });
    expect(result.shouldAlert).toBe(false);
  });
});

// ═══════════════════════════════════════════
// (a) Detector: isEpisodeResolved
// ═══════════════════════════════════════════

describe('isEpisodeResolved', () => {
  test('SpO₂ >= warning threshold → resolved', () => {
    expect(isEpisodeResolved(90)).toBe(true);
    expect(isEpisodeResolved(95)).toBe(true);
  });

  test('SpO₂ < warning threshold → not resolved', () => {
    expect(isEpisodeResolved(89)).toBe(false);
    expect(isEpisodeResolved(80)).toBe(false);
  });
});

// ═══════════════════════════════════════════
// (a) Detector: buildAlertRecord
// ═══════════════════════════════════════════

describe('buildAlertRecord', () => {
  test('builds correct insert payload with titulo/mensaje/datos', () => {
    const input = {
      spo2Percent: 88,
      thresholds: DEFAULT_SPO2_THRESHOLDS,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      readingTimestamp: '2026-08-18T12:00:00Z',
      dispositivoOrigen: 'wearable',
    };
    const detection = {
      shouldAlert: true,
      severity: 'advertencia' as const,
      thresholdExceeded: 90,
      isNewEpisode: true,
    };

    const record = buildAlertRecord(input, detection, 'user-1', new Date('2026-08-18T12:00:00Z'));

    expect(record.id_usuario).toBe('user-1');
    expect(record.tipo).toBe('hipoxia');
    expect(record.severidad).toBe('advertencia');
    expect(record.titulo).toContain('SpO₂ baja');
    expect(record.mensaje).toContain('88%');
    expect(record.mensaje).toContain('90%');
    expect(record.datos).toEqual(expect.objectContaining({
      valor_registrado: 88,
      umbral_configurado: 90,
      dispositivo_origen: 'wearable',
      escalada: false,
    }));
    expect(record.leida_en).toBeUndefined(); // not set on insert
  });

  test('builds critical alert with correct titulo', () => {
    const input = {
      spo2Percent: 82,
      thresholds: DEFAULT_SPO2_THRESHOLDS,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      readingTimestamp: '2026-08-18T12:00:00Z',
      dispositivoOrigen: 'wearable',
    };
    const detection = {
      shouldAlert: true,
      severity: 'critica' as const,
      thresholdExceeded: 85,
      isNewEpisode: true,
    };

    const record = buildAlertRecord(input, detection, 'user-1', new Date('2026-08-18T12:00:00Z'));

    expect(record.titulo).toContain('crítica');
    expect(record.mensaje).toContain('82%');
    expect(record.mensaje).toContain('85%');
  });

  test('throws when called without alert-worthy detection', () => {
    const input = {
      spo2Percent: 95,
      thresholds: DEFAULT_SPO2_THRESHOLDS,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      readingTimestamp: '2026-08-18T12:00:00Z',
      dispositivoOrigen: 'wearable',
    };
    const detection = {
      shouldAlert: false,
      severity: null,
      thresholdExceeded: null,
      isNewEpisode: false,
    };

    expect(() => buildAlertRecord(input, detection, 'user-1')).toThrow();
  });
});

// ═══════════════════════════════════════════
// (b) Escalation: shouldEscalate
// ═══════════════════════════════════════════

describe('shouldEscalate', () => {
  const timeoutMs = 5 * 60 * 1000; // 5 minutes

  test('not yet time → false', () => {
    const generated = new Date('2026-08-18T12:00:00Z');
    const now = new Date('2026-08-18T12:04:00Z'); // 4 min elapsed
    expect(shouldEscalate(generated.toISOString(), timeoutMs, now)).toBe(false);
  });

  test('time elapsed → true', () => {
    const generated = new Date('2026-08-18T12:00:00Z');
    const now = new Date('2026-08-18T12:05:00Z'); // 5 min elapsed
    expect(shouldEscalate(generated.toISOString(), timeoutMs, now)).toBe(true);
  });

  test('exactly at boundary → true', () => {
    const generated = new Date('2026-08-18T12:00:00Z');
    const now = new Date('2026-08-18T12:05:00.001Z');
    expect(shouldEscalate(generated.toISOString(), timeoutMs, now)).toBe(true);
  });
});

// ═══════════════════════════════════════════
// (b) Escalation: EscalationManager
// ═══════════════════════════════════════════

describe('EscalationManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function makeAlert(overrides: Partial<AlertRecord> = {}): AlertRecord {
    return {
      id: 'a1',
      id_usuario: 'u1',
      id_dato_reloj: null,
      id_prediccion_riesgo: null,
      tipo: 'hipoxia',
      severidad: 'advertencia',
      titulo: 'Alerta: SpO₂ baja',
      mensaje: 'Saturación de oxígeno en 88%',
      datos: {valor_registrado: 88, umbral_configurado: 90, dispositivo_origen: 'wearable', escalada: false},
      leida_en: null,
      created_at: '2026-08-18T12:00:00Z',
      expira_en: null,
      status: 'activa',
      ...overrides,
    };
  }

  test('starts and fires escalation after timeout', async () => {
    const onEscalate = jest.fn();
    const updateDatos = jest.fn().mockResolvedValue(undefined);
    const mgr = new EscalationManager(
      {escalationTimeoutMs: 5000},
      onEscalate,
      updateDatos,
    );

    const alert = makeAlert();
    mgr.startEscalation(alert);
    expect(mgr.hasTimer('a1')).toBe(true);

    await jest.advanceTimersByTimeAsync(5000);

    expect(onEscalate).toHaveBeenCalledTimes(1);
    expect(onEscalate).toHaveBeenCalledWith(
      expect.objectContaining({
        datos: expect.objectContaining({escalada: true}),
      }),
    );
    expect(updateDatos).toHaveBeenCalledWith('a1', expect.objectContaining({escalada: true}));
    expect(mgr.hasTimer('a1')).toBe(false);
  });

  test('cancel prevents escalation', () => {
    const onEscalate = jest.fn();
    const mgr = new EscalationManager({escalationTimeoutMs: 5000}, onEscalate);

    const alert = makeAlert();
    mgr.startEscalation(alert);
    mgr.cancelEscalation('a1');

    jest.advanceTimersByTime(5000);

    expect(onEscalate).not.toHaveBeenCalled();
    expect(mgr.hasTimer('a1')).toBe(false);
  });

  test('dispose clears all timers', () => {
    const onEscalate = jest.fn();
    const mgr = new EscalationManager({escalationTimeoutMs: 5000}, onEscalate);

    const alert = makeAlert();
    mgr.startEscalation(alert);
    expect(mgr.activeTimers).toBe(1);

    mgr.dispose();
    expect(mgr.activeTimers).toBe(0);
  });
});

// ═══════════════════════════════════════════
// (c) Engine: AlertEngine integration
// ═══════════════════════════════════════════

function makeEngineDeps(overrides: Partial<AlertSupabaseDeps> = {}): AlertSupabaseDeps & {
  inserted: AlertRecordInsert[];
  markedRead: string[];
  updatedDatos: Array<{id: string; datos: Record<string, unknown>}>;
} {
  const inserted: AlertRecordInsert[] = [];
  const markedRead: string[] = [];
  const updatedDatos: Array<{id: string; datos: Record<string, unknown>}> = [];

  return {
    inserted,
    markedRead,
    updatedDatos,
    insertAlert: async (alert) => {
      inserted.push(alert);
      return {
        id: `alert-${inserted.length}`,
        ...alert,
        leida_en: null,
        created_at: new Date().toISOString(),
        status: 'activa',
      } as AlertRecord;
    },
    getActiveAlerts: async () => [],
    markAlertRead: async (alertId) => {
      markedRead.push(alertId);
    },
    updateAlertDatos: async (alertId, datos) => {
      updatedDatos.push({id: alertId, datos});
    },
    ...overrides,
  };
}

function makeAlertRecord(overrides: Partial<AlertRecord> = {}): AlertRecord {
  return {
    id: 'existing-1',
    id_usuario: 'u1',
    id_dato_reloj: null,
    id_prediccion_riesgo: null,
    tipo: 'hipoxia',
    severidad: 'advertencia',
    titulo: 'Alerta: SpO₂ baja',
    mensaje: 'Saturación de oxígeno en 88%',
    datos: {valor_registrado: 88, umbral_configurado: 90, dispositivo_origen: 'wearable', escalada: false},
    leida_en: null,
    created_at: '2026-08-18T12:00:00Z',
    expira_en: null,
    status: 'activa',
    ...overrides,
  };
}

describe('AlertEngine', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('evaluateSpo2Reading: normal SpO₂ → no alert', async () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    const result = await engine.evaluateSpo2Reading('u1', 97, 'wearable');
    expect(result).toBeNull();
    expect(deps.inserted).toHaveLength(0);

    engine.dispose();
  });

  test('evaluateSpo2Reading: low SpO₂ → generates alert', async () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    const onGenerated = jest.fn();
    engine.onGenerated(onGenerated);

    const alert = await engine.evaluateSpo2Reading('u1', 88, 'wearable');

    expect(alert).not.toBeNull();
    expect(alert!.severidad).toBe('advertencia');
    expect(alert!.titulo).toContain('SpO₂ baja');
    expect(alert!.datos).toEqual(expect.objectContaining({valor_registrado: 88}));
    expect(deps.inserted).toHaveLength(1);
    expect(onGenerated).toHaveBeenCalledTimes(1);

    engine.dispose();
  });

  test('evaluateSpo2Reading: critical SpO₂ → generates critical alert', async () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateSpo2Reading('u1', 82, 'wearable');

    expect(alert).not.toBeNull();
    expect(alert!.severidad).toBe('critica');

    engine.dispose();
  });

  test('evaluateSpo2Reading: dedup same severity', async () => {
    const existingAlert = makeAlertRecord();

    const deps = makeEngineDeps({
      getActiveAlerts: async () => [existingAlert],
    });
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateSpo2Reading('u1', 87, 'wearable');

    // Should NOT generate a new alert (dedup)
    expect(alert).toBeNull();
    expect(deps.inserted).toHaveLength(0);

    engine.dispose();
  });

  test('evaluateSpo2Reading: severity escalation within episode', async () => {
    const existingAlert = makeAlertRecord();

    const deps = makeEngineDeps({
      getActiveAlerts: async () => [existingAlert],
    });
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateSpo2Reading('u1', 82, 'wearable');

    // Should generate a new critical alert (escalation from warning to critical)
    expect(alert).not.toBeNull();
    expect(alert!.severidad).toBe('critica');

    engine.dispose();
  });

  test('evaluateSpo2Reading: episode resolved', async () => {
    const existingAlert = makeAlertRecord();

    const deps = makeEngineDeps({
      getActiveAlerts: async () => [existingAlert],
    });
    const engine = new AlertEngine(deps);

    const onResolved = jest.fn();
    engine.onResolved(onResolved);

    const alert = await engine.evaluateSpo2Reading('u1', 95, 'wearable');

    expect(alert).toBeNull();
    expect(deps.markedRead).toHaveLength(1);
    expect(deps.markedRead[0]).toBe('existing-1');
    expect(onResolved).toHaveBeenCalledTimes(1);

    engine.dispose();
  });

  test('confirmAlert: marks as read and cancels timer', async () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateSpo2Reading('u1', 88, 'wearable');
    expect(alert).not.toBeNull();

    await engine.confirmAlert(alert!.id);

    expect(deps.markedRead).toHaveLength(1);
    expect(deps.markedRead[0]).toBe(alert!.id);

    engine.dispose();
  });

  test('setThresholds updates config', () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    engine.setThresholds({warningPercent: 92});
    const config = engine.getConfig();
    expect(config.thresholds.warningPercent).toBe(92);
    expect(config.thresholds.criticalPercent).toBe(85); // unchanged

    engine.dispose();
  });
});

// ═══════════════════════════════════════════
// (e) Detector BP: evaluateBp
// ═══════════════════════════════════════════

describe('evaluateBp', () => {
  const bpThresholds: BpThresholds = {
    sistolicaWarning: 140,
    sistolicaCritical: 160,
    diastolicaWarning: 90,
    diastolicaCritical: 100,
    sistolicaLowWarning: 90,
    sistolicaLowCritical: 80,
    diastolicaLowWarning: 60,
    diastolicaLowCritical: 50,
  };

  function makeBpInput(overrides: Partial<BpEvaluationInput> = {}): BpEvaluationInput {
    return {
      sistolica: 120,
      diastolica: 80,
      thresholds: bpThresholds,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      readingTimestamp: '2026-08-21T12:00:00Z',
      dispositivoOrigen: 'wearable',
      ...overrides,
    };
  }

  test('normal BP → no alert', () => {
    const result = evaluateBp(makeBpInput({sistolica: 120, diastolica: 80}));
    expect(result.shouldAlert).toBe(false);
    expect(result.severity).toBeNull();
    expect(result.sistolica.shouldAlert).toBe(false);
    expect(result.diastolica.shouldAlert).toBe(false);
  });

  test('only systolic high → advertencia', () => {
    const result = evaluateBp(makeBpInput({sistolica: 145, diastolica: 80}));
    expect(result.shouldAlert).toBe(true);
    expect(result.severity).toBe('advertencia');
    expect(result.sistolica.shouldAlert).toBe(true);
    expect(result.diastolica.shouldAlert).toBe(false);
    expect(result.isCombined).toBe(false);
  });

  test('only diastolic high → advertencia', () => {
    const result = evaluateBp(makeBpInput({sistolica: 120, diastolica: 95}));
    expect(result.shouldAlert).toBe(true);
    expect(result.severity).toBe('advertencia');
    expect(result.sistolica.shouldAlert).toBe(false);
    expect(result.diastolica.shouldAlert).toBe(true);
  });

  test('both high → combined alert with max severity (CA-05)', () => {
    const result = evaluateBp(makeBpInput({sistolica: 145, diastolica: 95}));
    expect(result.shouldAlert).toBe(true);
    expect(result.isCombined).toBe(true);
    expect(result.sistolica.shouldAlert).toBe(true);
    expect(result.diastolica.shouldAlert).toBe(true);
  });

  test('systolic critical + diastolic warning → severity is critica', () => {
    const result = evaluateBp(makeBpInput({sistolica: 165, diastolica: 95}));
    expect(result.shouldAlert).toBe(true);
    expect(result.severity).toBe('critica');
    expect(result.isCombined).toBe(true);
  });

  test('only systolic low → advertencia (hypotension)', () => {
    const result = evaluateBp(makeBpInput({sistolica: 85, diastolica: 70}));
    expect(result.shouldAlert).toBe(true);
    expect(result.severity).toBe('advertencia');
    expect(result.sistolica.shouldAlert).toBe(true);
    expect(result.diastolica.shouldAlert).toBe(false);
  });

  test('only diastolic low → advertencia (hypotension)', () => {
    const result = evaluateBp(makeBpInput({sistolica: 110, diastolica: 55}));
    expect(result.shouldAlert).toBe(true);
    expect(result.severity).toBe('advertencia');
    expect(result.sistolica.shouldAlert).toBe(false);
    expect(result.diastolica.shouldAlert).toBe(true);
  });

  test('both low → combined alert (CA-05)', () => {
    const result = evaluateBp(makeBpInput({sistolica: 85, diastolica: 55}));
    expect(result.shouldAlert).toBe(true);
    expect(result.isCombined).toBe(true);
  });

  test('systolic critical → critica', () => {
    const result = evaluateBp(makeBpInput({sistolica: 165, diastolica: 80}));
    expect(result.shouldAlert).toBe(true);
    expect(result.severity).toBe('critica');
    expect(result.sistolica.thresholdExceeded).toBe(160);
  });

  test('diastolic critical → critica', () => {
    const result = evaluateBp(makeBpInput({sistolica: 120, diastolica: 105}));
    expect(result.shouldAlert).toBe(true);
    expect(result.severity).toBe('critica');
    expect(result.diastolica.thresholdExceeded).toBe(100);
  });

  test('dedup: same severity + active alert → no new alert', () => {
    const result = evaluateBp(makeBpInput({
      sistolica: 145,
      diastolica: 80,
      hasActiveAlert: true,
      activeAlertSeverity: 'advertencia',
    }));
    expect(result.shouldAlert).toBe(false);
    expect(result.isNewEpisode).toBe(false);
  });

  test('escalation: worse severity + active alert → new alert', () => {
    const result = evaluateBp(makeBpInput({
      sistolica: 165,
      diastolica: 80,
      hasActiveAlert: true,
      activeAlertSeverity: 'advertencia',
    }));
    expect(result.shouldAlert).toBe(true);
    expect(result.severity).toBe('critica');
    expect(result.isNewEpisode).toBe(false);
  });

  test('no active alert → new episode', () => {
    const result = evaluateBp(makeBpInput({
      sistolica: 145,
      diastolica: 80,
      hasActiveAlert: false,
    }));
    expect(result.shouldAlert).toBe(true);
    expect(result.isNewEpisode).toBe(true);
  });
});

// ═══════════════════════════════════════════
// (e) Detector BP: resolveBpThresholds
// ═══════════════════════════════════════════

describe('resolveBpThresholds', () => {
  test('normal context → base thresholds', () => {
    const result = resolveBpThresholds(DEFAULT_BP_THRESHOLDS, 'normal');
    expect(result).toEqual(DEFAULT_BP_THRESHOLDS);
  });

  test('post_medicacion context → lower low thresholds', () => {
    const result = resolveBpThresholds(DEFAULT_BP_THRESHOLDS, 'post_medicacion');
    expect(result.sistolicaLowWarning).toBe(85);
    expect(result.sistolicaLowCritical).toBe(75);
    expect(result.sistolicaWarning).toBe(140); // unchanged
  });

  test('reposo_nocturno context → lower thresholds', () => {
    const result = resolveBpThresholds(DEFAULT_BP_THRESHOLDS, 'reposo_nocturno');
    expect(result.sistolicaLowWarning).toBe(80);
    expect(result.sistolicaLowCritical).toBe(70);
    expect(result.diastolicaLowWarning).toBe(50);
    expect(result.diastolicaLowCritical).toBe(45);
  });
});

// ═══════════════════════════════════════════
// (e) Detector BP: buildBpAlertRecord
// ═══════════════════════════════════════════

describe('buildBpAlertRecord', () => {
  const bpThresholds: BpThresholds = {
    sistolicaWarning: 140,
    sistolicaCritical: 160,
    diastolicaWarning: 90,
    diastolicaCritical: 100,
    sistolicaLowWarning: 90,
    sistolicaLowCritical: 80,
    diastolicaLowWarning: 60,
    diastolicaLowCritical: 50,
  };

  test('builds hypertension alert', () => {
    const input: BpEvaluationInput = {
      sistolica: 145,
      diastolica: 80,
      thresholds: bpThresholds,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      readingTimestamp: '2026-08-21T12:00:00Z',
      dispositivoOrigen: 'wearable',
    };
    const detection = evaluateBp(input);

    const record = buildBpAlertRecord(input, detection, 'user-1', new Date('2026-08-21T12:00:00Z'));

    expect(record.id_usuario).toBe('user-1');
    expect(record.tipo).toBe('hipertension');
    expect(record.severidad).toBe('advertencia');
    expect(record.titulo).toContain('Presion arterial alta');
    expect(record.mensaje).toContain('145');
    expect(record.datos).toEqual(expect.objectContaining({
      bp_sistolica: 145,
      bp_diastolica: 80,
      dispositivo_origen: 'wearable',
    }));
  });

  test('builds hypotension alert', () => {
    const input: BpEvaluationInput = {
      sistolica: 85,
      diastolica: 70,
      thresholds: bpThresholds,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      readingTimestamp: '2026-08-21T12:00:00Z',
      dispositivoOrigen: 'wearable',
    };
    const detection = evaluateBp(input);

    const record = buildBpAlertRecord(input, detection, 'user-1', new Date('2026-08-21T12:00:00Z'));

    expect(record.tipo).toBe('hipotension');
    expect(record.titulo).toContain('Presion arterial baja');
  });

  test('builds combined alert with both values', () => {
    const input: BpEvaluationInput = {
      sistolica: 145,
      diastolica: 95,
      thresholds: bpThresholds,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      readingTimestamp: '2026-08-21T12:00:00Z',
      dispositivoOrigen: 'wearable',
    };
    const detection = evaluateBp(input);

    const record = buildBpAlertRecord(input, detection, 'user-1', new Date('2026-08-21T12:00:00Z'));

    expect(record.titulo).toContain('combinada');
    expect(record.mensaje).toContain('Ambos valores fuera de rango');
    expect(record.datos).toEqual(expect.objectContaining({is_combined: true}));
  });

  test('includes context info for special contexts', () => {
    const input: BpEvaluationInput = {
      sistolica: 145,
      diastolica: 80,
      thresholds: bpThresholds,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      readingTimestamp: '2026-08-21T12:00:00Z',
      dispositivoOrigen: 'wearable',
      contexto: 'post_medicacion',
    };
    const detection = evaluateBp(input);

    const record = buildBpAlertRecord(input, detection, 'user-1', new Date('2026-08-21T12:00:00Z'));

    expect(record.mensaje).toContain('post-medicacion');
    expect(record.datos).toEqual(expect.objectContaining({contexto: 'post_medicacion'}));
  });

  test('throws when called without alert-worthy detection', () => {
    const input: BpEvaluationInput = {
      sistolica: 120,
      diastolica: 80,
      thresholds: bpThresholds,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      readingTimestamp: '2026-08-21T12:00:00Z',
      dispositivoOrigen: 'wearable',
    };
    const detection = evaluateBp(input);

    expect(() => buildBpAlertRecord(input, detection, 'user-1')).toThrow();
  });
});

// ═══════════════════════════════════════════
// (f) Engine BP: AlertEngine.evaluateBpReading
// ═══════════════════════════════════════════

describe('AlertEngine BP', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('evaluateBpReading: normal BP → no alert', async () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    const result = await engine.evaluateBpReading('u1', 120, 80, 'wearable');
    expect(result).toBeNull();
    expect(deps.inserted).toHaveLength(0);

    engine.dispose();
  });

  test('evaluateBpReading: high systolic → generates hypertension alert', async () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    const onGenerated = jest.fn();
    engine.onGenerated(onGenerated);

    const alert = await engine.evaluateBpReading('u1', 145, 80, 'wearable');

    expect(alert).not.toBeNull();
    expect(alert!.tipo).toBe('hipertension');
    expect(alert!.severidad).toBe('advertencia');
    expect(alert!.titulo).toContain('Presion arterial alta');
    expect(deps.inserted).toHaveLength(1);
    expect(onGenerated).toHaveBeenCalledTimes(1);

    engine.dispose();
  });

  test('evaluateBpReading: combined high → generates combined alert', async () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateBpReading('u1', 145, 95, 'wearable');

    expect(alert).not.toBeNull();
    expect(alert!.titulo).toContain('combinada');
    expect(alert!.datos).toEqual(expect.objectContaining({is_combined: true}));

    engine.dispose();
  });

  test('evaluateBpReading: dedup same severity', async () => {
    const existingAlert = makeAlertRecord({tipo: 'hipertension'});
    const deps = makeEngineDeps({
      getActiveAlerts: async () => [existingAlert],
    });
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateBpReading('u1', 145, 80, 'wearable');

    // Should NOT generate a new alert (dedup)
    expect(alert).toBeNull();
    expect(deps.inserted).toHaveLength(0);

    engine.dispose();
  });

  test('evaluateBpReading: episode resolved', async () => {
    const existingAlert = makeAlertRecord({tipo: 'hipertension'});
    const deps = makeEngineDeps({
      getActiveAlerts: async () => [existingAlert],
    });
    const engine = new AlertEngine(deps);

    const onResolved = jest.fn();
    engine.onResolved(onResolved);

    const alert = await engine.evaluateBpReading('u1', 120, 80, 'wearable');

    expect(alert).toBeNull();
    expect(deps.markedRead).toHaveLength(1);
    expect(deps.markedRead[0]).toBe('existing-1');
    expect(onResolved).toHaveBeenCalledTimes(1);

    engine.dispose();
  });

  test('evaluateBpReading: special context post_medicacion', async () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    // With post_medicacion, systolic 86 is NOT hypotension (low threshold becomes 85)
    const alert = await engine.evaluateBpReading('u1', 86, 70, 'wearable', 'post_medicacion');

    // Should NOT generate alert (86 > 85 post_medicacion threshold)
    expect(alert).toBeNull();

    engine.dispose();
  });
});

// ═══════════════════════════════════════════
// (i) Detector HR (HU-42)
// ═══════════════════════════════════════════

const HR: HrThresholds = DEFAULT_HR_THRESHOLDS;

function makeHrInput(overrides: Partial<HrEvaluationInput> = {}): HrEvaluationInput {
  return {
    bpm: 70,
    thresholds: HR,
    hasActiveAlert: false,
    activeAlertSeverity: null,
    ...overrides,
  };
}

describe('classifyHr', () => {
  test('FC normal → null', () => {
    expect(classifyHr(70, HR)).toEqual({tipo: null, severity: null, thresholdExceeded: null});
    expect(classifyHr(100, HR).tipo).toBeNull();
    expect(classifyHr(50, HR).tipo).toBeNull();
  });

  test('taquicardia advertencia (>100) y critica (>=120)', () => {
    expect(classifyHr(101, HR)).toEqual({tipo: 'taquicardia', severity: 'advertencia', thresholdExceeded: 100});
    expect(classifyHr(119, HR).severity).toBe('advertencia');
    expect(classifyHr(120, HR)).toEqual({tipo: 'taquicardia', severity: 'critica', thresholdExceeded: 120});
  });

  test('bradicardia advertencia (<50) y critica (<=40)', () => {
    expect(classifyHr(49, HR)).toEqual({tipo: 'bradicardia', severity: 'advertencia', thresholdExceeded: 50});
    expect(classifyHr(41, HR).severity).toBe('advertencia');
    expect(classifyHr(40, HR)).toEqual({tipo: 'bradicardia', severity: 'critica', thresholdExceeded: 40});
  });
});

describe('evaluateHr', () => {
  test('FC normal → no alert', () => {
    const r = evaluateHr(makeHrInput({bpm: 75}));
    expect(r.shouldAlert).toBe(false);
    expect(r.tipo).toBeNull();
  });

  test('taquicardia sin alerta activa → nueva alerta (isNewEpisode)', () => {
    const r = evaluateHr(makeHrInput({bpm: 110}));
    expect(r.shouldAlert).toBe(true);
    expect(r.tipo).toBe('taquicardia');
    expect(r.severity).toBe('advertencia');
    expect(r.thresholdExceeded).toBe(100);
    expect(r.isNewEpisode).toBe(true);
  });

  test('bradicardia sin alerta activa → nueva alerta', () => {
    const r = evaluateHr(makeHrInput({bpm: 45}));
    expect(r.shouldAlert).toBe(true);
    expect(r.tipo).toBe('bradicardia');
    expect(r.severity).toBe('advertencia');
    expect(r.thresholdExceeded).toBe(50);
  });

  test('dedup CA-05: misma severidad con alerta activa → no duplica', () => {
    const r = evaluateHr(
      makeHrInput({bpm: 105, hasActiveAlert: true, activeAlertSeverity: 'advertencia'}),
    );
    expect(r.shouldAlert).toBe(false);
  });

  test('escalacion de severidad dentro del episodio: advertencia→critica sí alerta', () => {
    const r = evaluateHr(
      makeHrInput({bpm: 125, hasActiveAlert: true, activeAlertSeverity: 'advertencia'}),
    );
    expect(r.shouldAlert).toBe(true);
    expect(r.severity).toBe('critica');
    expect(r.isNewEpisode).toBe(false);
  });
});

describe('isHrEpisodeResolved', () => {
  test('FC en rango normal → resuelto', () => {
    expect(isHrEpisodeResolved(70, HR)).toBe(true);
    expect(isHrEpisodeResolved(100, HR)).toBe(true);
    expect(isHrEpisodeResolved(50, HR)).toBe(true);
  });

  test('FC fuera de rango → NO resuelto', () => {
    expect(isHrEpisodeResolved(101, HR)).toBe(false);
    expect(isHrEpisodeResolved(49, HR)).toBe(false);
  });
});

describe('computeHrTrend', () => {
  const now = new Date('2026-08-21T12:00:00Z');
  const min = (n: number) => new Date(now.getTime() - n * 60_000).toISOString();

  test('menos de 2 lecturas → estable', () => {
    expect(computeHrTrend([], now)).toBe('estable');
    expect(computeHrTrend([{bpm: 80, recordedAt: min(2)}], now)).toBe('estable');
  });

  test('sube más de +5 lpm → subiendo', () => {
    const readings = [
      {bpm: 80, recordedAt: min(4)},
      {bpm: 88, recordedAt: min(2)},
      {bpm: 95, recordedAt: min(1)},
    ];
    expect(computeHrTrend(readings, now)).toBe('subiendo');
  });

  test('baja más de -5 lpm → bajando', () => {
    const readings = [
      {bpm: 95, recordedAt: min(4)},
      {bpm: 85, recordedAt: min(1)},
    ];
    expect(computeHrTrend(readings, now)).toBe('bajando');
  });

  test('delta pequeño → estable', () => {
    const readings = [
      {bpm: 82, recordedAt: min(4)},
      {bpm: 84, recordedAt: min(1)},
    ];
    expect(computeHrTrend(readings, now)).toBe('estable');
  });

  test('lecturas fuera de la ventana de 5 min se ignoran', () => {
    const readings = [
      {bpm: 60, recordedAt: min(30)}, // fuera de ventana
      {bpm: 130, recordedAt: min(10)}, // fuera de ventana
      {bpm: 81, recordedAt: min(3)},
      {bpm: 83, recordedAt: min(1)},
    ];
    // Solo quedan 2 en ventana: 81→83 delta 2 → estable
    expect(computeHrTrend(readings, now)).toBe('estable');
  });
});

describe('buildHrAlertRecord', () => {
  test('taquicardia: titulo/mensaje nombran tipo, valor, umbral y tendencia (CA-03+CA-04)', () => {
    const detection = evaluateHr(makeHrInput({bpm: 115}));
    const record = buildHrAlertRecord(
      makeHrInput({bpm: 115}),
      detection,
      'u1',
      'subiendo',
      new Date('2026-08-21T12:00:00Z'),
    );

    expect(record.tipo).toBe('taquicardia');
    expect(record.severidad).toBe('advertencia');
    expect(record.titulo).toContain('taquicardia');
    expect(record.mensaje).toContain('115 lpm');
    expect(record.mensaje).toContain('Tendencia ultimos 5 min: subiendo');
    expect(record.datos).toMatchObject({
      valor_registrado: 115,
      umbral_configurado: 100,
      tendencia: 'subiendo',
      escalada: false,
    });
  });

  test('bradicardia critica: titulo y umbral correctos', () => {
    const detection = evaluateHr(makeHrInput({bpm: 38}));
    const record = buildHrAlertRecord(makeHrInput({bpm: 38}), detection, 'u1');

    expect(record.tipo).toBe('bradicardia');
    expect(record.severidad).toBe('critica');
    expect(record.titulo).toContain('bradicardia');
    expect(record.datos).toMatchObject({umbral_configurado: 40});
  });

  test('lanza si se invoca sin detección con alerta', () => {
    expect(() =>
      buildHrAlertRecord(
        makeHrInput({bpm: 70}),
        {shouldAlert: false, tipo: null, severity: null, thresholdExceeded: null, isNewEpisode: false},
        'u1',
      ),
    ).toThrow();
  });
});

// ═══════════════════════════════════════════
// (j) Engine HR: evaluateHrReading (HU-42)
// ═══════════════════════════════════════════

describe('AlertEngine HR', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('FC normal → no alert', async () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    const result = await engine.evaluateHrReading('u1', 72, 'wearable');
    expect(result).toBeNull();
    expect(deps.inserted).toHaveLength(0);

    engine.dispose();
  });

  test('taquicardia → genera alerta tipo taquicardia con tendencia en datos', async () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateHrReading('u1', 115, 'wearable');
    expect(alert).not.toBeNull();
    expect(alert!.tipo).toBe('taquicardia');
    expect(alert!.severidad).toBe('advertencia');
    expect(deps.inserted).toHaveLength(1);
    expect(deps.inserted[0].datos).toMatchObject({valor_registrado: 115, tendencia: 'estable'});

    engine.dispose();
  });

  test('dedup CA-05: condición persistente con alerta activa → NO duplica', async () => {
    const existingAlert = makeAlertRecord({tipo: 'taquicardia', severidad: 'advertencia'});
    const deps = makeEngineDeps({
      getActiveAlerts: async () => [existingAlert],
    });
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateHrReading('u1', 108, 'wearable');
    expect(alert).toBeNull();
    expect(deps.inserted).toHaveLength(0);

    engine.dispose();
  });

  test('resolución de episodio: FC vuelve a rango normal → marca leída', async () => {
    const existingAlert = makeAlertRecord({tipo: 'taquicardia', severidad: 'advertencia'});
    const deps = makeEngineDeps({
      getActiveAlerts: async () => [existingAlert],
    });
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateHrReading('u1', 75, 'wearable');
    expect(alert).toBeNull();
    expect(deps.markedRead).toContain(existingAlert.id);

    engine.dispose();
  });

  test('usa getRecentHeartRates para calcular la tendencia (CA-04)', async () => {
    const now = Date.now();
    const deps = makeEngineDeps({
      getRecentHeartRates: async () => [
        {bpm: 80, recordedAt: new Date(now - 4 * 60_000).toISOString()},
        {bpm: 96, recordedAt: new Date(now - 1 * 60_000).toISOString()},
      ],
    });
    const engine = new AlertEngine(deps);

    await engine.evaluateHrReading('u1', 115, 'wearable');
    expect(deps.inserted[0].datos).toMatchObject({tendencia: 'subiendo'});

    engine.dispose();
  });

  test('si getRecentHeartRates falla → tendencia estable y no bloquea la alerta', async () => {
    const deps = makeEngineDeps({
      getRecentHeartRates: async () => {
        throw new Error('supabase down');
      },
    });
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateHrReading('u1', 115, 'wearable');
    expect(alert).not.toBeNull();
    expect(deps.inserted[0].datos).toMatchObject({tendencia: 'estable'});

    engine.dispose();
  });
});
