/**
 * Selector puro del Estado general (Inicio — 3 estados semáforo).
 * Sin I/O, sin navegación. Precedencia: critica > advertencia > bien.
 * Leve/INFO no alteran el estado.
 *
 * Los mensajes de los estados con alertas son fijos y genéricos
 * (no nombran tipos de alerta).
 */
import type {Alerta} from '../services/supabase/models';
import type {HealthSummary} from '../types/health';

/** Semáforo de 3 estados + caso sin datos */
export type EstadoGeneral = 'bien' | 'requiere-atencion' | 'revisar' | 'sin-datos';

export interface EstadoGeneralInput {
  activeAlerts: Alerta[];
  summary: HealthSummary | null;
  lastSync: Date | null;
}

export interface EstadoGeneralResult {
  estado: EstadoGeneral;
  /** Título en la tarjeta (ej: "Bien", "Requiere atención", "Revisar mediciones") */
  badgeLabel: string;
  /** Subtítulo fijo y genérico (sin nombres de tipos) */
  mensaje: string;
}

// ── Selector principal ───────────────────────────────────────────────

export function getEstadoGeneral(input: EstadoGeneralInput): EstadoGeneralResult {
  const {activeAlerts, summary} = input;

  // 🔴 Crítico — al menos una alerta crítica
  const criticas = activeAlerts.filter(a => a.severidad === 'critica');
  if (criticas.length > 0) {
    return {
      estado: 'revisar',
      badgeLabel: criticas.length === 1 ? '1 alerta crítica' : `${criticas.length} alertas críticas`,
      mensaje: 'Necesitan tu atención ahora',
    };
  }

  // 🟡 Advertencia — al menos una alerta de advertencia
  const advertencias = activeAlerts.filter(a => a.severidad === 'advertencia');
  if (advertencias.length > 0) {
    return {
      estado: 'requiere-atencion',
      badgeLabel: advertencias.length === 1 ? '1 advertencia' : `${advertencias.length} advertencias`,
      mensaje: 'Conviene revisarlas',
    };
  }

  // ⚫ Sin datos de signos vitales
  const sinSignosVitales =
    summary == null ||
    (summary.averageBpm == null &&
      summary.bloodPressureSystolic == null &&
      summary.bloodPressureDiastolic == null &&
      summary.spo2Percent == null &&
      summary.bodyTemperatureCelsius == null);

  if (sinSignosVitales) {
    return {
      estado: 'sin-datos',
      badgeLabel: 'Sin datos recientes',
      mensaje: 'Esperando nuevas mediciones',
    };
  }

  // 🟢 Todo bien
  return {
    estado: 'bien',
    badgeLabel: 'Bien',
    mensaje: 'Sin alertas activas',
  };
}
