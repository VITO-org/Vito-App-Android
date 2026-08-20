/**
 * Hypoxia detection engine — HU-41 CA-01 / CA-04.
 *
 * Pure functions that evaluate SpO₂ readings against configurable thresholds
 * and determine whether an alert should be generated and at what severity.
 *
 * Adapted to new Supabase schema (2026-08-20):
 * - AlertRecord now has titulo, mensaje, datos jsonb, leida_en
 * - buildAlertRecord produces titulo/mensaje/datos instead of flat fields
 *
 * Design rationale:
 * - All functions are pure (no side effects, no I/O) → fully testable.
 * - Thresholds are injected, not read from global state → supports per-user
 *   customization and baseline-based adjustment (HU-44).
 * - Deduplication logic lives here: if an active alert already exists for the
 *   same severity level, no new alert is generated (CA-05: no duplicate alerts
 *   for continuous episodes).
 */
import type {
  AlertSeverity,
  DetectionResult,
  Spo2EvaluationInput,
  Spo2Thresholds,
  AlertRecord,
  AlertRecordInsert,
} from './types';
import {DEFAULT_SPO2_THRESHOLDS} from './types';

// ─── Core Detection ──────────────────────────────────────────────

/**
 * Evaluate a SpO₂ reading against thresholds and determine alert action.
 *
 * Severity classification (CA-04):
 * - SpO₂ < criticalPercent → 'critica' (deeper descent)
 * - SpO₂ < warningPercent  → 'advertencia' (mild descent)
 * - SpO₂ >= warningPercent → no alert
 *
 * Dedup logic:
 * - If there's already an active alert at the same severity → no new alert
 *   (isNewEpisode = false, shouldAlert = false).
 * - If there's an active alert at a LOWER severity and the new reading is
 *   worse → new alert (severity escalation within same episode).
 * - If there's an active alert at a HIGHER severity and the new reading
 *   improves → no new alert (the existing one still applies).
 *
 * @param input Evaluation context (reading + thresholds + active alert state)
 * @returns DetectionResult with whether to alert and at what severity
 */
export function evaluateSpo2(input: Spo2EvaluationInput): DetectionResult {
  const {spo2Percent, thresholds, hasActiveAlert, activeAlertSeverity} = input;

  // Determine the severity based on thresholds
  const severity = classifySeverity(spo2Percent, thresholds);

  // No alert needed
  if (severity === null) {
    return {
      shouldAlert: false,
      severity: null,
      thresholdExceeded: null,
      isNewEpisode: false,
    };
  }

  // No existing active alert → new episode
  if (!hasActiveAlert) {
    return {
      shouldAlert: true,
      severity,
      thresholdExceeded:
        severity === 'critica'
          ? thresholds.criticalPercent
          : thresholds.warningPercent,
      isNewEpisode: true,
    };
  }

  // There's an active alert — check for dedup or escalation
  const severityRank = (s: AlertSeverity): number =>
    s === 'critica' ? 2 : s === 'advertencia' ? 1 : 0;

  const activeRank = severityRank(activeAlertSeverity ?? 'advertencia');
  const newRank = severityRank(severity);

  if (newRank > activeRank) {
    // Condition worsened → escalate severity (new alert, same episode)
    return {
      shouldAlert: true,
      severity,
      thresholdExceeded:
        severity === 'critica'
          ? thresholds.criticalPercent
          : thresholds.warningPercent,
      isNewEpisode: false,
    };
  }

  // Same or better severity → dedup (no new alert)
  return {
    shouldAlert: false,
    severity,
    thresholdExceeded: null,
    isNewEpisode: false,
  };
}

// ─── Severity Classification ─────────────────────────────────────

/**
 * Classify SpO₂ value into a severity level (pure function).
 *
 * @param spo2Percent SpO₂ percentage (0-100)
 * @param thresholds Configurable thresholds
 * @returns AlertSeverity or null if within normal range
 */
export function classifySeverity(
  spo2Percent: number,
  thresholds: Spo2Thresholds = DEFAULT_SPO2_THRESHOLDS,
): AlertSeverity | null {
  if (spo2Percent < thresholds.criticalPercent) {
    return 'critica';
  }
  if (spo2Percent < thresholds.warningPercent) {
    return 'advertencia';
  }
  return null;
}

// ─── Alert Record Construction ───────────────────────────────────

/**
 * Build an AlertRecordInsert from a detection result and evaluation input.
 * The caller is responsible for persisting this record.
 *
 * Adapted to new schema: produces titulo, mensaje, and datos jsonb
 * instead of flat columns (valor_registrado, umbral_configurado, etc.).
 *
 * @param input The evaluation input that triggered the alert
 * @param detection The detection result
 * @param userId The user ID
 * @param now Current timestamp (injectable for testing)
 * @returns AlertRecordInsert ready for persistence
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

  // Build titulo and mensaje based on severity
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

// ─── Episode Resolution Check ────────────────────────────────────

/**
 * Check if a SpO₂ reading indicates the episode has resolved.
 * An episode resolves when SpO₂ returns to at least the warning threshold.
 *
 * @param spo2Percent Current SpO₂ reading
 * @param thresholds Active thresholds
 * @returns true if the reading is back to safe range
 */
export function isEpisodeResolved(
  spo2Percent: number,
  thresholds: Spo2Thresholds = DEFAULT_SPO2_THRESHOLDS,
): boolean {
  return spo2Percent >= thresholds.warningPercent;
}
