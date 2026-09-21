/**
 * SCRUM-202 — Sync layer: sincroniza sugerencias generadas con Supabase.
 *
 * Flujo:
 * 1. InicioScreen llama rulesEngine → genera Suggestion[]
 * 2. syncSuggestions compara con las que ya están en Supabase
 * 3. Inserta las nuevas, no duplica las existentes
 * 4. AlertasScreen lee de Supabase (no de AsyncStorage)
 */
import {
  upsertSuggestion,
  getSuggestions,
  marcarSuggestionLeida,
  marcarSuggestionHecha,
} from '../supabase/api';
import type {SuggestionRecord, SuggestionInsert} from '../supabase/models';
import type {Suggestion} from './types';

/**
 * Convierte una Suggestion del motor a SuggestionInsert para Supabase.
 */
function toInsert(uid: string, s: Suggestion): SuggestionInsert {
  return {
    id_usuario: uid,
    tipo: s.id,
    prioridad: s.prioridad,
    titulo: s.titulo,
    descripcion: s.descripcion,
    motivo: s.motivo,
    acciones: s.acciones,
    icon: s.icon,
    datos: s.recordedAt ? {recordedAt: s.recordedAt} : null,
    leida_en: null,
    hecha_en: null,
  };
}

/**
 * Sincroniza sugerencias generadas con Supabase.
 * - Inserta sugerencias nuevas que no existen en DB
 * - No duplica las que ya están (mismo tipo + usuario + día)
 * - Devuelve todas las sugerencias del usuario (las de DB)
 */
export async function syncSuggestions(
  uid: string,
  generated: Suggestion[],
): Promise<SuggestionRecord[]> {
  try {
    // Traer las sugerencias existentes de hoy
    const existing = await getSuggestions(uid);
    const today = new Date().toISOString().slice(0, 10);

    // Filtrar solo las de hoy para evitar duplicados
    const existingToday = new Set(
      existing
        .filter(e => e.created_at.slice(0, 10) === today)
        .map(e => e.tipo),
    );

    // Insertar las que no existen hoy
    for (const s of generated) {
      if (!existingToday.has(s.id)) {
        try {
          await upsertSuggestion(toInsert(uid, s));
        } catch (e) {
          console.log('[suggestionSync] Error inserting suggestion:', s.id, e);
        }
      }
    }

    // Devolver todas las sugerencias actualizadas
    return getSuggestions(uid);
  } catch (e) {
    console.log('[suggestionSync] Error in syncSuggestions:', e);
    return [];
  }
}

/**
 * Marca una sugerencia como leída.
 */
export async function markSuggestionRead(id: string): Promise<void> {
  await marcarSuggestionLeida(id);
}

/**
 * Marca una sugerencia como hecha.
 */
export async function markSuggestionDone(id: string): Promise<void> {
  await marcarSuggestionHecha(id);
}
