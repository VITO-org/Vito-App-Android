/**
 * Tests del módulo de alertas HU-41 — Alerta por hipoxia (SpO₂ baja).
 *
 * Adapted to new Supabase schema (2026-08-20):
 * - Table `alerta` with titulo, mensaje, datos jsonb, leida_en
 * - Lifecycle: read/unread (leida_en) instead of state machine
 * - Escalation tracked in datos jsonb
 *
 * Cubre:
 *  (a) Detector: classifySeverity, evaluateSpo2, isEpisodeResolved
 *  (b) Escalation: shouldEscalate, EscalationManager
 *  (c) Engine: evaluateSpo2Reading, confirmAlert, resolveAlert
 *  (d) Dedup: no duplicate alerts for same severity
 *  (e) Severity escalation within same episode
 */
import {
  evaluateSpo2,
  classifySeverity,
  buildAlertRecord,
  isEpisodeResolved,
} from '../src/services/alerts/detector';
import {
  shouldEscalate,
  EscalationManager,
} from '../src/services/alerts/escalation';
import {AlertEngine} from '../src/services/alerts/engine';
import type {AlertSupabaseDeps} from '../src/services/alerts/engine';
import type {AlertRecord, AlertRecordInsert, Spo2Thresholds} from '../src/services/alerts/types';
import {DEFAULT_SPO2_THRESHOLDS} from '../src/services/alerts/types';

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
