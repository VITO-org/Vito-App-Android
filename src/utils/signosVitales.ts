/**
 * Utilidad compartida para construir la lista de signos vitales y métricas
 * a partir de HealthSummary.
 *
 * Único punto de definición — evita duplicar la lógica de formato
 * en InicioScreen, TodosLosSignosScreen y cualquier otra pantalla.
 */
import type {HealthSummary} from '../types/health';
import {colors} from '../theme';
import {NORMAL_RANGES} from '../data/mockReportes';

export interface SignoVitalItem {
  /** ID interno */
  id: string;
  /** Nombre visible */
  label: string;
  /** Valor formateado como string ("--" si no hay dato) */
  value: string;
  /** Unidad de medida */
  unit: string;
  /** Emoji del icono */
  icon: string;
  /** Color de fondo del icono */
  iconBgColor: string;
  /** Tendencia contra rango normal */
  trend?: 'up' | 'down' | 'stable';
  /** Rango normal formateado (vacío para métricas sin rango) */
  rangeLabel: string;
  /** Valor numérico crudo, null si no hay dato */
  rawValue: number | null;
}

/**
 * Construye el listado completo de signos vitales y métricas
 * a partir del HealthSummary.
 */
export function buildSignosFromSummary(summary: HealthSummary | null): SignoVitalItem[] {
  const items: SignoVitalItem[] = [];
  const fc = NORMAL_RANGES.frecuencia_cardiaca;
  const sist = NORMAL_RANGES.presion_sistolica;
  const diast = NORMAL_RANGES.presion_diastolica;
  const spo2 = NORMAL_RANGES.saturacion_oxigeno;
  const temp = NORMAL_RANGES.temperatura;

  // ── Signos vitales ──

  items.push({
    id: 'frecuencia_cardiaca',
    label: 'Frecuencia cardíaca',
    value: summary?.averageBpm != null ? String(Math.round(summary.averageBpm)) : '--',
    unit: 'lpm',
    icon: '❤️',
    iconBgColor: colors.heartRed,
    trend: summary?.averageBpm != null
      ? summary.averageBpm > fc.max ? 'up' : summary.averageBpm < fc.min ? 'down' : 'stable'
      : 'stable',
    rangeLabel: `${fc.min}-${fc.max} lpm`,
    rawValue: summary?.averageBpm ?? null,
  });

  items.push({
    id: 'presion_sistolica',
    label: 'Sistólica',
    value: summary?.bloodPressureSystolic != null ? String(Math.round(summary.bloodPressureSystolic)) : '--',
    unit: 'mmHg',
    icon: '🫀',
    iconBgColor: colors.danger,
    trend: summary?.bloodPressureSystolic != null
      ? summary.bloodPressureSystolic > sist.max ? 'up' : 'stable'
      : 'stable',
    rangeLabel: `${sist.min}-${sist.max} mmHg`,
    rawValue: summary?.bloodPressureSystolic ?? null,
  });

  items.push({
    id: 'presion_diastolica',
    label: 'Diastólica',
    value: summary?.bloodPressureDiastolic != null ? String(Math.round(summary.bloodPressureDiastolic)) : '--',
    unit: 'mmHg',
    icon: '🫀',
    iconBgColor: colors.danger,
    trend: summary?.bloodPressureDiastolic != null
      ? summary.bloodPressureDiastolic > diast.max ? 'up' : 'stable'
      : 'stable',
    rangeLabel: `${diast.min}-${diast.max} mmHg`,
    rawValue: summary?.bloodPressureDiastolic ?? null,
  });

  items.push({
    id: 'saturacion_oxigeno',
    label: 'Oxigenación',
    value: summary?.spo2Percent != null ? String(Math.round(summary.spo2Percent)) : '--',
    unit: '%',
    icon: '💧',
    iconBgColor: colors.oxygenBlue,
    trend: summary?.spo2Percent != null
      ? summary.spo2Percent >= spo2.min ? 'stable' : 'down'
      : 'stable',
    rangeLabel: `${spo2.min}-${spo2.max}%`,
    rawValue: summary?.spo2Percent ?? null,
  });

  items.push({
    id: 'temperatura',
    label: 'Temperatura',
    value: summary?.bodyTemperatureCelsius != null ? summary.bodyTemperatureCelsius.toFixed(1) : '--',
    unit: '°C',
    icon: '🌡️',
    iconBgColor: colors.tempRed,
    trend: summary?.bodyTemperatureCelsius != null
      ? summary.bodyTemperatureCelsius > temp.max ? 'up' : summary.bodyTemperatureCelsius < temp.min ? 'down' : 'stable'
      : 'stable',
    rangeLabel: `${temp.min}-${temp.max} °C`,
    rawValue: summary?.bodyTemperatureCelsius ?? null,
  });

  // ── Resumen del día (actividad diaria) ──

  items.push({
    id: 'pasos',
    label: 'Pasos',
    value: summary?.steps ? summary.steps.toLocaleString('es-ES') : '--',
    unit: 'hoy',
    icon: '👣',
    iconBgColor: colors.primary,
    trend: undefined,
    rangeLabel: '',
    rawValue: summary?.steps ?? null,
  });

  items.push({
    id: 'calorias',
    label: 'Calorías',
    value: summary?.caloriesKcal != null ? `${summary.caloriesKcal.toFixed(0)}` : '--',
    unit: 'kcal',
    icon: '🔥',
    iconBgColor: colors.warning,
    trend: undefined,
    rangeLabel: '',
    rawValue: summary?.caloriesKcal ?? null,
  });

  items.push({
    id: 'distancia',
    label: 'Distancia',
    value: summary?.distanceMeters
      ? summary.distanceMeters >= 1000
        ? `${(summary.distanceMeters / 1000).toFixed(2)}`
        : `${summary.distanceMeters.toFixed(0)}`
      : '--',
    unit: summary?.distanceMeters && summary.distanceMeters >= 1000 ? 'km' : 'm',
    icon: '📏',
    iconBgColor: colors.oxygenBlue,
    trend: undefined,
    rangeLabel: '',
    rawValue: summary?.distanceMeters ?? null,
  });

  // ── Bienestar ──

  items.push({
    id: 'sueno',
    label: 'Sueño',
    value: summary?.sleepMinutes ? (summary.sleepMinutes / 60).toFixed(1) : '--',
    unit: 'h',
    icon: '😴',
    iconBgColor: '#7C3AED',
    trend: undefined,
    rangeLabel: '',
    rawValue: summary?.sleepMinutes ?? null,
  });

  return items;
}

/**
 * Filtra solo los signos vitales clínicos.
 */
export function getSignosVitales(signos: SignoVitalItem[]): SignoVitalItem[] {
  const vitalIds = new Set([
    'frecuencia_cardiaca',
    'presion_sistolica',
    'presion_diastolica',
    'saturacion_oxigeno',
    'temperatura',
  ]);
  return signos.filter(s => vitalIds.has(s.id));
}

/**
 * Filtra solo métricas de bienestar.
 */
export function getMetricasBienestar(signos: SignoVitalItem[]): SignoVitalItem[] {
  return signos.filter(s => ['pasos', 'calorias', 'distancia', 'sueno'].includes(s.id));
}
