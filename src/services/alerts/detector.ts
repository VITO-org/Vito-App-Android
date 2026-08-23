/**
 * Hypoxia detection engine — HU-41 CA-01 / CA-04.
 * Extended HU-43: Blood pressure alert detection.
 *
 * Pure functions that evaluate SpO2 and BP readings against configurable thresholds
 * and determine whether an alert should be generated and at what severity.
 *
 * Design rationale:
 * - All functions are pure (no side effects, no I/O) -> fully testable.
 * - Thresholds are injected, not read from global state -> supports per-user
 *   customization and baseline-based adjustment (HU-44).
 * - Deduplication logic lives here: if an active alert already exists for the
 *   same severity level, no new alert is generated.
 */
import type {
  AlertSeverity,
  DetectionResult,
  Spo2EvaluationInput,
  Spo2Thresholds,
  AlertRecordInsert,
  BpThresholds,
  BpEvaluationInput,
  BpDetectionResult,
  BpSingleResult,
  BpContextoEspecial,
  BpContextoOverrides,
} from './types';
import {DEFAULT_SPO2_THRESHOLDS, DEFAULT_BP_CONTEXTO_OVERRIDES} from './types';

// --- Severity Rank Helper ---

function severityRank(s: AlertSeverity): number {
  return s === 'critica' ? 2 : s === 'advertencia' ? 1 : 0;
}

// ======================================================================
// SpO2 DETECTION (HU-41)
// ======================================================================

/**
 * Evaluate a SpO2 reading against thresholds and determine alert action.
 */
export function evaluateSpo2(input: Spo2EvaluationInput): DetectionResult {
  const {spo2Percent, thresholds, hasActiveAlert, activeAlertSeverity} = input;
  const severity = classifySeverity(spo2Percent, thresholds);

  if (severity === null) {
    return {shouldAlert: false, severity: null, thresholdExceeded: null, isNewEpisode: false};
  }

  if (!hasActiveAlert) {
    return {
      shouldAlert: true,
      severity,
      thresholdExceeded: severity === 'critica' ? thresholds.criticalPercent : thresholds.warningPercent,
      isNewEpisode: true,
    };
  }

  const activeRank = severityRank(activeAlertSeverity ?? 'advertencia');
  const newRank = severityRank(severity);

  if (newRank > activeRank) {
    return {
      shouldAlert: true,
      severity,
      thresholdExceeded: severity === 'critica' ? thresholds.criticalPercent : thresholds.warningPercent,
      isNewEpisode: false,
    };
  }

  return {shouldAlert: false, severity, thresholdExceeded: null, isNewEpisode: false};
}

/**
 * Classify SpO2 value into a severity level (pure function).
 */
export function classifySeverity(
  spo2Percent: number,
  thresholds: Spo2Thresholds = DEFAULT_SPO2_THRESHOLDS,
): AlertSeverity | null {
  if (spo2Percent < thresholds.criticalPercent) return 'critica';
  if (spo2Percent < thresholds.warningPercent) return 'advertencia';
  return null;
}

/**
 * Build an AlertRecordInsert from a SpO2 detection result.
 */
export function buildAlertRecord(
  input: Spo2EvaluationInput,
  detection: DetectionResult,
  userId: string,
  now: Date = new Date(),
): AlertRecordInsert {
  if (!detection.shouldAlert || !detection.severity) {
    throw new Error('buildAlertRecord called without an alert-worthy detection');
  }

  const valorReg = input.spo2Percent;
  const umbral = detection.thresholdExceeded ?? input.thresholds.warningPercent;

  const titulo =
    detection.severity === 'critica'
      ? 'Alerta crítica: SpO₂ muy baja'
      : 'Alerta: SpO₂ baja';

  const mensaje =
    detection.severity === 'critica'
      ? `Saturación de oxígeno en ${valorReg}% (umbral crítico: ${umbral}%). Seek immediate medical attention.`
      : `Saturación de oxígeno en ${valorReg}% (umbral de alerta: ${umbral}%). Monitor closely.`;

  return {
    id_usuario: userId,
    id_dato_reloj: null,
    id_prediccion_riesgo: null,
    tipo: 'hipoxia',
    severidad: detection.severity,
    titulo,
    mensaje,
    datos: {
      valor_registrado: valorReg,
      umbral_configurado: umbral,
      dispositivo_origen: input.dispositivoOrigen,
      escalada: false,
    },
    expira_en: null,
  };
}

/**
 * Check if a SpO2 reading indicates the episode has resolved.
 */
export function isEpisodeResolved(
  spo2Percent: number,
  thresholds: Spo2Thresholds = DEFAULT_SPO2_THRESHOLDS,
): boolean {
  return spo2Percent >= thresholds.warningPercent;
}

// ======================================================================
// BLOOD PRESSURE DETECTION (HU-43)
// ======================================================================

/**
 * Resolve effective thresholds based on the measurement context (CA-04).
 * If a special context is active and overrides are provided, merge them
 * into the base thresholds.
 */
