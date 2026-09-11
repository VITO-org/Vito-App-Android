/**
 * Alert Engine — HU-41 orchestration layer.
 * Extended HU-43 (BP) and HU-42 (heart rate).
 * Extended HU-98: umbrales efectivos por usuario combinando defaults con
 * el baseline personalizado (caché 1h, tag `umbral_origen` en datos jsonb).
 *
 * Ties together detection, persistence, and escalation into a single
 * entry point that HealthProvider calls after each sync cycle.
 *
 * Adapted to new Supabase schema (2026-08-20):
 * - Table `alerta` with titulo, mensaje, datos jsonb, leida_en
 * - Lifecycle: read/unread (leida_en) instead of state machine
 * - Escalation tracked in datos jsonb
 *
 * Flow (per SpO₂ reading):
 * 1. Evaluate reading against thresholds (detector).
 * 2. If alert needed → persist to Supabase + start escalation timer.
 * 3. If episode resolved → mark alert as read, cancel timer.
 * 4. Notify listeners (UI updates, push notifications).
 *
 * Dependencies are injected for testability (no direct Supabase imports).
 */
import type {
  AlertRecord,
  AlertRecordInsert,
  AlertSeverity,
  EscalationConfig,
  OnAlertGenerated,
  OnAlertEscalated,
  OnAlertResolved,
  Spo2Thresholds,
  BpThresholds,
  BpContextoEspecial,
  BpContextoOverrides,
  HrThresholds,
  HrTrend,
} from './types';
import {
  DEFAULT_SPO2_THRESHOLDS,
  DEFAULT_ESCALATION_CONFIG,
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_BP_CONTEXTO_OVERRIDES,
  DEFAULT_HR_THRESHOLDS,
  HR_TREND_WINDOW_MS,
} from './types';
import {
  evaluateSpo2,
  buildAlertRecord,
  isEpisodeResolved,
  evaluateBp,
  buildBpAlertRecord,
  evaluateHr,
  buildHrAlertRecord,
  isHrEpisodeResolved,
  computeHrTrend,
} from './detector';
import {EscalationManager} from './escalation';
import type {BaselinePersonalizado} from '../supabase/models';
import type {
  EffectiveThresholds,
  PersonalizationConfig,
} from './personalized';
import {
  PERSONALIZATION_DEFAULTS,
  baselineRowToMetrics,
  resolveEffectiveThresholds as resolveThresholdsFromMetrics,
} from './personalized';

/** TTL de la caché de baseline personalizado por usuario (HU-98): 1 hora. */
const BASELINE_CACHE_TTL_MS = 60 * 60 * 1000;

// ─── Dependency Interfaces ───────────────────────────────────────

/** Supabase operations needed by the engine. */
export interface AlertSupabaseDeps {
  /** Insert a new alert record. */
  insertAlert: (alert: AlertRecordInsert) => Promise<AlertRecord>;
  /** Get active (unread) alerts for a user (leida_en IS NULL). */
  getActiveAlerts: (userId: string) => Promise<AlertRecord[]>;
  /** Mark an alert as read (set leida_en). */
  markAlertRead: (alertId: string) => Promise<void>;
  /** Update an alert's datos jsonb (for escalation tracking). */
  updateAlertDatos: (alertId: string, datos: Record<string, unknown>) => Promise<void>;
  /**
   * Optional: recent HR readings since `fromIso` for trend calculation (HU-42 CA-04).
   * When absent, the trend defaults to 'estable'.
   */
  getRecentHeartRates?: (
    userId: string,
    fromIso: string,
  ) => Promise<{bpm: number; recordedAt: string}[]>;
  /**
   * Optional: baseline personalizado del usuario (HU-98). Cuando falta o falla
   * el fetch, el engine hace fallback silencioso a los umbrales estándar.
   */
  getPersonalizedBaseline?: (userId: string) => Promise<BaselinePersonalizado | null>;
}

/** Configuration for the alert engine. */
export interface AlertEngineConfig {
  thresholds: Spo2Thresholds;
  bpThresholds: BpThresholds;
  bpContextoOverrides: BpContextoOverrides;
  hrThresholds: HrThresholds;
  escalation: EscalationConfig;
  /** Configuración de personalización de umbrales (HU-98). Default: guardarriles clínicos. */
  personalization?: PersonalizationConfig;
}

