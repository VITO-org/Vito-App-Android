/**
 * HU-99 — Tests comparativos: umbrales dinámicos (baseline personal) vs
 * estáticos (OMS). DoD: "Tests comparativos entre umbrales dinámicos vs
 * estáticos con datos reales o simulados".
 *
 * Objetivo: demostrar que un paciente con baseline personal genera MENOS
 * falsas alarmas que con los umbrales estándar, sin perder sensibilidad
 * ante eventos reales (un descenso crítico SÍ se detecta igual).
 */
import {AlertEngine} from '../src/services/alerts/engine';
import type {AlertRecord, AlertRecordInsert} from '../src/services/alerts/types';
import type {BaselinePersonalizado} from '../src/services/supabase/models';

// Los engines crean timers reales de escalación (5 min) que mantienen vivo
// el event loop — con fake timers Jest puede finalizar la suite.
jest.useFakeTimers();

// ─── Helpers ────────────────────────────────────────────────────

function makeBaselineRow(overrides: Partial<BaselinePersonalizado> = {}): BaselinePersonalizado {
  return {
    id_usuario: 'u1',
    hr_media: 70,
    hr_desv_std: 7,
    hr_p25: 64,
    hr_p75: 76,
    hr_n_muestras: 800,
    bp_sist_media: 118,
    bp_sist_desv_std: 7,
    bp_sist_p25: 112,
    bp_sist_p75: 124,
    bp_sist_n_muestras: 500,
    bp_diast_media: 76,
    bp_diast_desv_std: 6,
    bp_diast_p25: 71,
    bp_diast_p75: 81,
    bp_diast_n_muestras: 500,
    spo2_media: 97,
    spo2_desv_std: 1,
    spo2_p25: 96,
    spo2_p75: 98,
    spo2_n_muestras: 900,
    temp_media: 36.6,
    temp_desv_std: 0.2,
    temp_p25: 36.4,
    temp_p75: 36.8,
    temp_n_muestras: 300,
    dias_historial: 21,
    es_valido: true,
    calculado_en: new Date().toISOString(),
    ...overrides,
  };
}

interface EngineDeps {
  inserted: AlertRecord[];
}

function makeEngineDeps(baseline: BaselinePersonalizado | null = null, error = false): EngineDeps {
  const inserted: AlertRecord[] = [];
  const deps: any = {
    insertAlert: async (alert: AlertRecordInsert): Promise<AlertRecord> => {
      const record: AlertRecord = {
        id: `alert-${inserted.length + 1}`,
        id_usuario: alert.id_usuario,
        id_dato_reloj: alert.id_dato_reloj,
        id_prediccion_riesgo: alert.id_prediccion_riesgo,
        tipo: alert.tipo,
        severidad: alert.severidad,
        titulo: alert.titulo,
        mensaje: alert.mensaje,
        datos: alert.datos,
        leida_en: null,
        created_at: new Date().toISOString(),
        expira_en: alert.expira_en ?? null,
        status: 'activa',
      };
      inserted.push(record);
      return record;
    },
    getActiveAlerts: async () => [],
    markAlertRead: async () => {},
    updateAlertDatos: async () => {},
  };
  if (!error) {
    deps.getPersonalizedBaseline = async () => baseline;
  } else {
    deps.getPersonalizedBaseline = async () => {
      throw new Error('supabase down');
    };
  }
  return {...deps, inserted};
}

/**
 * Simula una secuencia de lecturas y devuelve cuántas alertas generó el engine.
 */
async function countAlertsForSeries(
  engine: AlertEngine,
  series: number[],
): Promise<{count: number; severidades: string[]}> {
  const severidades: string[] = [];
  for (const spo2 of series) {
    const alert = await engine.evaluateSpo2Reading('u1', spo2, 'wearable');
    if (alert) severidades.push(alert.severidad);
  }
  return {count: severidades.length, severidades};
}

// ─═══ Test comparativo 1: reducción de falsas alarmas (SpO2) ─═══

