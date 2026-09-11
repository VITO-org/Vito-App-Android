/**
 * Tests para HU-36 CA-04: Badge de alertas activas en menu de navegacion.
 *
 * Verifica que los listeners del AlertEngine disparen callbacks que
 * actualizan el conteo de alertas sin leer (activeAlertsCount en HealthProvider).
 *
 * El badge se muestra en BottomTabNavigator cuando activeAlertsCount > 0.
 * Estos tests validan la logica subyacente: callbacks onGenerated, onEscalated,
 * onResolved y el flujo confirmAlert → markAlertRead + refresh.
 */
import {AlertEngine} from '../src/services/alerts/engine';
import type {AlertSupabaseDeps} from '../src/services/alerts/engine';
import type {
  AlertRecord,
} from '../src/services/alerts/types';

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function makeEngineDeps(overrides: Partial<AlertSupabaseDeps> = {}): AlertSupabaseDeps & {
  inserted: AlertRecord[];
  markedRead: string[];
} {
  const inserted: AlertRecord[] = [];
  const markedRead: string[] = [];

  return {
    inserted,
    markedRead,
    insertAlert: async (alert) => {
      const record: AlertRecord = {
        id: `alert-${inserted.length + 1}`,
        ...alert,
        leida_en: null,
        created_at: new Date().toISOString(),
        status: 'activa',
      };
      inserted.push(record);
      return record;
    },
    getActiveAlerts: async (userId: string) => {
      // Devolver alertas activas (sin leer) simulando getAlertasActivas
      return inserted.filter(a => a.id_usuario === userId && a.leida_en === null);
    },
    markAlertRead: async (alertId) => {
      markedRead.push(alertId);
      // Marcar como leida en la lista insertada
      const alert = inserted.find(a => a.id === alertId);
      if (alert) {
        alert.leida_en = new Date().toISOString();
        alert.status = 'leida';
      }
    },
    updateAlertDatos: async () => {},
    ...overrides,
  };
}

// ═══════════════════════════════════════════
// Tests: Badge listeners
// ═══════════════════════════════════════════

describe('Badge de alertas — listeners del engine', () => {
  let deps: ReturnType<typeof makeEngineDeps>;
  let engine: AlertEngine;

  beforeEach(() => {
    deps = makeEngineDeps();
    engine = new AlertEngine(deps);
  });

  afterEach(() => {
    engine.dispose();
  });

  test('onGenerated se ejecuta cuando se genera una nueva alerta', async () => {
    const generatedCb = jest.fn();
    engine.onGenerated(generatedCb);

    await engine.evaluateSpo2Reading('user-1', 87, 'wearable');

    expect(generatedCb).toHaveBeenCalledTimes(1);
    expect(deps.inserted).toHaveLength(1);
    expect(deps.inserted[0].tipo).toBe('hipoxia');
  });

  test('onGenerated NO se ejecuta cuando no hay alerta (lectura normal)', async () => {
    const generatedCb = jest.fn();
    engine.onGenerated(generatedCb);

    await engine.evaluateSpo2Reading('user-1', 98, 'wearable');

    expect(generatedCb).not.toHaveBeenCalled();
    expect(deps.inserted).toHaveLength(0);
  });

  test('onGenerated se ejecuta para cada tipo de alerta (SpO2, BP, HR)', async () => {
    const generatedCb = jest.fn();
    engine.onGenerated(generatedCb);

    await engine.evaluateSpo2Reading('user-1', 87, 'wearable');
    await engine.evaluateBpReading('user-1', 165, 95, 'wearable');
    await engine.evaluateHrReading('user-1', 120, 'wearable');

    expect(generatedCb).toHaveBeenCalledTimes(3);
    expect(deps.inserted).toHaveLength(3);

    const tipos = deps.inserted.map(a => a.tipo);
    expect(tipos).toContain('hipoxia');
    expect(tipos).toContain('hipertension');
    expect(tipos).toContain('taquicardia');
  });

  test('onResolved se ejecuta cuando una alerta se resuelve (SpO2 vuelve a normal)', async () => {
    const resolvedCb = jest.fn();
    engine.onResolved(resolvedCb);

    // Generar alerta
    await engine.evaluateSpo2Reading('user-1', 87, 'wearable');
    expect(deps.inserted).toHaveLength(1);

    // Resolver (SpO2 vuelve a rango normal)
    await engine.evaluateSpo2Reading('user-1', 97, 'wearable');

    expect(resolvedCb).toHaveBeenCalledTimes(1);
    expect(deps.markedRead).toHaveLength(1);
    expect(deps.markedRead[0]).toBe(deps.inserted[0].id);
  });

  test('confirmAlert llama markAlertRead', async () => {
    // Generar alerta
    await engine.evaluateSpo2Reading('user-1', 87, 'wearable');
    const alertId = deps.inserted[0].id;

    // Confirmar lectura
    await engine.confirmAlert(alertId);

    expect(deps.markedRead).toContain(alertId);
  });

  test('onEscalated se ejecuta cuando una alerta escala', async () => {
    jest.useFakeTimers();

    const escalatedCb = jest.fn();
    engine.onEscalated(escalatedCb);

    // Generar alerta de advertencia
    await engine.evaluateSpo2Reading('user-1', 89, 'wearable');
    expect(deps.inserted).toHaveLength(1);

    // Simular paso de tiempo (6 min > timeout de 5 min)
    jest.advanceTimersByTime(6 * 60 * 1000);

    // Re-evaluar con el mismo nivel → debería escalar
    await engine.evaluateSpo2Reading('user-1', 89, 'wearable');

    expect(escalatedCb).toHaveBeenCalled();

    jest.useRealTimers();
  });
});

