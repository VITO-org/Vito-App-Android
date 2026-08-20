/**
 * Alert Engine — HU-41 orchestration layer.
 *
 * Ties together detection, persistence, and escalation into a single
 * entry point that HealthProvider calls after each sync cycle.
 *
 * Flow (per SpO₂ reading):
 * 1. Evaluate reading against thresholds (detector).
 * 2. If alert needed → persist to Supabase + start escalation timer.
 * 3. If episode resolved → mark alert as resolved, cancel timer.
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
} from './types';
import {DEFAULT_SPO2_THRESHOLDS, DEFAULT_ESCALATION_CONFIG} from './types';
import {evaluateSpo2, buildAlertRecord, isEpisodeResolved} from './detector';
import {EscalationManager} from './escalation';

// ─── Dependency Interfaces ───────────────────────────────────────

/** Supabase operations needed by the engine. */
export interface AlertSupabaseDeps {
  /** Insert a new alert record. */
  insertAlert: (alert: AlertRecordInsert) => Promise<AlertRecord>;
  /** Get active alerts for a user (status = 'activa'). */
  getActiveAlerts: (userId: string) => Promise<AlertRecord[]>;
  /** Update an alert's status. */
  updateAlertStatus: (
    alertId: string,
    status: AlertRecord['status'],
    extra?: Partial<Pick<AlertRecord, 'confirmed_at' | 'escalated_at' | 'escalated_to' | 'resolved_at'>>,
  ) => Promise<void>;
}

/** Configuration for the alert engine. */
export interface AlertEngineConfig {
  thresholds: Spo2Thresholds;
  escalation: EscalationConfig;
}

const DEFAULT_CONFIG: AlertEngineConfig = {
  thresholds: DEFAULT_SPO2_THRESHOLDS,
  escalation: DEFAULT_ESCALATION_CONFIG,
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
      async (alertId, status, escalatedAt) => {
        await this.deps.updateAlertStatus(alertId, status, {escalated_at: escalatedAt});
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
    // 1. Get active alerts for this user (from cache or Supabase)
    const activeAlerts = await this.getActiveAlerts(userId);
    const activeSpo2Alert = activeAlerts.find(a => a.tipo === 'hipoxia');
    const hasActiveAlert = !!activeSpo2Alert;
    const activeAlertSeverity: AlertSeverity | null =
      activeSpo2Alert?.severidad ?? null;

    // 2. Evaluate against thresholds
    const detection = evaluateSpo2({
      spo2Percent,
      thresholds: this.config.thresholds,
      hasActiveAlert,
      activeAlertSeverity,
      readingTimestamp: now.toISOString(),
      dispositivoOrigen,
    });

    // 3. Check if existing episode resolved
    if (hasActiveAlert && activeSpo2Alert && isEpisodeResolved(spo2Percent, this.config.thresholds)) {
      await this.resolveAlert(activeSpo2Alert, now);
      return null;
    }

    // 4. Generate new alert if needed
    if (detection.shouldAlert) {
      return this.generateAlert(userId, spo2Percent, dispositivoOrigen, detection.severity!, now);
    }

    return null;
  }

  /**
   * Confirm that a user acknowledged an alert.
   * Cancels the escalation timer.
   *
   * @param alertId The alert to confirm
   */
  async confirmAlert(alertId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.deps.updateAlertStatus(alertId, 'confirmada', {
      confirmed_at: now,
    });
    this.escalationManager.cancelEscalation(alertId);

    // Update cache
    this.invalidateCacheForAlert(alertId);
  }

  /**
   * Resolve an alert (SpO₂ returned to normal).
   *
   * @param alert The alert to resolve
   * @param now Current timestamp
   */
  async resolveAlert(alert: AlertRecord, now: Date = new Date()): Promise<void> {
    const resolvedAt = now.toISOString();
    await this.deps.updateAlertStatus(alert.id, 'resuelta', {
      resolved_at: resolvedAt,
    });
    this.escalationManager.cancelEscalation(alert.id);

    const resolvedAlert: AlertRecord = {
      ...alert,
      status: 'resuelta',
      resolved_at: resolvedAt,
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
  }

  // ── Private Methods ─────────────────────────────────────────

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
  ): Promise<AlertRecord> {
    const input = {
      spo2Percent,
      thresholds: this.config.thresholds,
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
          ? this.config.thresholds.criticalPercent
          : this.config.thresholds.warningPercent,
      isNewEpisode: true,
    };

    const alertInsert = buildAlertRecord(input, detection, userId, now);

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
