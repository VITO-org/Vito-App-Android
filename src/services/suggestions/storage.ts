/**
 * HU-34 Fase A — Persistencia de estado de sugerencias (AsyncStorage).
 *
 * Keys:
 *  - vito:suggestions:seen → ids marcados como Vistos
 *  - vito:suggestions:done → ids marcados como Hechos (se ocultan de la lista activa)
 *  - vito:suggestions:lastGenerated → timestamp ISO de última generación (refresh máx. diario)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_SEEN = 'vito:suggestions:seen';
const KEY_DONE = 'vito:suggestions:done';
const KEY_LAST_GENERATED = 'vito:suggestions:lastGenerated';

async function readIdSet(key: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return new Set();
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

async function writeIdSet(key: string, ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify([...ids]));
  } catch (e) {
    console.warn(`suggestions/storage: error al guardar ${key}`, e);
  }
}

export async function getSeenIds(): Promise<Set<string>> {
  return readIdSet(KEY_SEEN);
}

export async function getDoneIds(): Promise<Set<string>> {
  return readIdSet(KEY_DONE);
}

export async function markSeen(id: string): Promise<void> {
  const set = await readIdSet(KEY_SEEN);
  set.add(id);
  await writeIdSet(KEY_SEEN, set);
}

export async function markDone(id: string): Promise<void> {
  const set = await readIdSet(KEY_DONE);
  set.add(id);
  await writeIdSet(KEY_DONE, set);
}

export async function getLastGenerated(): Promise<Date | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_LAST_GENERATED);
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export async function setLastGenerated(date: Date = new Date()): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_LAST_GENERATED, date.toISOString());
  } catch (e) {
    console.warn('suggestions/storage: error al guardar lastGenerated', e);
  }
}

/** True si corresponde refrescar el timestamp (máximo una vez por día — CA-06). */
export function shouldRefreshGeneration(last: Date | null, now: Date = new Date()): boolean {
  if (!last) return true;
  const day = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  return day(last) !== day(now);
}
