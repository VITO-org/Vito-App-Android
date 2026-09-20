/**
 * HU-34 Fase A (extensión) — Fuente Supabase para el motor de sugerencias.
 *
 * El motor (`rulesEngine.ts`) y el condensador (`supabaseMapper.ts`, puro y
 * testeable en jest sin mocks) no tocan red. Solo este loader habla con
 * Supabase. Si falla la red o no hay filas, devuelve null y la UI usa el
 * `summary` de Health Connect como fallback (ver `InicioScreen`).
 */
import {getDatosReloj, getAlertasActivas} from '../supabase/api';
import type {HealthSummary} from '../../types/health';
import type {AlertType} from '../alerts/types';
import {
  datosRelojToSummary,
  datosRelojToTrends,
  SUGGESTION_LOOKBACK_HOURS,
  SUGGESTION_MAX_ROWS,
  TRENDS_LOOKBACK_DAYS,
  TRENDS_MAX_ROWS,
} from './supabaseMapper';
import type {TendenciasSalud} from './supabaseMapper';

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

/**
 * Lee tendencias 14d de datos_reloj para el motor de sugerencias.
 * Devuelve null si falla la red o no hay datos suficientes.
 */
export async function loadTendenciasFromSupabase(userId: string): Promise<TendenciasSalud | null> {
  const from = new Date(Date.now() - TRENDS_LOOKBACK_DAYS * 24 * 3600 * 1000).toISOString();
  const rows = await getDatosReloj(userId, {from, limit: TRENDS_MAX_ROWS});
  return datosRelojToTrends(rows);
}

/**
 * Lee alertas activas (leida_en IS NULL) del usuario.
 * Devuelve los tipos de alerta activos para que el motor de sugerencias
 * suprima las que ya están cubiertas por una alerta crítica.
 */
export async function loadActiveAlertTypes(userId: string): Promise<AlertType[]> {
  const alertas = await getAlertasActivas(userId);
  return alertas.map(a => a.tipo);
}
