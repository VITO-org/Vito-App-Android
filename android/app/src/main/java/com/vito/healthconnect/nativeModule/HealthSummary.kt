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
    )
}