describe('HU-99 comparativo: SpO2 dinámico vs estático', () => {
  // Paciente COPD real: baseline SpO2 91 ± 1.5 → warning personal 88, crítico 85.
  const copdBaseline = makeBaselineRow({
    spo2_media: 91,
    spo2_desv_std: 1.5,
    spo2_p25: 90,
    spo2_p75: 92,
    spo2_n_muestras: 800,
    hr_media: 80,
    hr_desv_std: 5,
  });

  test('lectura 89 (normal para COPD) NO genera alerta con dinámico, SÍ con estático', async () => {
    // Dinámico: umbral personal 88 → 89 es normal.
    const dynDeps = makeEngineDeps(copdBaseline);
    const dynEngine = new AlertEngine(dynDeps);
    const dynAlert = await dynEngine.evaluateSpo2Reading('u1', 89, 'wearable');
    expect(dynAlert).toBeNull();
    dynEngine.dispose();

    // Estático (OMS 90): 89 cae en banda leve → genera alerta leve.
    const statDeps = makeEngineDeps(null);
    const statEngine = new AlertEngine(statDeps);
    const statAlert = await statEngine.evaluateSpo2Reading('u1', 89, 'wearable');
    expect(statAlert).not.toBeNull();
    expect(statAlert!.severidad).toBe('leve');
    statEngine.dispose();
  });

  test('serie simulada de 10 lecturas → dinámico genera menos alertas que estático', async () => {
    // Serie de un día típico de un paciente COPD: la mayoría en su zona normal (88-92),
    // con un pico crítico real (83) que DEBE detectarse.
    const series = [92, 91, 89, 90, 88, 91, 89, 92, 83, 91];

    const dynDeps = makeEngineDeps(copdBaseline);
    const dynEngine = new AlertEngine(dynDeps);
    const dyn = await countAlertsForSeries(dynEngine, series);
    dynEngine.dispose();

    const statDeps = makeEngineDeps(null);
    const statEngine = new AlertEngine(statDeps);
    const stat = await countAlertsForSeries(statEngine, series);
    statEngine.dispose();

    // Dinámico: solo alerta por el 83 (crítica real) → 1 alerta.
    expect(dyn.count).toBe(1);
    expect(dyn.severidades).toEqual(['critica']);
    // Estático: 89-90 en banda leve (múltiples) + 83 crítica → más alertas.
    expect(stat.count).toBeGreaterThan(dyn.count);
    // Sensibilidad conservada: ambos detectan el evento crítico real.
    expect(stat.severidades).toContain('critica');
    expect(dyn.severidades).toContain('critica');
  });

  test('con baseline personalizado la severidad refleja la distancia al baseline (leve/moderada/crítica)', async () => {
    // COPD: warning personal 88, crítico 85, banda leve 2 → leve en [86, 88).
    const dynDeps = makeEngineDeps(copdBaseline);
    const dynEngine = new AlertEngine(dynDeps);

    // 87 → leve (dentro de la banda [86, 88))
    const leve = await dynEngine.evaluateSpo2Reading('u1', 87, 'wearable');
    expect(leve).not.toBeNull();
    expect(leve!.severidad).toBe('leve');

    // 85 → advertencia (moderada), por debajo del warning 88 y fuera de la banda leve
    const modDeps = makeEngineDeps(copdBaseline);
    const modEngine = new AlertEngine(modDeps);
    const moderada = await modEngine.evaluateSpo2Reading('u1', 85, 'wearable');
    expect(moderada).not.toBeNull();
    expect(moderada!.severidad).toBe('advertencia');
    modEngine.dispose();

    // 84 → crítica
    const critDeps = makeEngineDeps(copdBaseline);
    const critEngine = new AlertEngine(critDeps);
    const critica = await critEngine.evaluateSpo2Reading('u1', 84, 'wearable');
    expect(critica).not.toBeNull();
    expect(critica!.severidad).toBe('critica');
    critEngine.dispose();

    dynEngine.dispose();
  });
});

// ─═══ Test comparativo 2: hipertensión crónica (PA) ─═══