const DEFAULT_CONFIG: AlertEngineConfig = {
  thresholds: DEFAULT_SPO2_THRESHOLDS,
  bpThresholds: DEFAULT_BP_THRESHOLDS,
  bpContextoOverrides: DEFAULT_BP_CONTEXTO_OVERRIDES,
  hrThresholds: DEFAULT_HR_THRESHOLDS,
  escalation: DEFAULT_ESCALATION_CONFIG,
  personalization: PERSONALIZATION_DEFAULTS,
};

// ─── Alert Engine ────────────────────────────────────────────────

export class AlertEngine {
  private deps: AlertSupabaseDeps;
  private config: AlertEngineConfig;
  private escalationManager: EscalationManager;

  // Listeners
  private onAlertGenerated: OnAlertGenerated = () => {};
  private onAlertEscalated: OnAlertEscalated = () => {};
  private onAlertResolved: OnAlertResolved = () => {};

  // In-memory cache of active alerts per user (for fast dedup checks)
  private activeAlertsCache: Map<string, AlertRecord[]> = new Map();

  // HU-98: caché de umbrales efectivos por usuario (TTL 1h — evita re-fetch
  // del baseline en cada lectura; se refresca solo al expirar).
  private baselineCache: Map<string, {expiresAt: number; value: EffectiveThresholds}> = new Map();

  constructor(
    deps: AlertSupabaseDeps,
    config: AlertEngineConfig = DEFAULT_CONFIG,
  ) {
    this.deps = deps;
    this.config = config;

    this.escalationManager = new EscalationManager(
      config.escalation,
      (escalatedAlert) => {
        this.onAlertEscalated(escalatedAlert);
      },
      async (alertId, datos) => {
        await this.deps.updateAlertDatos(alertId, datos);
      },
    );
  }

  // ── Public API ──────────────────────────────────────────────

  /**
   * Evaluate a SpO₂ reading and potentially generate an alert.
   * Called by HealthProvider after each sync cycle.
   *
   * @param userId The user ID
   * @param spo2Percent Current SpO₂ reading (0-100)
   * @param dispositivoOrigen Device/source identifier
   * @param now Current timestamp (injectable for testing)
   * @returns The generated alert record (if any), or null
   */
  async evaluateSpo2Reading(
    userId: string,
    spo2Percent: number,
    dispositivoOrigen: string = 'wearable',
    now: Date = new Date(),
  ): Promise<AlertRecord | null> {
    // 1. Umbrales efectivos (estándar o personalizados HU-98, con caché 1h)
    const effective = await this.resolveEffectiveThresholds(userId);

    // 2. Get active (unread) alerts for this user (from cache or Supabase)
    const activeAlerts = await this.getActiveAlerts(userId);
    const activeSpo2Alert = activeAlerts.find(a => a.tipo === 'hipoxia');
    const hasActiveAlert = !!activeSpo2Alert;
    const activeAlertSeverity: AlertSeverity | null =
      activeSpo2Alert?.severidad ?? null;

    // 3. Evaluate against thresholds
    const detection = evaluateSpo2({
      spo2Percent,
      thresholds: effective.spo2,
      hasActiveAlert,
      activeAlertSeverity,
      readingTimestamp: now.toISOString(),
      dispositivoOrigen,
    });

    // 4. Check if existing episode resolved
    if (hasActiveAlert && activeSpo2Alert && isEpisodeResolved(spo2Percent, effective.spo2)) {
      await this.resolveAlert(activeSpo2Alert, now);
      return null;
    }

    // 5. Generate new alert if needed
    if (detection.shouldAlert) {
      return this.generateAlert(userId, spo2Percent, dispositivoOrigen, detection.severity!, now, effective);
    }

    return null;
  }

