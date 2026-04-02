package com.example.healthdashboard.data

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class HealthDashboardRepository(
    private val healthConnectClient: HealthConnectClient,
) {
    suspend fun readTodayMetrics(): DashboardMetrics {
        val zoneId = ZoneId.systemDefault()
        val startTime = LocalDate.now(zoneId).atStartOfDay(zoneId).toInstant()
        val endTime = Instant.now()

        val response = healthConnectClient.aggregate(
            AggregateRequest(
                metrics = setOf(
                    StepsRecord.COUNT_TOTAL,
                    DistanceRecord.DISTANCE_TOTAL,
                    ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL,
                    HeartRateRecord.BPM_AVG,
                ),
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime),
            ),
        )

        return DashboardMetrics(
            steps = response[StepsRecord.COUNT_TOTAL] ?: 0L,
            distanceKm = response[DistanceRecord.DISTANCE_TOTAL]?.inKilometers ?: 0.0,
            activeCaloriesKcal = response[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0,
            avgHeartRateBpm = response[HeartRateRecord.BPM_AVG]?.toDouble(),
        )
    }
}
