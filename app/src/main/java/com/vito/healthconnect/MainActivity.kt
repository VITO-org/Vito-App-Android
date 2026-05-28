package com.vito.healthconnect

import android.content.Intent
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.lifecycle.lifecycleScope
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val TAG = "VitoHealth"
    
    private val permissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
    )

    private var isRequestingPermissions = false

    private val requestPermissions = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract(),
    ) { grantedPermissions ->
        isRequestingPermissions = false
        Log.d(TAG, "Permisos concedidos: $grantedPermissions")
        if (grantedPermissions.containsAll(permissions)) {
            loadHealthData()
        } else if (grantedPermissions.isNotEmpty()) {
            setStatus("Permisos parciales concedidos. Cargando datos disponibles...")
            loadHealthData()
        } else {
            setStatus("No se concedieron permisos. Habilitalos en Health Connect.")
        }
    }

    private lateinit var healthConnectClient: HealthConnectClient
    private lateinit var statusText: TextView
    private lateinit var metricsContainer: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(buildScreen())
        checkHealthConnect()
    }

    private fun checkHealthConnect() {
        val status = HealthConnectClient.getSdkStatus(this, HEALTH_CONNECT_PACKAGE)
        Log.d(TAG, "Estado de Health Connect SDK: $status")
        
        when (status) {
            HealthConnectClient.SDK_AVAILABLE -> {
                healthConnectClient = HealthConnectClient.getOrCreate(this)
                setStatus("Health Connect listo. Pulsa 'Conectar' para autorizar.")
            }
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                setStatus("Health Connect requiere actualización.")
                openHealthConnectStore()
            }
            else -> {
                setStatus("Health Connect no compatible o no instalado.")
            }
        }
    }

    private fun requestHealthPermissions() {
        if (isRequestingPermissions) return
        
        if (!::healthConnectClient.isInitialized) {
            checkHealthConnect()
            return
        }

        lifecycleScope.launch {
            try {
                val granted = healthConnectClient.permissionController.getGrantedPermissions()
                if (granted.containsAll(permissions)) {
                    loadHealthData()
                } else {
                    isRequestingPermissions = true
                    requestPermissions.launch(permissions)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error al solicitar permisos", e)
                setStatus("Error al abrir permisos: ${e.message}")
                isRequestingPermissions = false
            }
        }
    }

    private fun loadHealthData() {
        lifecycleScope.launch {
            runCatching {
                setStatus("Cargando datos...")
                val timeRange = todayTimeRange()
                
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

                val sleepSessions = try {
                    healthConnectClient.readRecords(
                        ReadRecordsRequest(
                            recordType = SleepSessionRecord::class,
                            timeRangeFilter = timeRange,
                        ),
                    ).records
                } catch (e: Exception) { emptyList() }

                val heartRateRecords = try {
                    healthConnectClient.readRecords(
                        ReadRecordsRequest(
                            recordType = HeartRateRecord::class,
                            timeRangeFilter = timeRange,
                        ),
                    ).records
                } catch (e: Exception) { emptyList() }

                val exercises = try {
                    healthConnectClient.readRecords(
                        ReadRecordsRequest(
                            recordType = ExerciseSessionRecord::class,
                            timeRangeFilter = timeRange,
                        ),
                    ).records
                } catch (e: Exception) { emptyList() }

                val heartRateSamples = heartRateRecords.flatMap { record -> record.samples }
                val averageBpm = heartRateSamples
                    .map { sample -> sample.beatsPerMinute }
                    .takeIf { samples -> samples.isNotEmpty() }
                    ?.average()

                HealthSummary(
                    steps = aggregate[StepsRecord.COUNT_TOTAL] ?: 0L,
                    distanceMeters = aggregate[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0,
                    caloriesKcal = aggregate[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories ?: 0.0,
                    sleepMinutes = sleepSessions.sumOf { session ->
                        Duration.between(session.startTime, session.endTime).toMinutes()
                    },
                    averageBpm = averageBpm,
                    exerciseSessions = exercises.size,
                )
            }.onSuccess { summary ->
                renderSummary(summary)
                setStatus("Datos actualizados: ${ZonedDateTime.now().toLocalTime()}")
            }.onFailure { error ->
                Log.e(TAG, "Error cargando datos", error)
                setStatus("Error al leer datos: ${error.localizedMessage}")
            }
        }
    }

    private fun todayTimeRange(): TimeRangeFilter {
        val zone = ZoneId.systemDefault()
        val startOfDay = ZonedDateTime.now(zone).toLocalDate().atStartOfDay(zone).toInstant()
        return TimeRangeFilter.between(startOfDay, Instant.now())
    }

    private fun renderSummary(summary: HealthSummary) {
        metricsContainer.removeAllViews()
        metricsContainer.addView(metricCard("Pasos hoy", "%,d".format(summary.steps)))
        metricsContainer.addView(metricCard("Distancia", "%.2f km".format(summary.distanceMeters / 1_000.0)))
        metricsContainer.addView(metricCard("Calorías activas/totales", "%.0f kcal".format(summary.caloriesKcal)))
        metricsContainer.addView(metricCard("Sueño hoy", formatMinutes(summary.sleepMinutes)))
        metricsContainer.addView(metricCard("Pulso medio", summary.averageBpm?.let { "%.0f bpm".format(it) } ?: "Sin datos"))
        metricsContainer.addView(metricCard("Ejercicios", summary.exerciseSessions.toString()))
    }

    private fun buildScreen(): View {
        val scrollView = ScrollView(this).apply {
            setBackgroundColor(getColor(R.color.screen_background))
        }

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 60, 40, 40)
        }

        val title = TextView(this).apply {
            text = "Vito Health"
            textSize = 32f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(getColor(R.color.text_primary))
        }

        statusText = TextView(this).apply {
            textSize = 14f
            setTextColor(getColor(R.color.text_secondary))
            setPadding(0, 10, 0, 30)
        }

        val permissionButton = Button(this).apply {
            text = "Conectar Health Connect"
            setOnClickListener { requestHealthPermissions() }
        }

        val refreshButton = Button(this).apply {
            text = "Actualizar ahora"
            setOnClickListener { requestHealthPermissions() }
        }

        metricsContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 30, 0, 0)
        }

        content.addView(title)
        content.addView(statusText)
        content.addView(permissionButton)
        content.addView(refreshButton)
        content.addView(metricsContainer)

        scrollView.addView(content)
        return scrollView
    }

    private fun metricCard(label: String, value: String): View {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(android.R.drawable.dialog_holo_light_frame)
            setPadding(30, 30, 30, 30)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, 0, 0, 20) }
        }

        card.addView(TextView(this).apply {
            text = label
            textSize = 14f
            setTextColor(getColor(R.color.text_secondary))
        })

        card.addView(TextView(this).apply {
            text = value
            textSize = 22f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(getColor(R.color.text_primary))
        })

        return card
    }

    private fun setStatus(message: String) {
        statusText.text = message
        Log.i(TAG, "Status: $message")
    }

    private fun openHealthConnectStore() {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse("https://play.google.com/store/apps/details?id=$HEALTH_CONNECT_PACKAGE")
            setPackage("com.android.vending")
        }
        runCatching { startActivity(intent) }
    }

    private fun formatMinutes(totalMinutes: Long): String {
        val hours = totalMinutes / 60
        val minutes = totalMinutes % 60
        return "${hours}h ${minutes}m"
    }

    private data class HealthSummary(
        val steps: Long,
        val distanceMeters: Double,
        val caloriesKcal: Double,
        val sleepMinutes: Long,
        val averageBpm: Double?,
        val exerciseSessions: Int,
    )

    private companion object {
        const val HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata"
    }
}
