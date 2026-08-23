/**
 * Alert module types — HU-41 Alerta por hipoxia (SpO₂ baja).
 * Extended HU-43: Alerta por presión arterial fuera de rango.
 *
 * Adapted to the new Supabase schema (2026-08-20):
 * - Table `alerta` (no enums, varchar severidad, jsonb `datos`, `leida_en`)
 * - Lifecycle: read/unread (leida_en null = unread) instead of state machine
 * - Escalation is tracked in `datos` jsonb, not as separate columns
 *
 * All types are pure TypeScript — no React Native or Supabase dependencies.
 */

// ─── Alert Severity ──────────────────────────────────────────────

/**
 * Severity levels for health alerts.
 * Maps to varchar(20) in Supabase (no enum).
 * - 'INFO': informational, no action needed
 * - 'advertencia': SpO₂ between warning and critical thresholds
 * - 'critica': SpO₂ below critical threshold
 */
export type AlertSeverity = 'INFO' | 'advertencia' | 'critica';

// ─── Alert Type ──────────────────────────────────────────────────

/**
 * Types of vital sign alerts.
 * HU-41: 'hipoxia'; HU-43: 'hipertension', 'hipotension'.
 */
export type AlertType = 'hipoxia' | 'hipertension' | 'hipotension';

// ─── Alert Status (derived, not in DB) ───────────────────────────

/**
 * Derived status from `leida_en` field.
 * - 'activa': leida_en IS NULL (unread, awaiting attention)
 * - 'leida': leida_en IS NOT NULL (user has seen the alert)
 *
 * NOTE: This is NOT stored in the DB. It's derived at read time.
 */
export type AlertStatus = 'activa' | 'leida';

// ─── Threshold Configuration ─────────────────────────────────────

/**
 * Configurable thresholds for SpO₂ alert detection (CA-01).
 * All values are in percentage (0-100).
 */
export interface Spo2Thresholds {
  /** SpO₂ below this value triggers a 'advertencia' alert (default: 90%). */
  warningPercent: number;
  /** SpO₂ below this value triggers a 'critica' alert (default: 85%). */
  criticalPercent: number;
}

/** Default thresholds per spec: <90% = advertencia, <85% = crítica. */
export const DEFAULT_SPO2_THRESHOLDS: Spo2Thresholds = {
  warningPercent: 90,
  criticalPercent: 85,
};

// ─── Escalation Configuration ────────────────────────────────────

/**
 * Escalation settings (CA-05).
 * If no confirmation within `escalationTimeoutMs`, alert escalates.
 * Escalation is tracked in `datos` jsonb, not as a DB column.
 */
export interface EscalationConfig {
  /** Milliseconds to wait for user confirmation before escalating (default: 5 min). */
  escalationTimeoutMs: number;
}

/** Default: 5 minutes (300,000 ms). */
export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  escalationTimeoutMs: 5 * 60 * 1000,
};

// ─── BP Threshold Configuration ──────────────────────────────────

/**
 * Configurable thresholds for blood pressure alert detection.
 * Each value represents the boundary above which / below which an alert is triggered.
 *
 * OMS defaults (CA-01, CA-04):
 * - Normal systolic: 90-120 mmHg
 * - Normal diastolic: 60-80 mmHg
 * - Hypertension systolic: ≥140 mmHg
 * - Hypertension diastolic: ≥90 mmHg
 * - Hypotension systolic: <90 mmHg
 * - Hypotension diastolic: <60 mmHg
 *
 * Warning = elevated (stage 1), Critical = severe (stage 2+).
 */
