package com.example.healthdashboard

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.health.connect.client.PermissionController
import com.example.healthdashboard.ui.HealthDashboardApp
import com.example.healthdashboard.ui.MainViewModel
import com.example.healthdashboard.ui.theme.HealthDashboardTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val viewModel: MainViewModel = viewModel()
            val uiState by viewModel.uiState.collectAsStateWithLifecycle()
            val context = LocalContext.current
            val permissionLauncher = rememberLauncherForActivityResult(
                PermissionController.createRequestPermissionResultContract(),
            ) { grantedPermissions ->
                viewModel.onPermissionsResult(grantedPermissions)
            }

            HealthDashboardTheme {
                HealthDashboardApp(
                    state = uiState,
                    onRequestPermissions = {
                        permissionLauncher.launch(viewModel.permissions)
                    },
                    onRefresh = viewModel::refreshDashboard,
                    onInstallOrUpdateHealthConnect = {
                        val uriString =
                            "market://details?id=${viewModel.providerPackageName}&url=healthconnect%3A%2F%2Fonboarding"
                        val intent = Intent(Intent.ACTION_VIEW).apply {
                            setPackage("com.android.vending")
                            data = Uri.parse(uriString)
                            putExtra("overlay", true)
                            putExtra("callerId", context.packageName)
                        }
                        context.startActivity(intent)
                    },
                )
            }
        }
    }
}