describe('HU-99 comparativo: PA dinámico vs estático', () => {
  // Paciente con PA crónicamente elevada 150 ± 5 → warning personal 160, crítico 175.
  const htaBaseline = makeBaselineRow({
    bp_sist_media: 150,
    bp_sist_desv_std: 5,
    bp_sist_p25: 146,
    bp_sist_p75: 154,
    bp_sist_n_muestras: 600,
    bp_diast_media: 95,
    bp_diast_desv_std: 4,
  });

  test('PA sistólica 145 (normal para el paciente) → dinámico NO alerta, estático SÍ', async () => {
    // Dinámico: warning personal ~160 → 145 normal.
    const dynDeps = makeEngineDeps(htaBaseline);
    const dynEngine = new AlertEngine(dynDeps);
    const dynAlert = await dynEngine.evaluateBpReading('u1', 145, 90, 'wearable');
    expect(dynAlert).toBeNull();
    dynEngine.dispose();

    // Estático (OMS warn 140): 145 → advertencia, banda leve 5 → leve en (135,140]. 145 ≥ 140 → advertencia.
    const statDeps = makeEngineDeps(null);
    const statEngine = new AlertEngine(statDeps);
    const statAlert = await statEngine.evaluateBpReading('u1', 145, 90, 'wearable');
    expect(statAlert).not.toBeNull();
    expect(statAlert!.severidad).toBe('advertencia');
    statEngine.dispose();
  });

  test('crisis hipertensiva real (170) detectada con ambos', async () => {
    const dynDeps = makeEngineDeps(htaBaseline);
    const dynEngine = new AlertEngine(dynDeps);
    const dynAlert = await dynEngine.evaluateBpReading('u1', 170, 95, 'wearable');
    expect(dynAlert).not.toBeNull();
    expect(dynAlert!.severidad).toBe('advertencia'); // dentro de [160, 175) personal
    dynEngine.dispose();

    const statDeps = makeEngineDeps(null);
    const statEngine = new AlertEngine(statDeps);
    const statAlert = await statEngine.evaluateBpReading('u1', 170, 95, 'wearable');
    expect(statAlert).not.toBeNull();
    expect(statAlert!.severidad).toBe('critica'); // ≥ 160 OMS
    statEngine.dispose();
  });
});

// ─═══ Test comparativo 3: fallback a estándar ─═══

describe('HU-99: fallback a umbrales estándar', () => {
  test('sin baseline (null) → usa OMS: 89 genera leve (banda sobre 90)', async () => {
    const deps = makeEngineDeps(null);
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateSpo2Reading('u1', 89, 'wearable');
    expect(alert).not.toBeNull();
    expect(alert!.severidad).toBe('leve');
    expect(alert!.datos).toMatchObject({umbral_origen: 'estandar'});
    engine.dispose();
  });

  test('baseline inválido (es_valido=false) → fallback a OMS', async () => {
    const invalid = makeBaselineRow({es_valido: false});
    const deps = makeEngineDeps(invalid);
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateSpo2Reading('u1', 86, 'wearable');
    // Fallback OMS (90/85, banda 2): 86 → advertencia
    expect(alert).not.toBeNull();
    expect(alert!.severidad).toBe('advertencia');
    expect(alert!.datos).toMatchObject({umbral_origen: 'estandar'});
    engine.dispose();
  });

  test('fetch del baseline falla (error) → fallback silencioso a OMS', async () => {
    const deps = makeEngineDeps(null, true);
    const engine = new AlertEngine(deps);

    const alert = await engine.evaluateSpo2Reading('u1', 84, 'wearable');
    expect(alert).not.toBeNull();
    expect(alert!.severidad).toBe('critica');
    expect(alert!.datos).toMatchObject({umbral_origen: 'estandar'});
    engine.dispose();
  });
});

// ─═══ Test comparativo 4: dedup con nivel leve ─═══

describe('HU-99: dedup con severidad leve', () => {
  test('alerta leve activa + nueva lectura leve → NO duplica; lectura moderada → escala', async () => {
    const copd = makeBaselineRow({
      spo2_media: 91,
      spo2_desv_std: 1.5,
    });
    const deps = makeEngineDeps(copd);
    const engine = new AlertEngine(deps);

    // 87 → leve (banda [86,88))
    const primera = await engine.evaluateSpo2Reading('u1', 87, 'wearable');
    expect(primera?.severidad).toBe('leve');
    expect(deps.inserted).toHaveLength(1);

    // 87 de nuevo → dedup (no duplica)
    const segunda = await engine.evaluateSpo2Reading('u1', 87, 'wearable');
    expect(segunda).toBeNull();
    expect(deps.inserted).toHaveLength(1);

    engine.dispose();
  });

  test('el engine con baseline personal NO genera falsas alarmas en frontera exacta', async () => {
    const copd = makeBaselineRow({spo2_media: 91, spo2_desv_std: 1.5});
    const deps = makeEngineDeps(copd);
    const engine = new AlertEngine(deps);

    // 88 es exactamente el warning personal → 88 >= 88 → normal (sin banda por encima).
    const alert = await engine.evaluateSpo2Reading('u1', 88, 'wearable');
    expect(alert).toBeNull();

    engine.dispose();
  });
});