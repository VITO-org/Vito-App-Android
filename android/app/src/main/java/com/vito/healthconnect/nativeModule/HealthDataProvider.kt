package com.vito.healthconnect.nativeModule

import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.BloodPressureRecord
import androidx.health.connect.client.records.BodyTemperatureRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * Encapsula toda la lógica de comunicación con Google Health Connect.
 * Extraída y refactorizada desde MainActivity.kt original para ser usada
 * desde el React Native Native Module (VitoHealthModule) y también desde
 * una Activity nativa si fuera necesario.
 *
 * No depende de React Native — es Kotlin/Android puro.
 */
class HealthDataProvider(
    private val healthConnectClient: HealthConnectClient,
) {
    private val TAG = "VitoHealth"

    companion object {
        const val HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata"

        /**
         * Conjunto completo de permisos de solo lectura necesarios.
         */
        val REQUIRED_PERMISSIONS = setOf(
            androidx.health.connect.client.permission.HealthPermission.getReadPermission(StepsRecord::class),
            androidx.health.connect.client.permission.HealthPermission.getReadPermission(DistanceRecord::class),
            androidx.health.connect.client.permission.HealthPermission.getReadPermission(HeartRateRecord::class),
            androidx.health.connect.client.permission.HealthPermission.getReadPermission(SleepSessionRecord::class),
            androidx.health.connect.client.permission.HealthPermission.getReadPermission(ExerciseSessionRecord::class),
            androidx.health.connect.client.permission.HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
            androidx.health.connect.client.permission.HealthPermission.getReadPermission(BloodPressureRecord::class),
            androidx.health.connect.client.permission.HealthPermission.getReadPermission(OxygenSaturationRecord::class),
            androidx.health.connect.client.permission.HealthPermission.getReadPermission(BodyTemperatureRecord::class),
        )

        /**
         * Verifica el estado del SDK de Health Connect en el dispositivo.
         * @return "available", "update_required", o "unavailable"
         */
        fun checkSdkStatus(context: android.content.Context): String {
            return when (HealthConnectClient.getSdkStatus(context, HEALTH_CONNECT_PACKAGE)) {
                HealthConnectClient.SDK_AVAILABLE -> "available"
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update_required"
                else -> "unavailable"
            }
        }

        /**
         * Crea un Intent para abrir Health Connect en Google Play Store.
         */
        fun createPlayStoreIntent(): Intent {
            return Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("https://play.google.com/store/apps/details?id=$HEALTH_CONNECT_PACKAGE")
                setPackage("com.android.vending")
            }
        }
    }

    /**
     * Rango de tiempo desde el inicio del día (zona horaria local) hasta ahora.
     */
    private fun todayTimeRange(): TimeRangeFilter {
        val zone = ZoneId.systemDefault()
        val startOfDay = ZonedDateTime.now(zone).toLocalDate().atStartOfDay(zone).toInstant()
        return TimeRangeFilter.between(startOfDay, Instant.now())
    }

    /**
     * Lee todos los datos de Health Connect del día de hoy.
     *
     * Cada tipo de registro tiene su propio try/catch para que un error
     * en un tipo no bloquee los demás (mismo patrón que el original).
     */
    suspend fun loadTodayData(): HealthSummary {
        val timeRange = todayTimeRange()

        // Aggregate: pasos, distancia, calorías
        val aggregate = healthConnectClient.aggregate(
            AggregateRequest(
                metrics = setOf(
                    StepsRecord.COUNT_TOTAL,
                    DistanceRecord.DISTANCE_TOTAL,
                    TotalCaloriesBurnedRecord.ENERGY_TOTAL,
                ),
                timeRangeFilter = timeRange,
            ),
        )

        // ReadRecords: sueño
        val sleepSessions = try {
            healthConnectClient.readRecords(
                ReadRecordsRequest(
                    recordType = SleepSessionRecord::class,
                    timeRangeFilter = timeRange,
                ),
            ).records
        } catch (e: Exception) {
            Log.w(TAG, "Error leyendo sueño, continuando...", e)
            emptyList()
        }

        // ReadRecords: frecuencia cardíaca
        val heartRateRecords = try {
            healthConnectClient.readRecords(
                ReadRecordsRequest(
                    recordType = HeartRateRecord::class,
                    timeRangeFilter = timeRange,
                ),
            ).records
        } catch (e: Exception) {
            Log.w(TAG, "Error leyendo frecuencia cardíaca, continuando...", e)
            emptyList()
        }

        // ReadRecords: ejercicio
        val exercises = try {
            healthConnectClient.readRecords(
                ReadRecordsRequest(
                    recordType = ExerciseSessionRecord::class,
                    timeRangeFilter = timeRange,
                ),
            ).records
        } catch (e: Exception) {
            Log.w(TAG, "Error leyendo ejercicios, continuando...", e)
            emptyList()
        }

        // Calcular promedio de BPM
        val heartRateSamples = heartRateRecords.flatMap { record -> record.samples }
        val averageBpm = heartRateSamples
            .map { sample -> sample.beatsPerMinute }
            .takeIf { samples -> samples.isNotEmpty() }
            ?.average()

        // Leer presión arterial
        val bloodPressureRecords = try {
            healthConnectClient.readRecords(
                ReadRecordsRequest(
                    recordType = BloodPressureRecord::class,
                    timeRangeFilter = timeRange,
                ),
            ).records
        } catch (e: Exception) {
            Log.w(TAG, "Error leyendo presión arterial, continuando...", e)
            emptyList()
        }
        val latestBp = bloodPressureRecords.maxByOrNull { it.time }
        val bloodPressureSystolic = latestBp?.systolic?.inMillimetersOfMercury
        val bloodPressureDiastolic = latestBp?.diastolic?.inMillimetersOfMercury

        // Leer saturación de oxígeno
        val spo2Records = try {
            healthConnectClient.readRecords(
                ReadRecordsRequest(
                    recordType = OxygenSaturationRecord::class,
                    timeRangeFilter = timeRange,
                ),
            ).records
        } catch (e: Exception) {
            Log.w(TAG, "Error leyendo SpO2, continuando...", e)
            emptyList()
        }
        val latestSpo2 = spo2Records.maxByOrNull { it.time }
        val spo2Percent = latestSpo2?.percentage?.value

        // Leer temperatura corporal
        val temperatureRecords = try {
            healthConnectClient.readRecords(
                ReadRecordsRequest(
                    recordType = BodyTemperatureRecord::class,
                    timeRangeFilter = timeRange,
                ),
            ).records
        } catch (e: Exception) {
            Log.w(TAG, "Error leyendo temperatura, continuando...", e)
            emptyList()
        }
        val latestTemp = temperatureRecords.maxByOrNull { it.time }
        val bodyTemperatureCelsius = latestTemp?.temperature?.inCelsius

        return HealthSummary(
            steps = aggregate[StepsRecord.COUNT_TOTAL] ?: 0L,
            distanceMeters = aggregate[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0,
            caloriesKcal = aggregate[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories ?: 0.0,
            sleepMinutes = sleepSessions.sumOf { session ->
                Duration.between(session.startTime, session.endTime).toMinutes()
            },
            averageBpm = averageBpm,
            exerciseSessions = exercises.size,
            bloodPressureSystolic = bloodPressureSystolic,
            bloodPressureDiastolic = bloodPressureDiastolic,
            spo2Percent = spo2Percent,
            bodyTemperatureCelsius = bodyTemperatureCelsius,
        )
    }

    /**
     * Obtiene los permisos actualmente concedidos.
     */
    suspend fun getGrantedPermissions(): Set<String> {
        return healthConnectClient.permissionController.getGrantedPermissions()
    }
}
