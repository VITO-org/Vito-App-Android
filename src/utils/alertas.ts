/**
 * Helpers visuales compartidos de alertas (banner + pantalla).
 * Única fuente de verdad: evita duplicar iconos/colores/tiempos entre vistas.
 */
import {colors} from '../theme';
import type {Alerta} from '../services/supabase/models';
import {
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_HR_THRESHOLDS,
  DEFAULT_SPO2_THRESHOLDS,
} from '../services/alerts/types';

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

export function cleanAlertTitle(titulo: string | null): string {
  if (!titulo) return '';
  const sinPrefijo = titulo.replace(/^(alerta\s+(crítica|critica|advertencia|info)\s*[:\-–—]?\s*)/i, '').replace(/^(alerta\s*[:\-–—]\s*)/i, '').trim();
  const sinParentesis = sinPrefijo.replace(/\s*\([^)]*\)\s*/g, '').replace(/\s{2,}/g, ' ').trim();
  if (/^spo₂ muy baja$/i.test(sinParentesis)) return 'Saturación de oxígeno muy baja';
  if (/^spo₂ baja$/i.test(sinParentesis)) return 'Saturación de oxígeno baja';
  return sinParentesis || titulo;
}

export const SEVERITY_COLORS: Record<SeverityKey, {bg: string; dot: string; text: string}> = {
  danger: {bg: colors.dangerLight, dot: colors.critical, text: colors.critical},
  warning: {bg: colors.warningLight, dot: colors.warningStrong, text: colors.warningStrong},
  info: {bg: colors.surface, dot: colors.textSecondary, text: colors.textSecondary},
};

/**
 * Etiqueta de umbral solo con campos presentes en `alert.datos`.
 * Devuelve `null` cuando no hay dato válido (la fila no renderiza línea).
 * SpO₂ es puntual: sin interpolación ni tendencias.
 */
export function getUmbralLabel(alert: Alerta): string | null {
  const datos = alert.datos;
  if (datos == null) return null;

  const roundIfNum = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null;

  switch (alert.tipo) {
    case 'hipoxia': {
      const valor = roundIfNum(datos.valor_registrado);
      const umbral = roundIfNum(datos.umbral_configurado);
      const left = valor != null ? `SpO₂ ${valor}%` : null;
      const right = umbral != null ? `umbral <${umbral}%` : null;
      if (left && right) return `${left} · ${right}`;
      return left ?? right ?? null;
    }
    case 'hipertension':
    case 'hipotension': {
      const sist = roundIfNum(datos.bp_sistolica);
      const diast = roundIfNum(datos.bp_diastolica);
      const uSist = roundIfNum(datos.umbral_sist);
      const uDiast = roundIfNum(datos.umbral_diast);
      const med =
        sist != null && diast != null
          ? `${sist}/${diast}`
          : sist != null
            ? `${sist}`
            : diast != null
              ? `${diast}`
              : null;
      const umb =
        uSist != null && uDiast != null
          ? `umbral ≥${uSist}/${uDiast}`
          : uSist != null
            ? `umbral ≥${uSist}`
            : uDiast != null
              ? `umbral ≥${uDiast}`
              : null;
      if (med && umb) return `${med} · ${umb}`;
      return med ?? umb ?? null;
    }
    case 'taquicardia':
    case 'bradicardia': {
      const valor = roundIfNum(datos.valor_registrado);
      const umbral = roundIfNum(datos.umbral_configurado);
      const dir = alert.tipo === 'bradicardia' ? '<' : '>';
      const left = valor != null ? `${valor} lpm` : null;
      const right = umbral != null ? `umbral ${dir}${umbral}` : null;
      if (left && right) return `${left} · ${right}`;
      return left ?? right ?? null;
    }
    default:
      return null;
  }
}

/**
 * Valor destacado por alerta derivado de `datos` (sin inventar):
 * hipoxia → "82%", FC → "130 lpm", PA → "165/105" (tolera nulls).
 * Fallback '' → la fila se renderiza sin valor extra.
 */
export function getAlertValue(alert: Alerta): string {
  const datos = alert.datos;
  if (datos == null) return '';
  const roundIfNum = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null;

  switch (alert.tipo) {
    case 'hipoxia': {
      const v = roundIfNum(datos.valor_registrado);
      return v != null ? `${v}%` : '';
    }
    case 'taquicardia':
    case 'bradicardia': {
      const v = roundIfNum(datos.valor_registrado);
      return v != null ? `${v} lpm` : '';
    }
    case 'hipertension':
    case 'hipotension': {
      const sist = roundIfNum(datos.bp_sistolica);
      const diast = roundIfNum(datos.bp_diastolica);
      if (sist != null && diast != null) return `${sist}/${diast} mmHg`;
      if (sist != null) return `${sist} mmHg`;
      if (diast != null) return `${diast} mmHg`;
      return '';
    }
    default:
      return '';
  }
}

/**
 * Comparativa límite vs medido para filas expandidas (sin la palabra "umbral").
 * Solo usa campos presentes en `alert.datos`; `null` si falta alguno.
 * - hipoxia: limite `${umbral}%`, medido `${valor}%`.
 * - taquicardia/bradicardia: limite `${umbral} lpm`, medido `${valor} lpm`.
 * - hiper/hipotension: medido como getAlertValue + " mmHg", limite mismo formato con
 *   umbral_sist/umbral_diast + " mmHg".
 */
