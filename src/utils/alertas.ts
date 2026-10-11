/**
 * Helpers visuales compartidos de alertas (banner + pantalla).
 * Única fuente de verdad: evita duplicar iconos/colores/tiempos entre vistas.
 */
import {colors} from '../theme';
import type {Alerta} from '../services/supabase/models';

export type SeverityKey = 'danger' | 'warning' | 'info';

/**
 * Map Supabase severidad to UI severity color key.
 */
export function severityToColorKey(severidad: Alerta['severidad']): SeverityKey {
  if (severidad === 'critica') return 'danger';
  if (severidad === 'advertencia') return 'warning';
  return 'info';
}

/**
 * Label visible de severidad (null cuando no lleva chip).
 */
export function severityLabel(severidad: Alerta['severidad']): string | null {
  if (severidad === 'critica') return 'Crítica';
  if (severidad === 'advertencia') return 'Advertencia';
  return null;
}

/**
 * Get the appropriate icon for the alert type.
 */
export function alertIcon(tipo: Alerta['tipo']): string {
  switch (tipo) {
    case 'hipoxia': return '🫁';
    case 'hipertension': return '⚠️';
    case 'hipotension': return '⬇️';
    case 'taquicardia': return '❤️';
    case 'bradicardia': return '🧠';
    default: return '🔔';
  }
}

/**
 * Format ISO timestamp to a human-readable string.
 */
export function formatAlertTime(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  return date.toLocaleDateString('es-AR', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
}

export const SEVERITY_COLORS: Record<SeverityKey, {bg: string; dot: string; text: string}> = {
  danger: {bg: colors.dangerLight, dot: colors.danger, text: colors.danger},
  warning: {bg: colors.warningLight, dot: colors.warning, text: colors.warning},
  info: {bg: colors.surface, dot: colors.textSecondary, text: colors.textSecondary},
};