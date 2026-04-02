package com.example.healthdashboard.ui

import androidx.health.connect.client.HealthConnectClient
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlin.math.roundToInt

@Composable
fun HealthDashboardApp(
    state: MainUiState,
    onRequestPermissions: () -> Unit,
    onRefresh: () -> Unit,
    onInstallOrUpdateHealthConnect: () -> Unit,
) {
    Surface(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color(0xFFF5F7FA), Color(0xFFE1ECF7)),
                    ),
                ),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                HeroCard()

                when {
                    state.isLoading -> LoadingCard()
                    state.sdkStatus == HealthConnectClient.SDK_UNAVAILABLE -> UnsupportedCard()
                    state.sdkStatus == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> UpdateProviderCard(
                        onInstallOrUpdateHealthConnect,
                    )
                    !state.hasPermissions -> PermissionsCard(
                        message = state.errorMessage,
                        onRequestPermissions = onRequestPermissions,
                    )
                    else -> DashboardContent(
                        state = state,
                        onRefresh = onRefresh,
                    )
                }
            }
        }
    }
}

@Composable
private fun HeroCard() {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF102A43)),
        shape = RoundedCornerShape(28.dp),
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = "Health Dashboard",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "Un resumen diario de tu actividad usando datos reales de Health Connect.",
                style = MaterialTheme.typography.bodyLarge,
                color = Color(0xFFD9E2EC),
            )
        }
    }
}

@Composable
private fun LoadingCard() {
    StatusCard(
        title = "Leyendo datos",
        description = "Estamos consultando pasos, distancia y calorías activas para hoy.",
    ) {
        CircularProgressIndicator()
    }
}

@Composable
private fun UnsupportedCard() {
    StatusCard(
        title = "Dispositivo no compatible",
        description = "Health Connect requiere Android 9 o superior y servicios de Google Play.",
    )
}

@Composable
private fun UpdateProviderCard(onInstallOrUpdateHealthConnect: () -> Unit) {
    StatusCard(
        title = "Falta Health Connect",
        description = "Instala o actualiza el proveedor de Health Connect para habilitar el dashboard.",
        action = {
            Button(onClick = onInstallOrUpdateHealthConnect) {
                Text("Instalar / actualizar")
            }
        },
    )
}

@Composable
private fun PermissionsCard(
    message: String?,
    onRequestPermissions: () -> Unit,
) {
    StatusCard(
        title = "Permisos requeridos",
        description = message ?: "Necesitamos acceso a tus datos de actividad para armar el dashboard.",
        action = {
            Button(onClick = onRequestPermissions) {
                Text("Conceder permisos")
            }
        },
    )
}

@Composable
private fun DashboardContent(
    state: MainUiState,
    onRefresh: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        MetricCard(
            modifier = Modifier.weight(1f),
            label = "Pasos",
            value = state.metrics.steps.toString(),
            accent = Color(0xFF2F855A),
        )
        MetricCard(
            modifier = Modifier.weight(1f),
            label = "Distancia",
            value = "${"%.2f".format(state.metrics.distanceKm)} km",
            accent = Color(0xFF2B6CB0),
        )
    }

    MetricCard(
        modifier = Modifier.fillMaxWidth(),
        label = "Calorías activas",
        value = "${state.metrics.activeCaloriesKcal.roundToInt()} kcal",
        accent = Color(0xFFDD6B20),
    )

    MetricCard(
        modifier = Modifier.fillMaxWidth(),
        label = "Frecuencia cardíaca",
        value = state.metrics.avgHeartRateBpm?.let { "${it.roundToInt()} bpm" } ?: "Sin datos",
        accent = Color(0xFFB83280),
    )

    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.95f)),
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Resumen",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "Los datos mostrados corresponden al día actual y se leen de forma agregada para evitar duplicados entre distintas fuentes.",
                style = MaterialTheme.typography.bodyMedium,
            )
            state.errorMessage?.let { error ->
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            Button(onClick = onRefresh) {
                Text("Actualizar")
            }
        }
    }
}

@Composable
private fun StatusCard(
    title: String,
    description: String,
    action: (@Composable () -> Unit)? = null,
    content: (@Composable () -> Unit)? = null,
) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.95f)),
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodyMedium,
            )
            content?.invoke()
            action?.invoke()
        }
    }
}

@Composable
private fun MetricCard(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
    accent: Color,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.95f)),
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                modifier = Modifier
                    .background(accent.copy(alpha = 0.12f), RoundedCornerShape(999.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Text(
                    text = label,
                    color = accent,
                    style = MaterialTheme.typography.labelLarge,
                )
            }
            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}
