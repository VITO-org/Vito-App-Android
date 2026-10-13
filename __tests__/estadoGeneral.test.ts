/**
 * Tests del selector puro getEstadoGeneral (rediseño Inicio — Fase 2).
 * 6 casos del design: 4 estados + leve/INFO + precedencia mixta.
 */
import {getEstadoGeneral} from '../src/utils/estadoGeneral';
import type {Alerta} from '../src/services/supabase/models';
import type {HealthSummary} from '../src/types/health';

function makeAlert(overrides: Partial<Alerta>): Alerta {
  return {
    id: 'a1',
    id_usuario: 'u1',
    id_dato_reloj: null,
    id_prediccion_riesgo: null,
    tipo: 'taquicardia',
    severidad: 'critica',
    titulo: 't',
    mensaje: 'm',
    datos: null,
    leida_en: null,
    created_at: new Date().toISOString(),
    expira_en: null,
    ...overrides,
  };
}

const summaryOk: HealthSummary = {
  steps: 1000,
  distanceMeters: 500,
  caloriesKcal: 200,
  sleepMinutes: 400,
  averageBpm: 70,
  exerciseSessions: 0,
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,
  spo2Percent: 98,
  bodyTemperatureCelsius: 36.6,
};

describe('getEstadoGeneral', () => {
  test('crítica → revisar', () => {
    const r = getEstadoGeneral({
      activeAlerts: [makeAlert({severidad: 'critica'})],
      summary: summaryOk,
      lastSync: new Date(),
    });
    expect(r.estado).toBe('revisar');
  });

  test('advertencia → requiere-atencion', () => {
    const r = getEstadoGeneral({
      activeAlerts: [makeAlert({severidad: 'advertencia'})],
      summary: summaryOk,
      lastSync: new Date(),
    });
    expect(r.estado).toBe('requiere-atencion');
  });

  test('sin nada + summary null + lastSync null → sin-datos', () => {
    const r = getEstadoGeneral({activeAlerts: [], summary: null, lastSync: null});
    expect(r.estado).toBe('sin-datos');
  });

  test('con datos y sin críticas/advertencias → bien', () => {
    const r = getEstadoGeneral({
      activeAlerts: [],
      summary: summaryOk,
      lastSync: new Date(),
    });
    expect(r.estado).toBe('bien');
  });

  test('solo leve/INFO → bien (no alteran)', () => {
    const r = getEstadoGeneral({
      activeAlerts: [
        makeAlert({id: 'l1', severidad: 'leve'}),
        makeAlert({id: 'i1', severidad: 'INFO'}),
      ],
      summary: summaryOk,
      lastSync: new Date(),
    });
    expect(r.estado).toBe('bien');
  });

  test('precedencia mixta crítica+advertencia → revisar', () => {
    const r = getEstadoGeneral({
      activeAlerts: [
        makeAlert({id: 'w1', severidad: 'advertencia'}),
        makeAlert({id: 'c1', severidad: 'critica'}),
      ],
      summary: summaryOk,
      lastSync: new Date(),
    });
    expect(r.estado).toBe('revisar');
  });
});
