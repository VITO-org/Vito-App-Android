/**
 * Utilidad compartida para construir la lista de signos vitales y métricas
 * a partir de HealthSummary.
 *
 * Único punto de definición — evita duplicar la lógica de formato
 * en InicioScreen, TodosLosSignosScreen y cualquier otra pantalla.
 */
import type {HealthSummary} from '../types/health';
import type {AppIconName} from '../components/AppIcon';
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
  /** Emoji del icono (fallback cuando no hay iconName) */
  icon: string;
  /** Nombre del icono PNG en AppIcon (reemplaza al emoji cuando está presente) */
  iconName?: AppIconName;
  /** Tamaño del icono PNG (opcional, default definido por el componente) */
  iconSize?: number;
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
    iconName: 'frecuencia-cardiaca',
    iconSize: 36,
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
    iconName: 'presion-arterial',
    iconSize: 36,
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
    iconName: 'presion-arterial',
    iconSize: 36,
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
    iconName: 'oxigenacion',
    iconSize: 36,
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
    iconName: 'temperatura',
    iconSize: 36,
    iconBgColor: colors.tempRed,
    trend: summary?.bodyTemperatureCelsius != null
      ? summary.bodyTemperatureCelsius > temp.max ? 'up' : summary.bodyTemperatureCelsius < temp.min ? 'down' : 'stable'
      : 'stable',
    rangeLabel: `${temp.min}-${temp.max} °C`,
    rawValue: summary?.bodyTemperatureCelsius ?? null,
  });

  // ── Resumen del día (actividad diaria) ──

  const pasos = summary?.steps;
  items.push({
    id: 'pasos',
    label: 'Pasos',
    value: pasos != null && pasos > 0 ? pasos.toLocaleString('es-ES') : '--',
    unit: 'hoy',
    icon: '👣',
    iconName: 'pasos',
    iconSize: 36,
    iconBgColor: colors.primary,
    trend: undefined,
    rangeLabel: '',
    rawValue: pasos ?? null,
  });

  const calorias = summary?.caloriesKcal;
  items.push({
    id: 'calorias',
    label: 'Calorías',
    value: calorias != null && calorias > 0 ? `${calorias.toFixed(0)}` : '--',
    unit: 'kcal',
    icon: '🔥',
    iconName: 'calorias',
    iconSize: 36,
    iconBgColor: colors.warning,
    trend: undefined,
    rangeLabel: '',
    rawValue: calorias ?? null,
  });

  const dist = summary?.distanceMeters;
  items.push({
    id: 'distancia',
    label: 'Distancia',
    value: dist != null && dist > 0
      ? dist >= 1000
        ? `${(dist / 1000).toFixed(2)}`
        : `${dist.toFixed(0)}`
      : '--',
    unit: dist != null && dist >= 1000 ? 'km' : 'm',
    icon: '📏',
    iconName: 'distancia',
    iconSize: 36,
    iconBgColor: colors.oxygenBlue,
    trend: undefined,
    rangeLabel: '',
    rawValue: dist ?? null,
  });

  // ── Bienestar ──

  const sueno = summary?.sleepMinutes;
  items.push({
    id: 'sueno',
    label: 'Sueño',
    value: sueno != null && sueno > 0 ? (sueno / 60).toFixed(1) : '--',
    unit: 'h',
    icon: '😴',
    iconName: 'sueno',
    iconSize: 36,
    iconBgColor: '#7C3AED',
    trend: undefined,
    rangeLabel: '',
    rawValue: sueno ?? null,
  });

  return items;
}

// ──────────────────────────────────────────────
// Resumen histórico (usado por HistorialScreen)
// ──────────────────────────────────────────────

export interface Resumen {
  frecCardiaca: {avg: number; min: number; max: number; count: number};
  sistolica: {avg: number; min: number; max: number; count: number};
  diastolica: {avg: number; min: number; max: number; count: number};
  spo2: {avg: number; min: number; max: number; count: number};
  temperatura: {avg: number; min: number; max: number; count: number};
  pasos: {avg: number; total: number; count: number};
  sueno: {avg: number; count: number};
}

/**
 * Construye la lista de signos vitales y métricas a partir del
 * Resumen histórico (promedios + rangos). Misma config visual que
 * buildSignosFromSummary pero con valores del período seleccionado.
 */