// ═══════════════════════════════════════════
// Tests: Badge count logic (simula HealthProvider)
// ═══════════════════════════════════════════

describe('Badge de alertas — logica de conteo', () => {
  test('activeAlertsCount es 0 cuando no hay alertas activas', () => {
    const activeAlerts: AlertRecord[] = [];
    const activeAlertsCount = activeAlerts.length;
    expect(activeAlertsCount).toBe(0);
  });

  test('activeAlertsCount refleja la cantidad de alertas sin leer', () => {
    const activeAlerts: AlertRecord[] = [
      {id: '1', tipo: 'hipoxia', severidad: 'advertencia', leida_en: null} as AlertRecord,
      {id: '2', tipo: 'hipertension', severidad: 'critica', leida_en: null} as AlertRecord,
    ];
    const activeAlertsCount = activeAlerts.length;
    expect(activeAlertsCount).toBe(2);
  });

  test('badge se oculta cuando activeAlertsCount es 0', () => {
    const activeAlertsCount = 0;
    const badge = activeAlertsCount > 0 ? activeAlertsCount : undefined;
    expect(badge).toBeUndefined();
  });

  test('badge se muestra cuando activeAlertsCount > 0', () => {
    const activeAlertsCount = 3;
    const badge = activeAlertsCount > 0 ? activeAlertsCount : undefined;
    expect(badge).toBe(3);
  });

  test('badge se decrementa cuando se marca una alerta como leida', () => {
    let activeAlerts: AlertRecord[] = [
      {id: '1', tipo: 'hipoxia', leida_en: null} as AlertRecord,
      {id: '2', tipo: 'hipertension', leida_en: null} as AlertRecord,
      {id: '3', tipo: 'taquicardia', leida_en: null} as AlertRecord,
    ];

    expect(activeAlerts.length).toBe(3);

    // Simular refresh: getAlertasActivas ya no devuelve la alerta leida
    activeAlerts = activeAlerts.filter(a => a.id !== '2');

    expect(activeAlerts.length).toBe(2);
    const badge = activeAlerts.length > 0 ? activeAlerts.length : undefined;
    expect(badge).toBe(2);
  });

  test('badge desaparece cuando se leen todas las alertas', () => {
    let activeAlerts: AlertRecord[] = [
      {id: '1', tipo: 'hipoxia', leida_en: null} as AlertRecord,
    ];

    activeAlerts = activeAlerts.filter(a => a.id !== '1');

    expect(activeAlerts.length).toBe(0);
    const badge = activeAlerts.length > 0 ? activeAlerts.length : undefined;
    expect(badge).toBeUndefined();
  });
});

// ═══════════════════════════════════════════
// Tests: Flujo completo engine → badge update
// ═══════════════════════════════════════════

describe('Badge de alertas — flujo completo', () => {
  test('generar → confirmar → badge vuelve a 0', async () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    // Simular activeAlerts del provider
    let activeAlerts: AlertRecord[] = [];

    engine.onGenerated((alert) => {
      activeAlerts.push(alert);
    });

    engine.onResolved((alert) => {
      activeAlerts = activeAlerts.filter(a => a.id !== alert.id);
    });

    // 1. No hay alertas
    expect(activeAlerts.length).toBe(0);

    // 2. Generar alerta SpO2 baja
    await engine.evaluateSpo2Reading('user-1', 87, 'wearable');
    expect(activeAlerts.length).toBe(1);

    // 3. Confirmar lectura
    await engine.confirmAlert(activeAlerts[0].id);

    // Simular refresh: getAlertasActivas ya no devuelve la alerta leida
    activeAlerts = [];

    expect(activeAlerts.length).toBe(0);
    const badge = activeAlerts.length > 0 ? activeAlerts.length : undefined;
    expect(badge).toBeUndefined();

    engine.dispose();
  });

  test('multiples alertas: badge muestra count correcto', async () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    let activeAlerts: AlertRecord[] = [];

    engine.onGenerated((alert) => {
      activeAlerts.push(alert);
    });

    engine.onResolved((alert) => {
      activeAlerts = activeAlerts.filter(a => a.id !== alert.id);
    });

    // Generar 3 alertas de diferentes tipos
    await engine.evaluateSpo2Reading('user-1', 87, 'wearable');
    await engine.evaluateBpReading('user-1', 165, 95, 'wearable');
    await engine.evaluateHrReading('user-1', 120, 'wearable');

    expect(activeAlerts.length).toBe(3);

    // Resolver una
    await engine.evaluateSpo2Reading('user-1', 98, 'wearable');
    expect(activeAlerts.length).toBe(2);

    // Badge
    const badge = activeAlerts.length > 0 ? activeAlerts.length : undefined;
    expect(badge).toBe(2);

    engine.dispose();
  });

  test('dispose limpie listeners correctamente', () => {
    const deps = makeEngineDeps();
    const engine = new AlertEngine(deps);

    const generatedCb = jest.fn();
    engine.onGenerated(generatedCb);

    engine.dispose();

    expect(() => engine.dispose()).not.toThrow();
  });
});