  /**
   * Evaluate a BP reading and potentially generate an alert (HU-43).
   * Called by HealthProvider after each sync cycle when BP data is available.
   *
   * @param userId The user ID
   * @param sistolica Current systolic reading (mmHg)
   * @param diastolica Current diastolic reading (mmHg)
   * @param dispositivoOrigen Device/source identifier
   * @param contexto Special measurement context (default: 'normal')
   * @param now Current timestamp (injectable for testing)
   * @returns The generated alert record (if any), or null
   */
  async evaluateBpReading(
    userId: string,
    sistolica: number,
    diastolica: number,
    dispositivoOrigen: string = 'wearable',
    contexto: BpContextoEspecial = 'normal',
    now: Date = new Date(),
  ): Promise<AlertRecord | null> {
    // 1. Umbrales efectivos (estándar o personalizados HU-98, con caché 1h)
    const effective = await this.resolveEffectiveThresholds(userId);

    // 2. Get active (unread) alerts for this user
    const activeAlerts = await this.getActiveAlerts(userId);
    const activeBpAlert = activeAlerts.find(
      a => a.tipo === 'hipertension' || a.tipo === 'hipotension',
    );
    const hasActiveAlert = !!activeBpAlert;
    const activeAlertSeverity: AlertSeverity | null =
      activeBpAlert?.severidad ?? null;

    // 3. Evaluate against thresholds
    const detection = evaluateBp({
      sistolica,
      diastolica,
      thresholds: effective.bp,
      hasActiveAlert,
      activeAlertSeverity,
      readingTimestamp: now.toISOString(),
      dispositivoOrigen,
      contexto,
      contextoOverrides: this.config.bpContextoOverrides,
    });

    // 4. If no alert needed, check if existing episode resolved
    if (!detection.shouldAlert) {
      if (hasActiveAlert && activeBpAlert) {
        // Check if both values are back in normal range
        const sistNormal =
          sistolica >= effective.bp.sistolicaLowWarning &&
          sistolica < effective.bp.sistolicaWarning;
        const diastNormal =
          diastolica >= effective.bp.diastolicaLowWarning &&
          diastolica < effective.bp.diastolicaWarning;
        if (sistNormal && diastNormal) {
          await this.resolveAlert(activeBpAlert, now);
        }
      }
      return null;
    }

    // 5. Generate new alert if needed
    return this.generateBpAlert(userId, sistolica, diastolica, dispositivoOrigen, contexto, detection, now, effective);
  }

  /**
   * Evaluate a heart rate reading and potentially generate an alert (HU-42).
   * Called by HealthProvider after each sync cycle when HR data is available.
   *
   * @param userId The user ID
   * @param bpm Current heart rate in lpm
   * @param dispositivoOrigen Device/source identifier
   * @param now Current timestamp (injectable for testing)
   * @returns The generated alert record (if any), or null
   */
  async evaluateHrReading(
    userId: string,
    bpm: number,
    dispositivoOrigen: string = 'wearable',
    now: Date = new Date(),
  ): Promise<AlertRecord | null> {
    // 1. Umbrales efectivos (estándar o personalizados HU-98, con caché 1h)
    const effective = await this.resolveEffectiveThresholds(userId);

    // 2. Get active (unread) alerts for this user
    const activeAlerts = await this.getActiveAlerts(userId);
    const activeHrAlert = activeAlerts.find(
      a => a.tipo === 'taquicardia' || a.tipo === 'bradicardia',
    );
    const hasActiveAlert = !!activeHrAlert;
    const activeAlertSeverity: AlertSeverity | null =
      activeHrAlert?.severidad ?? null;

    // 3. Compute trend from recent history when the dep is wired (CA-04).
    //    Failure to fetch history must never block alerting -> fallback 'estable'.
    let trend: HrTrend = 'estable';
    if (this.deps.getRecentHeartRates) {
      try {
        const fromIso = new Date(now.getTime() - HR_TREND_WINDOW_MS).toISOString();
        const readings = await this.deps.getRecentHeartRates(userId, fromIso);
        trend = computeHrTrend(readings ?? [], now);
      } catch {
        trend = 'estable';
      }
    }

    // 4. Evaluate against thresholds
    const detection = evaluateHr({
      bpm,
      thresholds: effective.hr,
      hasActiveAlert,
      activeAlertSeverity,
    });

    // 5. If no alert needed, check if existing episode resolved (FC back in range)
    if (!detection.shouldAlert) {
      if (hasActiveAlert && activeHrAlert && isHrEpisodeResolved(bpm, effective.hr)) {
        await this.resolveAlert(activeHrAlert, now);
      }
      return null;
    }

    // 6. Generate new alert if needed
    return this.generateHrAlert(userId, bpm, dispositivoOrigen, detection, trend, now, effective);
  }