export function buildSignosFromResumen(resumen: Resumen): SignoVitalItem[] {
  const fc = NORMAL_RANGES.frecuencia_cardiaca;
  const sist = NORMAL_RANGES.presion_sistolica;
  const diast = NORMAL_RANGES.presion_diastolica;
  const spo2 = NORMAL_RANGES.saturacion_oxigeno;
  const temp = NORMAL_RANGES.temperatura;

  return [
    {
      id: 'frecuencia_cardiaca',
      label: 'Frecuencia cardíaca',
      value: resumen.frecCardiaca.count > 0 ? `${Math.round(resumen.frecCardiaca.avg)}` : '--',
      unit: 'lpm',
      icon: '❤️',
      iconName: 'frecuencia-cardiaca',
      iconSize: 36,
      iconBgColor: colors.heartRed,
      trend: resumen.frecCardiaca.avg > fc.max ? 'up' : resumen.frecCardiaca.avg < fc.min ? 'down' : 'stable',
      rangeLabel: `${Math.round(resumen.frecCardiaca.min)}-${Math.round(resumen.frecCardiaca.max)} lpm`,
      rawValue: resumen.frecCardiaca.count > 0 ? resumen.frecCardiaca.avg : null,
    },
    {
      id: 'presion_sistolica',
      label: 'Sistólica',
      value: resumen.sistolica.count > 0 ? `${Math.round(resumen.sistolica.avg)}` : '--',
      unit: 'mmHg',
      icon: '🫀',
      iconName: 'presion-arterial',
      iconSize: 36,
      iconBgColor: colors.danger,
      trend: resumen.sistolica.avg > sist.max ? 'up' : 'stable',
      rangeLabel: `${Math.round(resumen.sistolica.min)}-${Math.round(resumen.sistolica.max)} mmHg`,
      rawValue: resumen.sistolica.count > 0 ? resumen.sistolica.avg : null,
    },
    {
      id: 'presion_diastolica',
      label: 'Diastólica',
      value: resumen.diastolica.count > 0 ? `${Math.round(resumen.diastolica.avg)}` : '--',
      unit: 'mmHg',
      icon: '🫀',
      iconName: 'presion-arterial',
      iconSize: 36,
      iconBgColor: colors.danger,
      trend: resumen.diastolica.avg > diast.max ? 'up' : 'stable',
      rangeLabel: `${Math.round(resumen.diastolica.min)}-${Math.round(resumen.diastolica.max)} mmHg`,
      rawValue: resumen.diastolica.count > 0 ? resumen.diastolica.avg : null,
    },
    {
      id: 'saturacion_oxigeno',
      label: 'Oxigenación',
      value: resumen.spo2.count > 0 ? resumen.spo2.avg.toFixed(1) : '--',
      unit: '%',
      icon: '💧',
      iconName: 'oxigenacion',
      iconSize: 36,
      iconBgColor: colors.oxygenBlue,
      trend: resumen.spo2.avg >= spo2.min ? 'stable' : 'down',
      rangeLabel: `${resumen.spo2.min.toFixed(0)}-${resumen.spo2.max.toFixed(0)}%`,
      rawValue: resumen.spo2.count > 0 ? resumen.spo2.avg : null,
    },
    {
      id: 'temperatura',
      label: 'Temperatura',
      value: resumen.temperatura.count > 0 ? resumen.temperatura.avg.toFixed(1) : '--',
      unit: '°C',
      icon: '🌡️',
      iconName: 'temperatura',
      iconSize: 36,
      iconBgColor: colors.tempRed,
      trend: resumen.temperatura.avg > temp.max ? 'up' : resumen.temperatura.avg < temp.min ? 'down' : 'stable',
      rangeLabel: `${resumen.temperatura.min.toFixed(1)}-${resumen.temperatura.max.toFixed(1)} °C`,
      rawValue: resumen.temperatura.count > 0 ? resumen.temperatura.avg : null,
    },
    {
      id: 'pasos',
      label: 'Pasos',
      value: resumen.pasos.count > 0 ? resumen.pasos.total.toLocaleString('es-ES') : '--',
      unit: 'total',
      icon: '👣',
      iconName: 'pasos',
      iconSize: 36,
      iconBgColor: colors.primary,
      trend: undefined,
      rangeLabel: resumen.pasos.count > 0
        ? `Ø ${Math.round(resumen.pasos.avg).toLocaleString('es-ES')}/día`
        : '',
      rawValue: resumen.pasos.count > 0 ? resumen.pasos.total : null,
    },
    {
      id: 'sueno',
      label: 'Sueño',
      value: resumen.sueno.count > 0 ? resumen.sueno.avg.toFixed(1) : '--',
      unit: 'h',
      icon: '😴',
      iconName: 'sueno',
      iconSize: 36,
      iconBgColor: '#7C3AED',
      trend: undefined,
      rangeLabel: resumen.sueno.count > 0 ? `${resumen.sueno.count} registros` : '',
      rawValue: resumen.sueno.count > 0 ? resumen.sueno.avg : null,
    },
  ];
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
