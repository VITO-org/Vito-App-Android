/**
 * healthSync — Motor central de sincronización de datos de salud (HU-25 / SCRUM-79).
 *
 * Centraliza la lógica que antes vivía inline en `HealthProvider.loadHealthData()`:
 * normalización, dedupe de lecturas idénticas, detección de conflictos entre fuentes
 * y resolución con prioridad wearable > manual (CA-02 / CA-03).
 *
 * Las dependencias (API de Supabase) se inyectan para poder testear la lógica pura
 * sin react-native ni supabase-js.
 */
import type { HealthSummary } from "../types/health";
import type {
  DatosReloj,
  DatosRelojInsert,
  OrigenDato,
} from "./supabase/models";
import { normalizeVital } from "./vitals";

/** Ventana temporal (±5 min) en la que dos lecturas de distinta fuente se consideran conflicto (CA-02). */
export const SYNC_CONFLICT_WINDOW_MS = 5 * 60 * 1000;

/** Límite inferior del intervalo de sincronización para modo "casi tiempo real" (CA-01). */
export const MIN_SYNC_INTERVAL_MS = 60 * 1000;

/** Intervalo por defecto (minutos) cuando el usuario no configuró ninguno. */
export const DEFAULT_SYNC_INTERVAL_MIN = 10;

export type SyncInsert = (dato: DatosRelojInsert) => Promise<DatosReloj>;
export type SyncFindInWindow = (
  userId: string,
  from: string,
  to: string
) => Promise<DatosReloj[]>;
export type SyncMarkReplaced = (
  id: string,
  reemplazadoPor: string
) => Promise<void>;

export interface HealthSyncDeps {
  insertDatosReloj: SyncInsert;
  getDatosRelojInWindow: SyncFindInWindow;
  markDatosRelojReemplazado: SyncMarkReplaced;
}

export type SyncStatus = "inserted" | "deduplicated" | "no_user" | "empty";

export interface SyncResult {
  status: SyncStatus;
  /** id del registro insertado (solo cuando status === 'inserted'). */
  id?: string;
  /** true si había registros manuales en la ventana que fueron reemplazados (CA-03). */
  conflictResolved: boolean;
  /** ids de registros manuales marcados como reemplazados (auditoría de versionado). */
  manualReplaced: string[];
}

/** Compara los valores normalizados de dos lecturas para dedupe de lecturas idénticas. */
function mismasLecturas(a: DatosReloj, b: DatosRelojInsert): boolean {
  return (
    a.frec_cardiaca_bpm === b.frec_cardiaca_bpm &&
    a.bp_sistolica === b.bp_sistolica &&
    a.bp_diastolica === b.bp_diastolica &&
    a.spo2_pct === b.spo2_pct &&
    a.temperatura === b.temperatura &&
    a.actividad_pasos === b.actividad_pasos &&
    a.horas_sueno === b.horas_sueno
  );
}

/** Construye el registro datos_reloj normalizado con origen 'wearable'. */
export function buildDatosRelojInsert(
  userId: string,
  summary: HealthSummary,
  now: Date = new Date()
): DatosRelojInsert {
  const hr = normalizeVital("frecuencia_cardiaca", summary.averageBpm);
  const spo2 = normalizeVital(
    "saturacion_oxigeno",
    summary.spo2Percent ?? null
  );
  const temp = normalizeVital(
    "temperatura",
    summary.bodyTemperatureCelsius ?? null
  );

  return {
    id_usuario: userId,
    bp_sistolica:
      summary.bloodPressureSystolic != null
        ? Math.round(summary.bloodPressureSystolic)
        : null,
    bp_diastolica:
      summary.bloodPressureDiastolic != null
        ? Math.round(summary.bloodPressureDiastolic)
        : null,
    frec_cardiaca_bpm: hr.value,
    spo2_pct: spo2.value,
    temperatura: temp.value,
    nivel_estres: null,
    actividad_pasos: summary.steps != null ? Math.round(summary.steps) : null,
    horas_sueno:
      summary.sleepMinutes != null ? summary.sleepMinutes / 60 : null,
    recorded_at: now.toISOString(),
    sospechoso: hr.sospechoso || spo2.sospechoso || temp.sospechoso,
    origen: "wearable",
  };
}

/**
 * Sincroniza un resumen de Health Connect (wearable) hacia `datos_reloj`:
 *
 * 1. Normaliza los signos vitales (reutiliza `normalizeVital`).
 * 2. Dedupe: si ya existe una lectura wearable idéntica dentro de la ventana temporal, no duplica.
 * 3. CA-02/CA-03: detecta registros manuales en la ventana y, tras insertar el wearable,
 *    los marca como reemplazados (reemplazado_por = id del ganador) — prioridad wearable > manual.
 *
 * @param userId id_usuario o null (en ese caso devuelve 'no_user' sin tocar dependencias).
 */
export async function syncWearableToBackend(
  userId: string | null,
  summary: HealthSummary,
  deps: HealthSyncDeps,
  now: Date = new Date()
): Promise<SyncResult> {
  if (!userId) {
    return { status: "no_user", conflictResolved: false, manualReplaced: [] };
  }

  const dato = buildDatosRelojInsert(userId, summary, now);

  const tieneLectura =
    dato.frec_cardiaca_bpm != null ||
    dato.bp_sistolica != null ||
    dato.bp_diastolica != null ||
    dato.spo2_pct != null ||
    dato.temperatura != null ||
    dato.actividad_pasos != null ||
    dato.horas_sueno != null;
  if (!tieneLectura) {
    return { status: "empty", conflictResolved: false, manualReplaced: [] };
  }

  const from = new Date(now.getTime() - SYNC_CONFLICT_WINDOW_MS).toISOString();
  const to = new Date(now.getTime() + 60_000).toISOString();
  const existing = await deps.getDatosRelojInWindow(userId, from, to);

  // Dedupe: lectura wearable idéntica dentro de la ventana → no duplicar
  const duplicado = existing.find(
    (e) => e.origen === "wearable" && mismasLecturas(e, dato)
  );
  if (duplicado) {
    return {
      status: "deduplicated",
      conflictResolved: false,
      manualReplaced: [],
    };
  }

  const inserted = await deps.insertDatosReloj(dato);

  // CA-03: prioridad wearable > manual — marcar manuales de la ventana como reemplazados
  const manuales = existing.filter(
    (e): e is DatosReloj => e.origen === "manual" && !!e.id
  );
  const manualReplaced: string[] = [];
  for (const m of manuales) {
    await deps.markDatosRelojReemplazado(m.id, inserted.id);
    manualReplaced.push(m.id);
  }

  return {
    status: "inserted",
    id: inserted.id,
    conflictResolved: manualReplaced.length > 0,
    manualReplaced,
  };
}
