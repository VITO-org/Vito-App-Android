/**
 * Alert module public API — HU-41 + HU-43.
 *
 * Re-exports everything the rest of the app needs from the alerts module.
 * Import from '@/services/alerts' (or '../services/alerts') — not from
 * individual files within the module.
 */

// ── Types ──
export type {
  AlertSeverity,
  AlertStatus,
  AlertType,
  Spo2Thresholds,
  EscalationConfig,
  AlertRecord,
  AlertRecordInsert,
  DetectionResult,
  Spo2EvaluationInput,
  OnAlertGenerated,
  OnAlertEscalated,
  OnAlertResolved,
  BpThresholds,
  BpEvaluationInput,
  BpDetectionResult,
  BpSingleResult,
  BpContextoEspecial,
  BpContextoOverrides,
} from './types';

export {
  DEFAULT_SPO2_THRESHOLDS,
  DEFAULT_ESCALATION_CONFIG,
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_BP_CONTEXTO_OVERRIDES,
} from './types';

// ── Detector (pure functions) ──
export {
  evaluateSpo2,
  classifySeverity,
  buildAlertRecord,
  isEpisodeResolved,
  resolveBpThresholds,
  evaluateBp,
  buildBpAlertRecord,
} from './detector';

// ── Escalation ──
export {EscalationManager, shouldEscalate} from './escalation';

// ── Engine (orchestration) ──
export {AlertEngine} from './engine';
export type {AlertSupabaseDeps, AlertEngineConfig} from './engine';
