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
  /** Presión arterial sistólica en mmHg (opcional, depende del dispositivo). */
  bloodPressureSystolic: number | null;
  /** Presión arterial diastólica en mmHg (opcional). */
  bloodPressureDiastolic: number | null;
  /** Saturación de oxígeno en porcentaje (opcional). */
  spo2Percent: number | null;
  /** Temperatura corporal en °C (opcional). */
  bodyTemperatureCelsius: number | null;
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