export interface BpThresholds {
  /** Systolic threshold for 'advertencia' (default: 140 mmHg). */
  sistolicaWarning: number;
  /** Systolic threshold for 'critica' (default: 160 mmHg). */
  sistolicaCritical: number;
  /** Diastolic threshold for 'advertencia' (default: 90 mmHg). */
  diastolicaWarning: number;
  /** Diastolic threshold for 'critica' (default: 100 mmHg). */
  diastolicaCritical: number;
  /** Systolic lower bound — below this = 'advertencia' hypotension (default: 90 mmHg). */
  sistolicaLowWarning: number;
  /** Systolic lower bound — below this = 'critica' hypotension (default: 80 mmHg). */
  sistolicaLowCritical: number;
  /** Diastolic lower bound — below this = 'advertencia' hypotension (default: 60 mmHg). */
  diastolicaLowWarning: number;
  /** Diastolic lower bound — below this = 'critica' hypotension (default: 50 mmHg). */
  diastolicaLowCritical: number;
}

/** Default OMS thresholds for BP alert detection. */
export const DEFAULT_BP_THRESHOLDS: BpThresholds = {
  sistolicaWarning: 140,
  sistolicaCritical: 160,
  diastolicaWarning: 90,
  diastolicaCritical: 100,
  sistolicaLowWarning: 90,
  sistolicaLowCritical: 80,
  diastolicaLowWarning: 60,
  diastolicaLowCritical: 50,
};

// ─── BP Special Context (CA-04) ─────────────────────────────────

/**
 * Special measurement contexts that override default BP thresholds.
 * For example, after medication the thresholds may be more relaxed.
 */
export type BpContextoEspecial = 'normal' | 'post_medicacion' | 'reposo_nocturno';

/**
 * Threshold overrides per special context.
 * Only the thresholds that differ from the base are specified.
 */
export interface BpContextoOverrides {
  /** Override thresholds for post-medication context. */
  post_medicacion?: Partial<BpThresholds>;
  /** Override thresholds for nocturnal rest context. */
  reposo_nocturno?: Partial<BpThresholds>;
}

/** Default context overrides — conservative medical guidance. */
export const DEFAULT_BP_CONTEXTO_OVERRIDES: BpContextoOverrides = {
  post_medicacion: {
    // After medication, systolic <100 is not hypotension
    sistolicaLowWarning: 85,
    sistolicaLowCritical: 75,
  },
  reposo_nocturno: {
    // During nocturnal rest, lower BP is expected
    sistolicaLowWarning: 80,
    sistolicaLowCritical: 70,
    diastolicaLowWarning: 50,
    diastolicaLowCritical: 45,
  },
};

// ─── BP Evaluation Input ─────────────────────────────────────────

/**
 * Input for the BP alert evaluation pipeline.
 * Contains both systolic and diastolic readings and context.
 */
export interface BpEvaluationInput {
  /** Current systolic pressure (mmHg). */
  sistolica: number;
  /** Current diastolic pressure (mmHg). */
  diastolica: number;
  /** User's configured thresholds (or OMS defaults). */
  thresholds: BpThresholds;
  /** Whether there was an active (unread) alert for this user already. */
  hasActiveAlert: boolean;
  /** Severity of the existing active alert (if any). */
  activeAlertSeverity: AlertSeverity | null;
  /** ISO timestamp of the reading. */
  readingTimestamp: string;
  /** Device/source identifier. */
  dispositivoOrigen: string;
  /** Special measurement context (default: 'normal'). */
  contexto?: BpContextoEspecial;
  /** Context-specific threshold overrides. */
  contextoOverrides?: BpContextoOverrides;
}

// ─── BP Detection Result ─────────────────────────────────────────

/**
 * Result of evaluating a single BP value (systolic or diastolic).
 */
export interface BpSingleResult {
  /** Whether an alert should be generated for this value. */
  shouldAlert: boolean;
  /** Severity of the alert (null if no alert). */
  severity: AlertSeverity | null;
  /** The threshold that was exceeded (null if no alert). */
  thresholdExceeded: number | null;
}

/**
 * Combined result of evaluating both systolic and diastolic BP values.
 * Returned by the detector — pure function, no side effects.
 */