export function resolveBpThresholds(
  baseThresholds: BpThresholds,
  contexto: BpContextoEspecial = 'normal',
  contextoOverrides?: BpContextoOverrides,
): BpThresholds {
  if (contexto === 'normal') {
    return baseThresholds;
  }

  const allOverrides = contextoOverrides ?? DEFAULT_BP_CONTEXTO_OVERRIDES;
  const overrides =
    contexto === 'post_medicacion'
      ? allOverrides.post_medicacion
      : contexto === 'reposo_nocturno'
        ? allOverrides.reposo_nocturno
        : undefined;

  if (!overrides) return baseThresholds;

  return {...baseThresholds, ...overrides};
}

/**
 * Classify a single BP value into a severity level.
 */
function classifySingleBp(
  value: number,
  warningThreshold: number,
  criticalThreshold: number,
  direction: 'high' | 'low',
): AlertSeverity | null {
  if (direction === 'high') {
    if (value >= criticalThreshold) return 'critica';
    if (value >= warningThreshold) return 'advertencia';
  } else {
    if (value <= criticalThreshold) return 'critica';
    if (value <= warningThreshold) return 'advertencia';
  }
  return null;
}

/**
 * Evaluate a single BP value against thresholds (pure function).
 */
function evaluateSingleBp(
  value: number,
  warningHigh: number,
  criticalHigh: number,
  warningLow: number,
  criticalLow: number,
): BpSingleResult {
  const highSeverity = classifySingleBp(value, warningHigh, criticalHigh, 'high');
  if (highSeverity) {
    return {
      shouldAlert: true,
      severity: highSeverity,
      thresholdExceeded: highSeverity === 'critica' ? criticalHigh : warningHigh,
    };
  }

  const lowSeverity = classifySingleBp(value, warningLow, criticalLow, 'low');
  if (lowSeverity) {
    return {
      shouldAlert: true,
      severity: lowSeverity,
      thresholdExceeded: lowSeverity === 'critica' ? criticalLow : warningLow,
    };
  }

  return {shouldAlert: false, severity: null, thresholdExceeded: null};
}

/**
 * Evaluate BP reading against thresholds and determine alert action (CA-01, CA-02, CA-05).
 *
 * Evaluates systolic and diastolic independently (CA-01), then determines
 * if a combined alert is needed (CA-05).
 *
 * Dedup logic: same severity = no new alert; worse severity = escalate.
 */
export function evaluateBp(input: BpEvaluationInput): BpDetectionResult {
  const {
    sistolica,
    diastolica,
    hasActiveAlert,
    activeAlertSeverity,
    contexto = 'normal',
    contextoOverrides = DEFAULT_BP_CONTEXTO_OVERRIDES,
  } = input;

  const effectiveThresholds = resolveBpThresholds(
    input.thresholds,
    contexto,
    contextoOverrides,
  );

  const sistResult = evaluateSingleBp(
    sistolica,
    effectiveThresholds.sistolicaWarning,
    effectiveThresholds.sistolicaCritical,
    effectiveThresholds.sistolicaLowWarning,
    effectiveThresholds.sistolicaLowCritical,
  );

  const diastResult = evaluateSingleBp(
    diastolica,
    effectiveThresholds.diastolicaWarning,
    effectiveThresholds.diastolicaCritical,
    effectiveThresholds.diastolicaLowWarning,
    effectiveThresholds.diastolicaLowCritical,
  );

  const systolicAlert = sistResult.shouldAlert;
  const diastolicAlert = diastResult.shouldAlert;

  if (!systolicAlert && !diastolicAlert) {
    return {
      sistolica: sistResult,
      diastolica: diastResult,
      shouldAlert: false,
      severity: null,
      isCombined: false,
      isNewEpisode: false,
    };
  }

  // Overall severity = max of both (CA-05)
  let overallSeverity: AlertSeverity;
  const sistSev = sistResult.severity;
  const diastSev = diastResult.severity;

  if (sistSev && diastSev) {
    overallSeverity = severityRank(sistSev) >= severityRank(diastSev) ? sistSev : diastSev;
  } else {
    overallSeverity = sistSev ?? diastSev!;
  }

  const isCombined = systolicAlert && diastolicAlert;

  // Dedup logic
  if (!hasActiveAlert) {
    return {
      sistolica: sistResult,
      diastolica: diastResult,
      shouldAlert: true,
      severity: overallSeverity,
      isCombined,
      isNewEpisode: true,
    };
  }

  const activeRank = severityRank(activeAlertSeverity ?? 'advertencia');
  const newRank = severityRank(overallSeverity);

  if (newRank > activeRank) {
    return {
      sistolica: sistResult,
      diastolica: diastResult,
      shouldAlert: true,
      severity: overallSeverity,
      isCombined,
      isNewEpisode: false,
    };
  }

  return {
    sistolica: sistResult,
    diastolica: diastResult,
    shouldAlert: false,
    severity: overallSeverity,
    isCombined,
    isNewEpisode: false,
  };
}