  /**
   * Mark an alert as read (user acknowledged it).
   * Cancels the escalation timer.
   *
   * @param alertId The alert to mark as read
   */
  async confirmAlert(alertId: string): Promise<void> {
    await this.deps.markAlertRead(alertId);
    this.escalationManager.cancelEscalation(alertId);

    // Update cache
    this.invalidateCacheForAlert(alertId);
  }

  /**
   * Resolve an alert (SpO₂ returned to normal) — mark as read.
   *
   * @param alert The alert to resolve
   * @param now Current timestamp
   */
  async resolveAlert(alert: AlertRecord, now: Date = new Date()): Promise<void> {
    await this.deps.markAlertRead(alert.id);
    this.escalationManager.cancelEscalation(alert.id);

    const resolvedAlert: AlertRecord = {
      ...alert,
      leida_en: now.toISOString(),
      status: 'leida',
    };
    this.onAlertResolved(resolvedAlert);

    // Update cache
    this.invalidateCacheForAlert(alert.id);
  }

  /**
   * Register event listeners.
   */
  onGenerated(callback: OnAlertGenerated): void {
    this.onAlertGenerated = callback;
  }

  onEscalated(callback: OnAlertEscalated): void {
    this.onAlertEscalated = callback;
  }

  onResolved(callback: OnAlertResolved): void {
    this.onAlertResolved = callback;
  }

  /**
   * Get the current alert configuration.
   */
  getConfig(): AlertEngineConfig {
    return {...this.config};
  }

  /**
   * Update thresholds at runtime (for HU-44 baseline adjustment).
   */
  setThresholds(thresholds: Partial<Spo2Thresholds>): void {
    this.config.thresholds = {
      ...this.config.thresholds,
      ...thresholds,
    };
  }

  /**
   * Clean up resources (timers, cache).
   */
  dispose(): void {
    this.escalationManager.dispose();
    this.activeAlertsCache.clear();
    this.baselineCache.clear();
  }

  // ── Private Methods ─────────────────────────────────────────

  /**
   * Resuelve los umbrales efectivos para un usuario (HU-98): combina los
   * defaults configurados con su baseline personalizado si existe y es válido.
   * Resultado cacheado por usuario con TTL de 1 hora.
   */
  private async resolveEffectiveThresholds(userId: string): Promise<EffectiveThresholds> {
    const nowMs = Date.now();
    const cached = this.baselineCache.get(userId);
    if (cached && cached.expiresAt > nowMs) {
      return cached.value;
    }

    let effective: EffectiveThresholds = this.defaultEffectiveThresholds();

    if (this.deps.getPersonalizedBaseline) {
      try {
        const row = await this.deps.getPersonalizedBaseline(userId);
        if (row) {
          effective = resolveThresholdsFromMetrics(
            this.defaultEffectiveThresholds(),
            baselineRowToMetrics(row),
            this.config.personalization ?? PERSONALIZATION_DEFAULTS,
          );
        }
      } catch {
        // Fallback silencioso: umbrales estándar si el fetch del baseline falla
      }
    }

    this.baselineCache.set(userId, {expiresAt: nowMs + BASELINE_CACHE_TTL_MS, value: effective});
    return effective;
  }

  /** Umbrales estándar actuales de la config (respeta setThresholds en runtime). */
  private defaultEffectiveThresholds(): EffectiveThresholds {
    return {
      spo2: {...this.config.thresholds},
      bp: {...this.config.bpThresholds},
      hr: {...this.config.hrThresholds},
      origen: {spo2: 'estandar', bp: 'estandar', hr: 'estandar'},
    };
  }

  private async getActiveAlerts(userId: string): Promise<AlertRecord[]> {
    // Check cache first
    const cached = this.activeAlertsCache.get(userId);
    if (cached) {
      return cached;
    }

    // Fetch from Supabase
    try {
      const alerts = await this.deps.getActiveAlerts(userId);
      this.activeAlertsCache.set(userId, alerts);
      return alerts;
    } catch {
      // If fetch fails, return empty — we'll still try to create the alert
      return [];
    }
  }

