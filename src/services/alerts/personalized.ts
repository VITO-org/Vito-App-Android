/**
 * Baseline personalizado por paciente — HU-98.
 *
 * Deriva umbrales de alerta personalizados a partir de las estadísticas
 * históricas del propio paciente (media, desviación estándar, P25, P75),
 * calculadas server-side (ver scripts/migrations/2026-08-23_hu98_baseline_personalizado.sql).
 *
 * Reglas de diseño:
 * - Fallback SIEMPRE disponible: si no hay >= minDias días o >= minMuestras
 *   muestras por métrica, se usan los umbrales estándar (OMS / defaults).
 * - Guardarriles absolutos en PERSONALIZATION_DEFAULTS: ninguna derivación
 *   puede salirse de esos rangos, sin importar cuán extremas sean las stats.
 * - BP "jamás más sensible": los umbrales altos derivados nunca bajan del
 *   default OMS y los bajos nunca suben (un paciente crónico relajado no
 *   genera más alertas que con rangos poblacionales).
 * - Funciones puras, sin I/O — el engine las combina con su caché de 1h.
 */
import type {
  Spo2Thresholds,
  BpThresholds,
  HrThresholds,
} from './types';
import {
  DEFAULT_SPO2_THRESHOLDS,
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_HR_THRESHOLDS,
} from './types';
import type {BaselinePersonalizado} from '../supabase/models';

// ─── Tipos ──────────────────────────────────────────────────────

/** Estadísticas de una métrica para un paciente. */
export interface MetricStats {
  /** Media histórica. */
  media: number;
  /** Desviación estándar muestral. */
  desvStd: number;
  /** Percentil 25. */
  p25: number;
  /** Percentil 75. */
  p75: number;
  /** Cantidad de muestras usadas en el cálculo. */
  nMuestras: number;
}

/**
 * Stats personalizadas por métrica (forma normalizada de BaselinePersonalizado).
 * Una métrica es null cuando no alcanzó el mínimo de muestras server-side.
 */
export interface PersonalizedMetrics {
  hr?: MetricStats | null;
  bpSistolica?: MetricStats | null;
  bpDiastolica?: MetricStats | null;
  spo2?: MetricStats | null;
  /** Días distintos con datos dentro de la ventana de cálculo. */
  diasHistorial?: number | null;
  /** Gate global calculado server-side (>= min días y >= min muestras). */
  esValido?: boolean | null;
}

/** Origen efectivo de un umbral aplicado a una alerta. */
export type UmbralOrigen = 'personalizado' | 'estandar';

/** Umbrales por defecto (estándar) sobre los que se aplica la personalización. */
export interface EffectiveDefaults {
  spo2: Spo2Thresholds;
  bp: BpThresholds;
  hr: HrThresholds;
}

/** Resultado del merge defaults + baseline personalizado. */
export interface EffectiveThresholds extends EffectiveDefaults {
  /** Origen efectivo por métrica — se guarda como `umbral_origen` en datos jsonb. */
  origen: {spo2: UmbralOrigen; bp: UmbralOrigen; hr: UmbralOrigen};
}

/**
 * Guardarril de un par warning/critical.
 * Para pares "alto" (taqui/hipertensión): critical > warning + gap.
 * Para pares "bajo" (bradi/hipotensión/SpO2): critical < warning - gap.
 */
export interface ThresholdGuardrail {
  warningMin: number;
  warningMax: number;
  criticalMin: number;
  criticalMax: number;
  /** Separación mínima exigida entre warning y critical. */
  gap: number;
}

/** Configuración completa de personalización — constantes clínicas en un solo objeto. */
export interface PersonalizationConfig {
  /** Ventana de historial (días) que usa el cálculo server-side. */
  ventanaDias: number;
  /** Mínimo de días con datos para aplicar personalización (fallback si no). */
  minDias: number;
  /** Mínimo de muestras por métrica para derivar sus umbrales. */
  minMuestras: number;
  /** Desviaciones estándar desde la media para el umbral de advertencia. */
  sigmasWarning: number;
  /** Desviaciones estándar desde la media para el umbral crítico. */
  sigmasCritical: number;
  /** SpO2 (%): advertencia/crítica hacia abajo. */
  spo2: ThresholdGuardrail;
  /** FC taquicardia (lpm): par alto. */
  hrTachy: ThresholdGuardrail;
  /** FC bradicardia (lpm): par bajo. */
  hrBrady: ThresholdGuardrail;
  /** PA sistólica alta (mmHg): par alto. */
  bpSistHigh: ThresholdGuardrail;
  /** PA sistólica baja (mmHg): par bajo. */
  bpSistLow: ThresholdGuardrail;
  /** PA diastólica alta (mmHg): par alto. */
  bpDiastHigh: ThresholdGuardrail;
  /** PA diastólica baja (mmHg): par bajo. */
  bpDiastLow: ThresholdGuardrail;
}

/**
 * Guardarriles absolutos HU-98.
 * Los rangos high-side tienen warningMin = default OMS → jamás más sensible.
 * Los rangos low-side tienen warningMax = default OMS → jamás más sensible.
 */
