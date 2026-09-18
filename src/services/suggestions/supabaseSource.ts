/**
 * HU-34 Fase A (extensión) — Fuente Supabase para el motor de sugerencias.
 *
 * El motor (`rulesEngine.ts`) y el condensador (`supabaseMapper.ts`, puro y
 * testeable en jest sin mocks) no tocan red. Solo este loader habla con
 * Supabase. Si falla la red o no hay filas, devuelve null y la UI usa el
 * `summary` de Health Connect como fallback (ver `InicioScreen`).
 */
import {getDatosReloj} from '../supabase/api';
import type {HealthSummary} from '../../types/health';
import {datosRelojToSummary, SUGGESTION_LOOKBACK_HOURS, SUGGESTION_MAX_ROWS} from './supabaseMapper';

/**
 * Lee las filas recientes de `datos_reloj` y las condensa.
 * Devuelve null si falla la red o no hay señales (el llamador aplica
 * fallback a Health Connect).
 */
export async function loadSuggestionSummaryFromSupabase(userId: string): Promise<HealthSummary | null> {
  const from = new Date(Date.now() - SUGGESTION_LOOKBACK_HOURS * 3600 * 1000).toISOString();
  const rows = await getDatosReloj(userId, {from, limit: SUGGESTION_MAX_ROWS});
  return datosRelojToSummary(rows);
}
