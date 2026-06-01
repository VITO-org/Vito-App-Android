/**
 * Health summary data read from Google Health Connect via native module.
 * Mirrors the Kotlin HealthSummary data class.
 */
export interface HealthSummary {
  steps: number;
  distanceMeters: number;
  caloriesKcal: number;
  sleepMinutes: number;
  averageBpm: number | null;
  exerciseSessions: number;
}

/**
 * Health Connect SDK availability status.
 */
export type HealthConnectStatus =
  | 'available'
  | 'update_required'
  | 'unavailable';

/**
 * Result of requesting Health Connect permissions.
 */
export interface PermissionResult {
  granted: boolean;
  partiallyGranted: boolean;
}