export const PERSONALIZATION_DEFAULTS: PersonalizationConfig = {
  ventanaDias: 28,
  minDias: 7,
  minMuestras: 30,
  sigmasWarning: 2,
  sigmasCritical: 3,

  // SpO2 (%): warn ∈ [88, 93], crit ∈ [83, 90]
  spo2: {warningMin: 88, warningMax: 93, criticalMin: 83, criticalMax: 90, gap: 3},

  // FC (lpm): taqui warn ∈ [100, 110] (min = OMS), crit ∈ [120, 140]
  hrTachy: {warningMin: 100, warningMax: 110, criticalMin: 120, criticalMax: 140, gap: 5},
  // FC (lpm): bradi warn ∈ [42, 50] (max = OMS, atleta sin falsa bradicardia), crit ∈ [32, 40]
  hrBrady: {warningMin: 42, warningMax: 50, criticalMin: 32, criticalMax: 40, gap: 5},

  // PA sistólica alta (mmHg): warn ∈ [140, 160] (min = OMS), crit ∈ [160, 185]
  bpSistHigh: {warningMin: 140, warningMax: 160, criticalMin: 160, criticalMax: 185, gap: 15},
  // PA sistólica baja (mmHg): warn ∈ [70, 90] (max = OMS), crit ∈ [60, 80]
  bpSistLow: {warningMin: 70, warningMax: 90, criticalMin: 60, criticalMax: 80, gap: 10},
  // PA diastólica alta (mmHg): warn ∈ [90, 105] (min = OMS), crit ∈ [100, 120]
  bpDiastHigh: {warningMin: 90, warningMax: 105, criticalMin: 100, criticalMax: 120, gap: 10},
  // PA diastólica baja (mmHg): warn ∈ [45, 60] (max = OMS), crit ∈ [35, 50]
  bpDiastLow: {warningMin: 45, warningMax: 60, criticalMin: 35, criticalMax: 50, gap: 10},
};

// ─── Helpers ────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Redondea a entero y aplica guardarriles. */
function roundAndClamp(value: number, min: number, max: number): number {
  return clamp(Math.round(value), min, max);
}

/**
 * Par "alto" (critical > warning): deriva warning/critical como media ± k·σ
 * con guardarriles e invariante de separación mínima.
 */
function deriveHighPair(
  stats: MetricStats,
  g: ThresholdGuardrail,
  config: PersonalizationConfig,
): {warning: number; critical: number} {
  const warning = roundAndClamp(
    stats.media + config.sigmasWarning * stats.desvStd,
    g.warningMin,
    g.warningMax,
  );
  let critical = roundAndClamp(
    stats.media + config.sigmasCritical * stats.desvStd,
    g.criticalMin,
    g.criticalMax,
  );
  if (critical < warning + g.gap) {
    critical = clamp(warning + g.gap, g.criticalMin, g.criticalMax);
  }
  return {warning, critical};
}

/**
 * Par "bajo" (critical < warning): deriva warning/critical como media − k·σ
 * con guardarriles e invariante de separación mínima.
 */
function deriveLowPair(
  stats: MetricStats,
  g: ThresholdGuardrail,
  config: PersonalizationConfig,
): {warning: number; critical: number} {
  const warning = roundAndClamp(
    stats.media - config.sigmasWarning * stats.desvStd,
    g.warningMin,
    g.warningMax,
  );
  let critical = roundAndClamp(
    stats.media - config.sigmasCritical * stats.desvStd,
    g.criticalMin,
    g.criticalMax,
  );
  if (critical > warning - g.gap) {
    critical = clamp(warning - g.gap, g.criticalMin, g.criticalMax);
  }
  return {warning, critical};
}

// ─── Derivación de umbrales ─────────────────────────────────────

/** SpO2: desviación bajo la media personal (media − k·σ), con guardarriles. */
export function deriveSpo2Thresholds(
  stats: MetricStats,
  config: PersonalizationConfig = PERSONALIZATION_DEFAULTS,
): Spo2Thresholds {
  const {warning, critical} = deriveLowPair(stats, config.spo2, config);
  return {warningPercent: warning, criticalPercent: critical};
}

/**
 * FC: bradicardia adaptada al perfil (atleta → bradyWarning baja hasta el
 * guardarril, sin falsa bradicardia); taquicardia nunca más sensible que OMS
 * (hrTachy.warningMin = 100).
 */
export function deriveHrThresholds(
  stats: MetricStats,
  config: PersonalizationConfig = PERSONALIZATION_DEFAULTS,
): HrThresholds {
  const tachy = deriveHighPair(stats, config.hrTachy, config);
  const brady = deriveLowPair(stats, config.hrBrady, config);
  return {
    tachyWarning: tachy.warning,
    tachyCritical: tachy.critical,
    bradyWarning: brady.warning,
    bradyCritical: brady.critical,
  };
}

/**
 * PA: los 8 umbrales derivados de las stats del paciente.
 * Alta: media + k·σ acotada a >= OMS (paciente crónico relajado).
 * Baja: media − k·σ acotada a <= OMS (jamás más sensible).
 */
