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

/** Ventana de tendencias: 14 días (para comparar contra basal). */
export const TRENDS_LOOKBACK_DAYS = 14;

/** Tope de filas por consulta (suficiente para 24h a 1 fila/30seg + manuales). */
export const SUGGESTION_MAX_ROWS = 200;

/** Tope de filas para tendencias 14d (24h×14 = 336 + margen). */
export const TRENDS_MAX_ROWS = 400;

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

  // SCRUM-202: timestamp del dato más reciente
  let latestRecordedAt = '';
  for (const r of valid) {
    const t = timeOf(r);
    if (t > 0 && r.recorded_at && (!latestRecordedAt || r.recorded_at > latestRecordedAt)) {
      latestRecordedAt = r.recorded_at;
    }
  }

  return {
    steps: hasSteps ? Math.round(steps) : 0,
    distanceMeters: 0,
    caloriesKcal: 0,
    sleepMinutes: sleepMin !== null ? Math.round(sleepMin) : -1,
    averageBpm: fcCount > 0 ? fcSum / fcCount : null,
    exerciseSessions: 0,
    bloodPressureSystolic: sis,
    bloodPressureDiastolic: dia,
    spo2Percent: spo2,
    bodyTemperatureCelsius: temp,
    recordedAt: latestRecordedAt || undefined,
  };
}

// ══════════════════════════════════════════════════════════════════
// Tendencias 14d — SCRUM-202 (diferenciar sugerencias vs alertas)
// ══════════════════════════════════════════════════════════════════

/**
 * Tendencias de salud a 14 días para el motor de sugerencias.
 * Compara la ventana corta (últimos 3 días) contra la larga (14 días)
 * para detectar deuda de sueño, caída de actividad, etc.
 */
export interface TendenciasSalud {
  avgPasos14d: number;
  avgPasos3d: number;
  avgSueno14dMin: number;
  avgSueno3dMin: number;
  avgFc14d: number | null;
  avgSpo214d: number | null;
  deudaSuenoMin: number;   // avgSueno14d - avgSueno3d (>0 = deuda)
  tendenciaPasos: number;   // 1.0 = igual, <1 = bajando, >1 = subiendo
}

/**
 * Condensa filas de datos_reloj 14d en TendenciasSalud.
 * Función pura: mismo input → mismo output, sin efectos laterales.
 * Excluye perdedores de conflicto (reemplazado_por).
 */
export function datosRelojToTrends(rows: DatosReloj[], nowMs?: number): TendenciasSalud | null {
  const valid = (rows ?? []).filter(r => !r.reemplazado_por);
  if (valid.length === 0) return null;

  const H_24 = 24 * 3600 * 1000;
  const now = nowMs ?? Date.now();
  const cutoff3d = now - 3 * H_24;

  const timeOf = (r: DatosReloj): number => {
    const t = r.recorded_at ? Date.parse(r.recorded_at) : NaN;
    return Number.isNaN(t) ? 0 : t;
  };

  // Acumuladores 14d completos
  let fcSum14 = 0;
  let fcCount14 = 0;
  let spo2Sum14 = 0;
  let spo2Count14 = 0;

  // Acumuladores ventana corta (3d)
  let fcSum3 = 0;
  let fcCount3 = 0;
  let spo2Sum3 = 0;
  let spo2Count3 = 0;

  // Pasos y sueño: agrupados por día
  const stepsByDay = new Map<string, number>();
  const sleepByDay = new Map<string, number>();

  for (const r of valid) {
    const t = timeOf(r);
    const dayKey = r.recorded_at ? r.recorded_at.slice(0, 10) : 'unknown';
    const is3d = t >= cutoff3d;

    if (r.frec_cardiaca_bpm != null) {
      fcSum14 += r.frec_cardiaca_bpm;
      fcCount14 += 1;
      if (is3d) {
        fcSum3 += r.frec_cardiaca_bpm;
        fcCount3 += 1;
      }
    }
    if (r.spo2_pct != null) {
      spo2Sum14 += r.spo2_pct;
      spo2Count14 += 1;
      if (is3d) {
        spo2Sum3 += r.spo2_pct;
        spo2Count3 += 1;
      }
    }
    if (r.actividad_pasos != null) {
      stepsByDay.set(dayKey, (stepsByDay.get(dayKey) ?? 0) + r.actividad_pasos);
    }
    if (r.horas_sueno != null) {
      sleepByDay.set(dayKey, Math.max(sleepByDay.get(dayKey) ?? 0, r.horas_sueno * 60));
    }
  }

  // Promedios diarios → promedio 14d
  const stepsArr = Array.from(stepsByDay.values());
  const sleepArr = Array.from(sleepByDay.values());
  const avgPasos14d = stepsArr.length > 0
    ? stepsArr.reduce((a, b) => a + b, 0) / stepsArr.length
    : 0;
  const avgSueno14dMin = sleepArr.length > 0
    ? sleepArr.reduce((a, b) => a + b, 0) / sleepArr.length
    : 0;

  // Promedios ventana corta (3d)
  const days3d = new Set<string>();
  for (const r of valid) {
    const t = timeOf(r);
    if (t >= cutoff3d && r.recorded_at) {
      days3d.add(r.recorded_at.slice(0, 10));
    }
  }
  const numDays3d = Math.max(days3d.size, 1);
  const steps3d = Array.from(stepsByDay.entries())
    .filter(([k]) => k >= new Date(cutoff3d).toISOString().slice(0, 10))
    .reduce((acc, [, v]) => acc + v, 0);
  const sleep3d = Array.from(sleepByDay.entries())
    .filter(([k]) => k >= new Date(cutoff3d).toISOString().slice(0, 10))
    .reduce((acc, [, v]) => acc + v, 0);
  const avgPasos3d = steps3d / numDays3d;
  const avgSueno3dMin = sleep3d / numDays3d;

  // Tendencia pasos: ratio 3d vs 14d (>=2 días de datos 3d para comparar)
  const daysWithSteps3d = Array.from(stepsByDay.entries())
    .filter(([k]) => k >= new Date(cutoff3d).toISOString().slice(0, 10) && stepsByDay.get(k)! > 0)
    .length;
  const tendenciaPasos = daysWithSteps3d >= 2 && avgPasos14d > 0
    ? avgPasos3d / avgPasos14d
    : 1.0;

  return {
    avgPasos14d: Math.round(avgPasos14d),
    avgPasos3d: Math.round(avgPasos3d),
    avgSueno14dMin: Math.round(avgSueno14dMin),
    avgSueno3dMin: Math.round(avgSueno3dMin),
    avgFc14d: fcCount14 > 0 ? Math.round(fcSum14 / fcCount14) : null,
    avgSpo214d: spo2Count14 > 0 ? Math.round(spo2Sum14 / spo2Count14) : null,
    deudaSuenoMin: Math.max(0, Math.round(avgSueno14dMin - avgSueno3dMin)),
    tendenciaPasos: Math.round(tendenciaPasos * 100) / 100,
  };
}
