/**
 * HU-34 Fase A (extensión) — Condensador puro datos_reloj → HealthSummary.
 *
 * SIN imports de runtime (solo tipos): testeable en jest sin mocks nativos,
 * igual que `rulesEngine.ts`. El acceso a red vive en `supabaseSource.ts`.
 *
 * Reglas de agregación (ventana 24h, excluye perdedores de conflicto HU-25):
 *  - FC: promedio de `frec_cardiaca_bpm` no nulos
 *  - PA sistólica/diastólica: último valor válido de cada una (por `recorded_at`)
 *  - SpO2 / temperatura: último valor válido
 *  - Pasos: suma de `actividad_pasos` en la ventana
 *  - Sueño: último `horas_sueno` válido × 60 (a minutos)
 *  - Sin ninguna señal útil → null (la UI muestra el estado vacío CA-07)
 */
import type {DatosReloj} from '../supabase/models';
import type {HealthSummary} from '../../types/health';

/** Ventana de agregación: últimas 24h. */
export const SUGGESTION_LOOKBACK_HOURS = 24;

/** Tope de filas por consulta (suficiente para 24h a 1 fila/30seg + manuales). */
export const SUGGESTION_MAX_ROWS = 200;

/**
 * Condensa filas de `datos_reloj` en un `HealthSummary`.
 * Independiente del orden de entrada (resuelve "último" por `recorded_at`).
 */
export function datosRelojToSummary(rows: DatosReloj[]): HealthSummary | null {
  const valid = (rows ?? []).filter(r => !r.reemplazado_por);
  if (valid.length === 0) return null;

  const timeOf = (r: DatosReloj): number => {
    const t = r.recorded_at ? Date.parse(r.recorded_at) : NaN;
    return Number.isNaN(t) ? 0 : t;
  };

  let fcSum = 0;
  let fcCount = 0;
  let steps = 0;
  let hasSteps = false;

  let sis: number | null = null;
  let sisTime = -1;
  let dia: number | null = null;
  let diaTime = -1;
  let spo2: number | null = null;
  let spo2Time = -1;
  let temp: number | null = null;
  let tempTime = -1;
  let sleepMin: number | null = null;
  let sleepTime = -1;

  for (const r of valid) {
    const t = timeOf(r);

    if (r.frec_cardiaca_bpm != null) {
      fcSum += r.frec_cardiaca_bpm;
      fcCount += 1;
    }
    if (r.bp_sistolica != null && t >= sisTime) {
      sis = r.bp_sistolica;
      sisTime = t;
    }
    if (r.bp_diastolica != null && t >= diaTime) {
      dia = r.bp_diastolica;
      diaTime = t;
    }
    if (r.spo2_pct != null && t >= spo2Time) {
      spo2 = r.spo2_pct;
      spo2Time = t;
    }
    if (r.temperatura != null && t >= tempTime) {
      temp = r.temperatura;
      tempTime = t;
    }
    if (r.actividad_pasos != null) {
      steps += r.actividad_pasos;
      hasSteps = true;
    }
    if (r.horas_sueno != null && t >= sleepTime) {
      sleepMin = r.horas_sueno * 60;
      sleepTime = t;
    }
  }

  const hasAnySignal =
    fcCount > 0 || sis !== null || dia !== null || spo2 !== null || temp !== null || hasSteps || sleepMin !== null;
  if (!hasAnySignal) return null;

  return {
    steps: hasSteps ? Math.round(steps) : 0,
    distanceMeters: 0,
    caloriesKcal: 0,
    sleepMinutes: sleepMin !== null ? Math.round(sleepMin) : 0,
    averageBpm: fcCount > 0 ? fcSum / fcCount : null,
    exerciseSessions: 0,
    bloodPressureSystolic: sis,
    bloodPressureDiastolic: dia,
    spo2Percent: spo2,
    bodyTemperatureCelsius: temp,
  };
}
