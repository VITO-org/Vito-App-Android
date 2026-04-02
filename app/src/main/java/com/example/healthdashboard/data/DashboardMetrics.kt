package com.example.healthdashboard.data

data class DashboardMetrics(
    val steps: Long = 0,
    val distanceKm: Double = 0.0,
    val activeCaloriesKcal: Double = 0.0,
    val avgHeartRateBpm: Double? = null,
)
