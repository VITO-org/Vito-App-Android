package com.example.healthdashboard.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.health.connect.client.HealthConnectClient
import com.example.healthdashboard.data.DashboardMetrics
import com.example.healthdashboard.data.HealthDashboardRepository
import com.example.healthdashboard.health.HealthConnectManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class MainUiState(
    val sdkStatus: Int? = null,
    val hasPermissions: Boolean = false,
    val isLoading: Boolean = true,
    val metrics: DashboardMetrics = DashboardMetrics(),
    val errorMessage: String? = null,
)

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val manager = HealthConnectManager(application.applicationContext)
    private val repository by lazy { HealthDashboardRepository(manager.client()) }

    private val _uiState = MutableStateFlow(MainUiState())
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    val permissions: Set<String> = manager.permissions
    val providerPackageName: String = manager.providerPackageName

    init {
        refreshDashboard()
    }

    fun refreshDashboard() {
        viewModelScope.launch {
            val sdkStatus = manager.sdkStatus()
            if (sdkStatus != HealthConnectClient.SDK_AVAILABLE) {
                _uiState.value = MainUiState(
                    sdkStatus = sdkStatus,
                    isLoading = false,
                    errorMessage = null,
                )
                return@launch
            }

            val hasPermissions = manager.hasAllPermissions()
            if (!hasPermissions) {
                _uiState.value = MainUiState(
                    sdkStatus = sdkStatus,
                    hasPermissions = false,
                    isLoading = false,
                    errorMessage = "Necesitamos permisos para leer tu actividad diaria.",
                )
                return@launch
            }

            _uiState.update {
                it.copy(
                    sdkStatus = sdkStatus,
                    hasPermissions = true,
                    isLoading = true,
                    errorMessage = null,
                )
            }

            runCatching {
                repository.readTodayMetrics()
            }.onSuccess { metrics ->
                _uiState.value = MainUiState(
                    sdkStatus = sdkStatus,
                    hasPermissions = true,
                    isLoading = false,
                    metrics = metrics,
                )
            }.onFailure { throwable ->
                _uiState.value = MainUiState(
                    sdkStatus = sdkStatus,
                    hasPermissions = true,
                    isLoading = false,
                    errorMessage = throwable.message ?: "No se pudieron leer los datos de Health Connect.",
                )
            }
        }
    }

    fun onPermissionsResult(grantedPermissions: Set<String>) {
        if (grantedPermissions.containsAll(permissions)) {
            refreshDashboard()
            return
        }

        _uiState.update {
            it.copy(
                hasPermissions = false,
                isLoading = false,
                errorMessage = "Sin permisos no podemos mostrar el dashboard.",
            )
        }
    }
}