/**
 * Determine the alert type based on which value triggered and its direction.
 * Returns 'hipertension' if above-normal, 'hipotension' if below-normal.
 * For combined alerts, returns the type with the higher severity.
 */
function resolveBpAlertType(
  sistResult: BpSingleResult,
  diastResult: BpSingleResult,
  thresholds: BpThresholds,
  sistolica: number,
  diastolica: number,
): 'hipertension' | 'hipotension' {
  const sistIsHypertension = sistResult.shouldAlert && sistolica >= thresholds.sistolicaWarning;
  const sistIsHypotension = sistResult.shouldAlert && sistolica <= thresholds.sistolicaLowWarning;
  const diastIsHypertension = diastResult.shouldAlert && diastolica >= thresholds.diastolicaWarning;
  const diastIsHypotension = diastResult.shouldAlert && diastolica <= thresholds.diastolicaLowWarning;

  const anyHypertension = sistIsHypertension || diastIsHypertension;
  const anyHypotension = sistIsHypotension || diastIsHypotension;

  if (anyHypertension && anyHypotension) {
    // Mixed: pick the more severe
    const sistSev = sistResult.severity ?? 'INFO';
    const diastSev = diastResult.severity ?? 'INFO';
    return severityRank(sistSev) >= severityRank(diastSev)
      ? (sistIsHypertension ? 'hipertension' : 'hipotension')
      : (diastIsHypertension ? 'hipertension' : 'hipotension');
  }
  if (anyHypertension) return 'hipertension';
  return 'hipotension';
}

/**
 * Build an AlertRecordInsert from a BP detection result.
 * Supports combined alerts (CA-05) and special contexts (CA-04).
 */
export function buildBpAlertRecord(
  input: BpEvaluationInput,
  detection: BpDetectionResult,
  userId: string,
  now: Date = new Date(),
): AlertRecordInsert {
  if (!detection.shouldAlert || !detection.severity) {
    throw new Error('buildBpAlertRecord called without an alert-worthy detection');
  }

  const {sistolica, diastolica, thresholds} = input;
  const alertType = resolveBpAlertType(
    detection.sistolica,
    detection.diastolica,
    thresholds,
    sistolica,
    diastolica,
  );

  const severity = detection.severity;
  const isCombined = detection.isCombined;
  const contexto = input.contexto ?? 'normal';

  // Build titulo
  const severityPrefix = severity === 'critica' ? 'Alerta critica' : 'Alerta';
  const typeLabel = alertType === 'hipertension' ? 'Presion arterial alta' : 'Presion arterial baja';
  const titulo = isCombined
    ? `${severityPrefix}: ${typeLabel} (combinada)`
    : `${severityPrefix}: ${typeLabel}`;

  // Build mensaje with measured values and thresholds (CA-03)
  const systolicRange = `${thresholds.sistolicaLowWarning}-${thresholds.sistolicaWarning}`;
  const diastolicRange = `${thresholds.diastolicaLowWarning}-${thresholds.diastolicaWarning}`;

  let mensaje: string;
  if (isCombined) {
    mensaje = `Presion ${sistolica}/${diastolica} mmHg (rango normal: sist ${systolicRange}, diast ${diastolicRange}). Ambos valores fuera de rango.`;
  } else if (detection.sistolica.shouldAlert) {
    const diff = Math.abs(sistolica - (detection.sistolica.thresholdExceeded ?? thresholds.sistolicaWarning));
    mensaje = `Sistolica ${sistolica} mmHg (rango: ${systolicRange}, dif: ${diff} mmHg). ${alertType === 'hipertension' ? 'Elevada.' : 'Baja.'}`;
  } else {
    const diff = Math.abs(diastolica - (detection.diastolica.thresholdExceeded ?? thresholds.diastolicaWarning));
    mensaje = `Diastolica ${diastolica} mmHg (rango: ${diastolicRange}, dif: ${diff} mmHg). ${alertType === 'hipertension' ? 'Elevada.' : 'Baja.'}`;
  }

  // Add context info if special (CA-04)
  if (contexto !== 'normal') {
    const contextoLabel = contexto === 'post_medicacion' ? 'post-medicacion' : 'reposo nocturno';
    mensaje += ` [Contexto: ${contextoLabel}]`;
  }

    return {
    id_usuario: userId,
    id_dato_reloj: null,
    id_prediccion_riesgo: null,
    tipo: alertType,
    severidad: severity,
    titulo,
    mensaje,
    datos: {
      bp_sistolica: sistolica,
      bp_diastolica: diastolica,
      umbral_sist: detection.sistolica.thresholdExceeded,
      umbral_diast: detection.diastolica.thresholdExceeded,
      is_combined: isCombined,
      contexto,
      dispositivo_origen: input.dispositivoOrigen,
      escalada: false,
    },
    expira_en: null,
  };
}
