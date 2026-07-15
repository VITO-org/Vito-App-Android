/**
 * HealthDataCache — Caché local de snapshots de salud por día.
 *
 * Guarda en AsyncStorage un array de HealthSummary por cada fecha,
 * acumulado por las lecturas periódicas del HealthProvider.
 *
 * El historial usa esto como respaldo cuando datos_reloj está vacío.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {HealthSummary} from '../types/health';

const CACHE_PREFIX = 'health_daily_';
const MAX_SNAPSHOTS_PER_DAY = 48; // ~cada 30 min como máximo

/** Obtener la clave AsyncStorage para una fecha */
function keyForDate(dateStr: string): string {
  return `${CACHE_PREFIX}${dateStr}`;
}

/** Formatear fecha como YYYY-MM-DD */
function dateToKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Guardar un snapshot de HealthSummary en el caché del día correspondiente.
 * Se llama desde HealthProvider tras cada lectura exitosa de Health Connect.
 */
export async function saveHealthSnapshot(snapshot: HealthSummary): Promise<void> {
  const key = dateToKey(new Date());
  try {
    const raw = await AsyncStorage.getItem(key);
    const entries: HealthSummary[] = raw ? JSON.parse(raw) : [];

    // Evitar duplicados idénticos seguidos: si el último snapshot es muy parecido, lo reemplazamos
    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      if (
        last.steps === snapshot.steps &&
        last.caloriesKcal === snapshot.caloriesKcal &&
        last.distanceMeters === snapshot.distanceMeters &&
        last.averageBpm === snapshot.averageBpm &&
        last.bloodPressureSystolic === snapshot.bloodPressureSystolic &&
        last.bloodPressureDiastolic === snapshot.bloodPressureDiastolic &&
        last.spo2Percent === snapshot.spo2Percent &&
        last.bodyTemperatureCelsius === snapshot.bodyTemperatureCelsius
      ) {
        return; // mismo snapshot, no duplicar
      }
    }

    entries.push(snapshot);

    // Poda: nunca exceder MAX_SNAPSHOTS_PER_DAY
    if (entries.length > MAX_SNAPSHOTS_PER_DAY) {
      entries.splice(0, entries.length - MAX_SNAPSHOTS_PER_DAY);
    }

    await AsyncStorage.setItem(key, JSON.stringify(entries));
  } catch (e) {
    console.warn('HealthDataCache: error al guardar snapshot', e);
  }
}

/**
 * Obtener todos los snapshots almacenados para un rango de días.
 *
 * @param startDate - Fecha inicio (incluida)
 * @param endDate - Fecha fin (incluida)
 * @returns Array de {date, snapshots[]}
 */
export async function getSnapshotsForRange(
  startDate: Date,
  endDate: Date,
): Promise<{date: string; snapshots: HealthSummary[]}[]> {
  const result: {date: string; snapshots: HealthSummary[]}[] = [];
  const current = new Date(startDate);

  try {
    while (current <= endDate) {
      const key = dateToKey(current);
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const entries: HealthSummary[] = JSON.parse(raw);
        result.push({date: key, snapshots: entries});
      }
      current.setDate(current.getDate() + 1);
    }
  } catch (e) {
    console.warn('HealthDataCache: error al leer rango', e);
  }

  return result;
}

/**
 * Calcular promedios diarios a partir de snapshots cacheados.
 * Devuelve estructura similar a la que usa HistorialScreen.
 */
export interface DailyAverages {
  steps: number;
  caloriesKcal: number;
  distanceMeters: number;
  sleepMinutes: number;
  averageBpm: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  spo2Percent: number | null;
  bodyTemperatureCelsius: number | null;
  count: number; // cuántos snapshots se usaron
}

export function computeDailyAverages(
  snapshots: HealthSummary[],
): DailyAverages {
  if (snapshots.length === 0) {
    return {
      steps: 0,
      caloriesKcal: 0,
      distanceMeters: 0,
      sleepMinutes: 0,
      averageBpm: null,
      bloodPressureSystolic: null,
      bloodPressureDiastolic: null,
      spo2Percent: null,
      bodyTemperatureCelsius: null,
      count: 0,
    };
  }

  const n = snapshots.length;
  const sum = (key: keyof HealthSummary) =>
    snapshots.reduce((acc, s) => acc + (s[key] as number ?? 0), 0);

  // Para valores que pueden ser null, contar solo los no-null
  const avgNullable = (key: keyof HealthSummary) => {
    const valid = snapshots.filter(s => s[key] != null);
    if (valid.length === 0) return null;
    return valid.reduce((acc, s) => acc + (s[key] as number), 0) / valid.length;
  };

  return {
    steps: Math.round(sum('steps') / n),
    caloriesKcal: sum('caloriesKcal') / n,
    distanceMeters: sum('distanceMeters') / n,
    sleepMinutes: sum('sleepMinutes') / n,
    averageBpm: avgNullable('averageBpm'),
    bloodPressureSystolic: avgNullable('bloodPressureSystolic'),
    bloodPressureDiastolic: avgNullable('bloodPressureDiastolic'),
    spo2Percent: avgNullable('spo2Percent'),
    bodyTemperatureCelsius: avgNullable('bodyTemperatureCelsius'),
    count: n,
  };
}

/**
 * Obtener promedios diarios agregados para un rango de fechas.
 */
export async function getDailyAveragesForRange(
  startDate: Date,
  endDate: Date,
): Promise<{date: string; averages: DailyAverages}[]> {
  const days = await getSnapshotsForRange(startDate, endDate);
  return days.map(day => ({
    date: day.date,
    averages: computeDailyAverages(day.snapshots),
  }));
}

/**
 * Limpiar entradas más antiguas que N días (para ahorrar espacio).
 */
export async function pruneOldEntries(maxAgeDays = 60): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  const cutoffKey = dateToKey(cutoff);

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const healthKeys = allKeys.filter(k => k.startsWith(CACHE_PREFIX));
    for (const key of healthKeys) {
      if (key < cutoffKey) {
        await AsyncStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.warn('HealthDataCache: error al podar', e);
  }
}