export function deriveBpThresholds(
  stats: MetricStats,
  config: PersonalizationConfig = PERSONALIZATION_DEFAULTS,
): BpThresholds {
  const sistHigh = deriveHighPair(stats, config.bpSistHigh, config);
  const sistLow = deriveLowPair(stats, config.bpSistLow, config);
  const diastHigh = deriveHighPair(stats, config.bpDiastHigh, config);
  const diastLow = deriveLowPair(stats, config.bpDiastLow, config);
  return {
    sistolicaWarning: sistHigh.warning,
    sistolicaCritical: sistHigh.critical,
    diastolicaWarning: diastHigh.warning,
    diastolicaCritical: diastHigh.critical,
    sistolicaLowWarning: sistLow.warning,
    sistolicaLowCritical: sistLow.critical,
    diastolicaLowWarning: diastLow.warning,
    diastolicaLowCritical: diastLow.critical,
  };
}

// ─── Mapeo fila BD → stats normalizadas ─────────────────────────

function metricStatsOrNull(
  media: number | null,
  desvStd: number | null,
  p25: number | null,
  p75: number | null,
  nMuestras: number | null,
): MetricStats | null {
  if (media == null || desvStd == null || nMuestras == null) return null;
  return {
    media,
    desvStd,
    p25: p25 ?? media,
    p75: p75 ?? media,
    nMuestras,
  };
}

/** Convierte una fila de baseline_personalizado en stats normalizadas. */
export function baselineRowToMetrics(row: BaselinePersonalizado): PersonalizedMetrics {
  return {
    hr: metricStatsOrNull(row.hr_media, row.hr_desv_std, row.hr_p25, row.hr_p75, row.hr_n_muestras),
    bpSistolica: metricStatsOrNull(
      row.bp_sist_media, row.bp_sist_desv_std, row.bp_sist_p25, row.bp_sist_p75, row.bp_sist_n_muestras,
    ),
    bpDiastolica: metricStatsOrNull(
      row.bp_diast_media, row.bp_diast_desv_std, row.bp_diast_p25, row.bp_diast_p75, row.bp_diast_n_muestras,
    ),
    spo2: metricStatsOrNull(
      row.spo2_media, row.spo2_desv_std, row.spo2_p25, row.spo2_p75, row.spo2_n_muestras,
    ),
    diasHistorial: row.dias_historial,
    esValido: row.es_valido,
  };
}

// ─── Merge defaults + personalizado ─────────────────────────────

/**
 * Aplica el baseline personalizado sobre los defaults, métrica por métrica.
 * Una métrica usa sus umbrales personalizados solo si:
 *   - el gate global pasa (es_valido !== false y dias_historial >= minDias), y
 *   - la métrica tiene stats y >= minMuestras muestras, y
 *   - la varianza no es degenerada (desvStd > 0).
 * Si algo falla → fallback silencioso a los umbrales estándar de esa métrica.
 */
export function resolveEffectiveThresholds(
  defaults: EffectiveDefaults,
  metrics: PersonalizedMetrics | null | undefined,
  config: PersonalizationConfig = PERSONALIZATION_DEFAULTS,
): EffectiveThresholds {
  const result: EffectiveThresholds = {
    spo2: {...defaults.spo2},
    bp: {...defaults.bp},
    hr: {...defaults.hr},
    origen: {spo2: 'estandar', bp: 'estandar', hr: 'estandar'},
  };

  if (!metrics) return result;

  // Gate global: es_valido undefined (fila vieja) no bloquea — sigue el gate por muestra.
  const globalOk =
    metrics.esValido !== false &&
    (metrics.diasHistorial == null || metrics.diasHistorial >= config.minDias);

  const aplicaMetrica = (stats?: MetricStats | null): stats is MetricStats =>
    !!globalOk && !!stats && stats.nMuestras >= config.minMuestras && stats.desvStd > 0;

  if (aplicaMetrica(metrics.hr)) {
    result.hr = deriveHrThresholds(metrics.hr, config);
    result.origen.hr = 'personalizado';
  }
  if (aplicaMetrica(metrics.spo2)) {
    result.spo2 = deriveSpo2Thresholds(metrics.spo2, config);
    result.origen.spo2 = 'personalizado';
  }
  if (aplicaMetrica(metrics.bpSistolica) && aplicaMetrica(metrics.bpDiastolica)) {
    // BP se aplica solo con ambas componentes válidas: alerta combinada coherente.
    result.bp = deriveBpThresholds(metrics.bpSistolica, config);
    // Re-deriva diastólica con sus propias stats para los pares diast.
    const diast = deriveBpThresholds(metrics.bpDiastolica, config);
    result.bp.diastolicaWarning = diast.diastolicaWarning;
    result.bp.diastolicaCritical = diast.diastolicaCritical;
    result.bp.diastolicaLowWarning = diast.diastolicaLowWarning;
    result.bp.diastolicaLowCritical = diast.diastolicaLowCritical;
    result.origen.bp = 'personalizado';
  }

  return result;
}