export interface BpDetectionResult {
  /** Independent evaluation of systolic pressure. */
  sistolica: BpSingleResult;
  /** Independent evaluation of diastolic pressure. */
  diastolica: BpSingleResult;
  /** Whether ANY alert should be generated (either systolic or diastolic, or both). */
  shouldAlert: boolean;
  /** Overall severity — max of systolic and diastolic severities (CA-05). */
  severity: AlertSeverity | null;
  /** Whether this is a combined alert (both values out of range) (CA-05). */
  isCombined: boolean;
  /** Whether this is a new episode or a continuation (for dedup). */
  isNewEpisode: boolean;
}

// ─── Alert Record ────────────────────────────────────────────────

/**
 * A single alert instance generated by the detection engine.
 * Maps to the `alerta` table in Supabase.
 *
 * The old fields (estado, valor_registrado, umbral_configurado,
 * dispositivo_origen, confirmed_at, escalated_at, escalated_to,
 * resolved_at) are now either:
 * - Derived: `status` is derived from `leida_en`
 * - Stored in `datos` jsonb: valor_registrado, umbral_configurado,
 *   dispositivo_origen, escalada, escalated_at, escalated_to
 */
export interface AlertRecord {
  id: string;
  id_usuario: string;
  id_dato_reloj: string | null;
  id_prediccion_riesgo: string | null;
  tipo: AlertType;
  severidad: AlertSeverity;
  titulo: string;
  mensaje: string;
  /** Flexible JSON data: valor_registrado, umbral_configurado, etc. */
  datos: Record<string, unknown> | null;
  /** ISO timestamp when the alert was read (null = unread). */
  leida_en: string | null;
  /** ISO timestamp when the alert was created. */
  created_at: string;
  /** ISO timestamp when the alert expires (null = no expiration). */
  expira_en: string | null;

  // ── Derived fields (computed, not in DB) ──
  /** Derived from leida_en: 'activa' if null, 'leida' if set. */
  status: AlertStatus;
}

/**
 * Insert payload for creating a new alert.
 * Omits server-generated fields (id, created_at) and derived fields (status).
 * The `datos` jsonb field should contain context like valor_registrado, etc.
 */
export type AlertRecordInsert = Omit<
  AlertRecord,
  'id' | 'created_at' | 'status' | 'leida_en'
> & {
  leida_en?: string | null;
};

// ─── Detection Result ────────────────────────────────────────────

/**
 * Result of evaluating a SpO₂ reading against thresholds.
 * Returned by the detector — pure function, no side effects.
 */
export interface DetectionResult {
  /** Whether an alert should be generated. */
  shouldAlert: boolean;
  /** Severity of the alert (null if no alert). */
  severity: AlertSeverity | null;
  /** The threshold that was exceeded (null if no alert). */
  thresholdExceeded: number | null;
  /** Whether this is a new episode or a continuation (for dedup). */
  isNewEpisode: boolean;
}

// ─── Alert Evaluation Input ──────────────────────────────────────

/**
 * Input for the alert evaluation pipeline.
 * Contains the latest SpO₂ reading and context needed for detection.
 */
export interface Spo2EvaluationInput {
  /** Current SpO₂ percentage (0-100). */
  spo2Percent: number;
  /** User's configured thresholds (or defaults). */
  thresholds: Spo2Thresholds;
  /** Whether there was an active (unread) alert for this user already. */
  hasActiveAlert: boolean;
  /** Severity of the existing active alert (if any). */
  activeAlertSeverity: AlertSeverity | null;
  /** ISO timestamp of the reading. */
  readingTimestamp: string;
  /** Device/source identifier. */
  dispositivoOrigen: string;
}

// ─── Listener Types ──────────────────────────────────────────────

/**
 * Callback invoked when a new alert is generated.
 */
export type OnAlertGenerated = (alert: AlertRecord) => void;

/**
 * Callback invoked when an alert is escalated.
 */
export type OnAlertEscalated = (alert: AlertRecord) => void;

/**
 * Callback invoked when an alert is resolved.
 */
export type OnAlertResolved = (alert: AlertRecord) => void;
