/**
 * Alert escalation engine — HU-41 CA-05.
 *
 * Manages the escalation lifecycle: when an alert is generated, a timer
 * starts. If the user doesn't confirm within the configured timeout
 * (default: 5 minutes), the alert escalates to the guard contact.
 *
 * Adapted to new Supabase schema (2026-08-20):
 * - Escalation state is stored in `datos` jsonb (escalada, escalated_at)
 * - No separate DB columns for escalation tracking
 * - The updateAlertStatus callback now writes datos jsonb
 *
 * Design decisions:
 * - Escalation is time-based, using `setTimeout` (in-memory timer).
 * - Timers are tracked by alert ID → easy to cancel on confirmation.
 * - The escalation callback is injected (dependency injection) so the
 *   module stays testable without real notifications.
 * - In a real app, timers would persist across app restarts via
 *   background fetch or WorkManager (future enhancement).
 */
import type {
  AlertRecord,
  EscalationConfig,
  OnAlertEscalated,
} from './types';
import {DEFAULT_ESCALATION_CONFIG} from './types';

// ─── Escalation Manager ──────────────────────────────────────────

/**
 * Manages escalation timers for active alerts.
 *
 * Each active alert gets a timer. When the timer fires:
 * 1. The alert's datos.escalada is set to true.
 * 2. The datos.escalated_at is set to the current timestamp.
 * 3. The `onEscalate` callback is invoked with the updated alert.
 *
 * If the user confirms before the timer fires, the timer is cancelled.
 */
export class EscalationManager {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private config: EscalationConfig;
  private onEscalate: OnAlertEscalated;
  private updateAlertDatos: (alertId: string, datos: Record<string, unknown>) => Promise<void>;

  constructor(
    config: EscalationConfig = DEFAULT_ESCALATION_CONFIG,
    onEscalate: OnAlertEscalated = () => {},
    updateAlertDatos: (alertId: string, datos: Record<string, unknown>) => Promise<void> = async () => {},
  ) {
    this.config = config;
    this.onEscalate = onEscalate;
    this.updateAlertDatos = updateAlertDatos;
  }

  /**
   * Start an escalation timer for a newly generated alert (CA-05).
   * If the timer fires without cancellation, the alert escalates.
   *
   * @param alert The alert record to escalate
   */
  startEscalation(alert: AlertRecord): void {
    // Cancel any existing timer for this alert (safety)
    this.cancelEscalation(alert.id);

    const timer = setTimeout(async () => {
      this.timers.delete(alert.id);

      const now = new Date().toISOString();

      // Update datos jsonb with escalation state
      const updatedDatos = {
        ...(alert.datos as Record<string, unknown> ?? {}),
        escalada: true,
        escalated_at: now,
      };

      const escalatedAlert: AlertRecord = {
        ...alert,
        datos: updatedDatos,
      };

      // Persist the escalation state in datos jsonb
      try {
        await this.updateAlertDatos(alert.id, updatedDatos);
      } catch {
        // Best-effort: if persistence fails, the in-memory state still escalates
      }

      // Notify listeners
      this.onEscalate(escalatedAlert);
    }, this.config.escalationTimeoutMs);

    this.timers.set(alert.id, timer);
  }

  /**
   * Cancel the escalation timer for an alert (e.g., when user confirms).
   *
   * @param alertId The alert ID whose timer should be cancelled
   */
  cancelEscalation(alertId: string): void {
    const timer = this.timers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(alertId);
    }
  }

  /**
   * Get the number of active escalation timers (for testing/debugging).
   */
  get activeTimers(): number {
    return this.timers.size;
  }

  /**
   * Check if a specific alert has an active escalation timer.
   */
  hasTimer(alertId: string): boolean {
    return this.timers.has(alertId);
  }

  /**
   * Get the remaining time (ms) for an alert's escalation timer.
   * Returns -1 if no timer is active.
   */
  getRemainingTime(alertId: string): number {
    // We can't directly read setTimeout remaining time,
    // but we can compute it from the config and elapsed time
    // This is an approximation for UI display
    return this.timers.has(alertId) ? this.config.escalationTimeoutMs : -1;
  }

  /**
   * Clean up all timers (call on app shutdown or provider unmount).
   */
  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

// ─── Escalation Time Check (pure) ────────────────────────────────

/**
 * Check if an alert should be escalated based on elapsed time.
 * Pure function — used by the engine to verify escalation eligibility.
 *
 * @param alertGeneratedAt ISO timestamp when the alert was generated
 * @param escalationTimeoutMs Timeout in milliseconds
 * @param now Current time (injectable for testing)
 * @returns true if escalation should occur
 */
export function shouldEscalate(
  alertGeneratedAt: string,
  escalationTimeoutMs: number = DEFAULT_ESCALATION_CONFIG.escalationTimeoutMs,
  now: Date = new Date(),
): boolean {
  const generatedTime = new Date(alertGeneratedAt).getTime();
  const elapsed = now.getTime() - generatedTime;
  return elapsed >= escalationTimeoutMs;
}