export function getComparacionAlerta(alert: Alerta): {limite: string; medido: string} | null {
  const datos = alert.datos;
  if (datos == null) return null;
  const roundIfNum = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null;
  const isCritica = alert.severidad === 'critica';

  switch (alert.tipo) {
    case 'hipoxia': {
      const valor = roundIfNum(datos.valor_registrado);
      const umbral =
        roundIfNum(datos.umbral_configurado) ??
        (isCritica
          ? DEFAULT_SPO2_THRESHOLDS.criticalPercent
          : DEFAULT_SPO2_THRESHOLDS.warningPercent);
      if (valor == null || umbral == null) return null;
      return {limite: `${umbral}%`, medido: `${valor}%`};
    }
    case 'taquicardia':
    case 'bradicardia': {
      const valor = roundIfNum(datos.valor_registrado);
      const fallback =
        alert.tipo === 'taquicardia'
          ? isCritica
            ? DEFAULT_HR_THRESHOLDS.tachyCritical
            : DEFAULT_HR_THRESHOLDS.tachyWarning
          : isCritica
            ? DEFAULT_HR_THRESHOLDS.bradyCritical
            : DEFAULT_HR_THRESHOLDS.bradyWarning;
      const umbral = roundIfNum(datos.umbral_configurado) ?? fallback;
      if (valor == null || umbral == null) return null;
      return {limite: `${umbral} lpm`, medido: `${valor} lpm`};
    }
    case 'hipertension':
    case 'hipotension': {
      const medido = getAlertValue(alert);
      if (medido === '') return null;
      const medidoConUnidad = `${medido} mmHg`;
      const fallbackSist = isCritica
        ? DEFAULT_BP_THRESHOLDS.sistolicaCritical
        : DEFAULT_BP_THRESHOLDS.sistolicaWarning;
      const fallbackDiast = isCritica
        ? DEFAULT_BP_THRESHOLDS.diastolicaCritical
        : DEFAULT_BP_THRESHOLDS.diastolicaWarning;
      const uSist = roundIfNum(datos.umbral_sist) ?? fallbackSist;
      const uDiast = roundIfNum(datos.umbral_diast) ?? fallbackDiast;
      if (uSist != null && uDiast != null) return {limite: `${uSist}/${uDiast} mmHg`, medido: medidoConUnidad};
      if (uSist != null) return {limite: `${uSist} mmHg`, medido: medidoConUnidad};
      if (uDiast != null) return {limite: `${uDiast} mmHg`, medido: medidoConUnidad};
      return null;
    }
    default:
      return null;
  }
}

/**
 * Etiqueta de umbral (sin repetir el valor ya mostrado arriba) para filas del mockup:
 * ej: "Umbral: < 90%", "Umbral crítico: < 90%", "Umbral: > 120 lpm".
 * Solo usa campos existentes en `alert.datos`, devuelve `null` si no hay umbral.
 */
export function getUmbralOnlyLabel(alert: Alerta): string | null {
  const datos = alert.datos;
  if (datos == null) return null;
  const roundIfNum = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null;
  const prefix = alert.severidad === 'critica' && alert.tipo === 'hipoxia' ? 'Umbral crítico' : 'Umbral';

  switch (alert.tipo) {
    case 'hipoxia': {
      const umbral = roundIfNum(datos.umbral_configurado);
      return umbral != null ? `${prefix}: < ${umbral}%` : null;
    }
    case 'hipertension':
    case 'hipotension': {
      const uSist = roundIfNum(datos.umbral_sist);
      const uDiast = roundIfNum(datos.umbral_diast);
      const dir = alert.tipo === 'hipotension' ? '≤' : '≥';
      if (uSist != null && uDiast != null) return `${prefix}: ${dir} ${uSist}/${uDiast} mmHg`;
      if (uSist != null) return `${prefix}: ${dir} ${uSist} mmHg`;
      if (uDiast != null) return `${prefix}: ${dir} ${uDiast} mmHg`;
      return null;
    }
    case 'taquicardia':
    case 'bradicardia': {
      const umbral = roundIfNum(datos.umbral_configurado);
      const dir = alert.tipo === 'bradicardia' ? '<' : '>';
      return umbral != null ? `${prefix}: ${dir} ${umbral} lpm` : null;
    }
    default:
      return null;
  }
}

/**
 * Formatea la hora de la alerta como "10:42 h" según el mockup.
 */
export function formatAlertClockTime(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleTimeString('es-AR', {hour: '2-digit', minute: '2-digit'})} h`;
}

/**
 * Mapeo único tipo de alerta → params de DetalleSigno (CA-03 / SCRUM-191).
 * Única fuente de verdad: misma tabla que usaban InicioScreen y
 * NotificationsProvider (copiada exacta, mismos labels/units/emojis).
 */
export function destinoPorTipoAlerta(tipo: string | undefined): {
  tipoSigno: string;
  label: string;
  unit: string;
  icon: string;
} {
  switch (tipo) {
    case 'hipoxia':
      return {tipoSigno: 'saturacion_oxigeno', label: 'Saturación de oxígeno', unit: '%', icon: '🩸'};
    case 'hipertension':
    case 'hipotension':
      return {tipoSigno: 'presion_sistolica', label: 'Presión arterial', unit: 'mmHg', icon: '❤️'};
    case 'taquicardia':
    case 'bradicardia':
    default:
      return {tipoSigno: 'frecuencia_cardiaca', label: 'Frecuencia cardíaca', unit: 'lpm', icon: '💓'};
  }
}