  private async generateAlert(
    userId: string,
    spo2Percent: number,
    dispositivoOrigen: string,
    severity: AlertSeverity,
    now: Date,
    effective: EffectiveThresholds,
  ): Promise<AlertRecord> {
    const input = {
      spo2Percent,
      thresholds: effective.spo2,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      readingTimestamp: now.toISOString(),
      dispositivoOrigen,
    };

    const detection = {
      shouldAlert: true,
      severity,
      thresholdExceeded:
        severity === 'critica'
          ? effective.spo2.criticalPercent
          : effective.spo2.warningPercent,
      isNewEpisode: true,
    };

    const alertInsert = buildAlertRecord(input, detection, userId, now);

    // HU-98: marcar el origen de los umbrales usados
    alertInsert.datos = {
      ...(alertInsert.datos ?? {}),
      umbral_origen: effective.origen.spo2,
    };

    // Persist to Supabase
    const alert = await this.deps.insertAlert(alertInsert);

    // Start escalation timer (CA-05)
    this.escalationManager.startEscalation(alert);

    // Update cache
    const userAlerts = this.activeAlertsCache.get(userId) ?? [];
    userAlerts.push(alert);
    this.activeAlertsCache.set(userId, userAlerts);

    // Notify listeners
    this.onAlertGenerated(alert);

    return alert;
  }

  private async generateBpAlert(
    userId: string,
    sistolica: number,
    diastolica: number,
    dispositivoOrigen: string,
    contexto: BpContextoEspecial,
    detection: import('./types').BpDetectionResult,
    now: Date,
    effective: EffectiveThresholds,
  ): Promise<AlertRecord> {
    const input = {
      sistolica,
      diastolica,
      thresholds: effective.bp,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      readingTimestamp: now.toISOString(),
      dispositivoOrigen,
      contexto,
      contextoOverrides: this.config.bpContextoOverrides,
    };

    const alertInsert = buildBpAlertRecord(input, detection, userId, now);

    // HU-98: marcar el origen de los umbrales usados
    alertInsert.datos = {
      ...(alertInsert.datos ?? {}),
      umbral_origen: effective.origen.bp,
    };

    // Persist to Supabase
    const alert = await this.deps.insertAlert(alertInsert);

    // Start escalation timer
    this.escalationManager.startEscalation(alert);

    // Update cache
    const userAlerts = this.activeAlertsCache.get(userId) ?? [];
    userAlerts.push(alert);
    this.activeAlertsCache.set(userId, userAlerts);

    // Notify listeners
    this.onAlertGenerated(alert);

    return alert;
  }

  private async generateHrAlert(
    userId: string,
    bpm: number,
    dispositivoOrigen: string,
    detection: import('./types').HrDetectionResult,
    trend: HrTrend,
    now: Date,
    effective: EffectiveThresholds,
  ): Promise<AlertRecord> {
    const input = {
      bpm,
      thresholds: effective.hr,
      hasActiveAlert: false,
      activeAlertSeverity: null,
      dispositivoOrigen,
    };

    const alertInsert = buildHrAlertRecord(input, detection, userId, trend, now);

    // HU-98: marcar el origen de los umbrales usados
    alertInsert.datos = {
      ...(alertInsert.datos ?? {}),
      umbral_origen: effective.origen.hr,
    };

    // Persist to Supabase
    const alert = await this.deps.insertAlert(alertInsert);

    // Start escalation timer (same policy as SpO2/BP)
    this.escalationManager.startEscalation(alert);

    // Update cache
    const userAlerts = this.activeAlertsCache.get(userId) ?? [];
    userAlerts.push(alert);
    this.activeAlertsCache.set(userId, userAlerts);

    // Notify listeners
    this.onAlertGenerated(alert);

    return alert;
  }

  private invalidateCacheForAlert(alertId: string): void {
    for (const [userId, alerts] of this.activeAlertsCache.entries()) {
      const filtered = alerts.filter(a => a.id !== alertId);
      if (filtered.length === 0) {
        this.activeAlertsCache.delete(userId);
      } else {
        this.activeAlertsCache.set(userId, filtered);
      }
    }
  }
}
