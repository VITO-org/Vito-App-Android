package com.vito.healthconnect.nativeModule

/**
 * Health summary data class.
 * Los datos se convierten a ReadableMap para pasarlos a React Native via @ReactMethod.
 *
 * Migrada desde la data class anidada en MainActivity.kt original.
 */
data class HealthSummary(
    val steps: Long,
    val distanceMeters: Double,
    val caloriesKcal: Double,
    val sleepMinutes: Long,
    val averageBpm: Double?,
    val exerciseSessions: Int,
    /** Presión arterial sistólica en mmHg (opcional, depende del dispositivo). */
    val bloodPressureSystolic: Double?,
    /** Presión arterial diastólica en mmHg (opcional). */
    val bloodPressureDiastolic: Double?,
    /** Saturación de oxígeno en porcentaje (opcional). */
    val spo2Percent: Double?,
    /** Temperatura corporal en °C (opcional). */
    val bodyTemperatureCelsius: Double?,
) {
    /**
     * Convierte a un Map<String, Any> que React Native puede leer como ReadableMap.
     * RN espera tipos primitivos: Int, Long, Double, Boolean, String, null.
     */
    fun toMap(): Map<String, Any?> = mapOf(
        "steps" to steps,
        "distanceMeters" to distanceMeters,
        "caloriesKcal" to caloriesKcal,
        "sleepMinutes" to sleepMinutes,
        "averageBpm" to averageBpm,
        "exerciseSessions" to exerciseSessions,
        "bloodPressureSystolic" to bloodPressureSystolic,
        "bloodPressureDiastolic" to bloodPressureDiastolic,
        "spo2Percent" to spo2Percent,
        "bodyTemperatureCelsius" to bodyTemperatureCelsius,
    )
}
