package com.vito.healthconnect.nativeModule

import android.content.Intent
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.health.connect.client.PermissionController
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*

/**
 * React Native Native Module que expone las funcionalidades de Google Health Connect
 * al mundo JavaScript/TypeScript.
 *
 * Métodos expuestos (todos via @ReactMethod, retornando Promises):
 * - checkAvailability(): Promise<String>
 * - requestPermissions(): Promise<ReadableMap>
 * - getHealthData(): Promise<ReadableMap>
 * - openHealthConnectStore(): Promise<Void>
 */
class VitoHealthModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val TAG = "VitoHealthModule"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var healthDataProvider: HealthDataProvider? = null
    private var isRequestingPermissions = false
    private var permissionLauncher: ActivityResultLauncher<Set<String>>? = null
    private var pendingPermissionsPromise: Promise? = null

    override fun getName(): String = "VitoHealthModule"

    /**
     * Verifica si Health Connect está disponible en el dispositivo.
     * Retorna: "available" | "update_required" | "unavailable"
     */
    @ReactMethod
    fun checkAvailability(promise: Promise) {
        try {
            val context = reactApplicationContext
            val status = HealthDataProvider.checkSdkStatus(context)

            if (status == "available") {
                // Si está disponible, inicializamos el cliente
                val client = androidx.health.connect.client.HealthConnectClient.getOrCreate(context)
                healthDataProvider = HealthDataProvider(client)
            }

            promise.resolve(status)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking availability", e)
            promise.resolve("unavailable")
        }
    }

    /**
     * Returns a single shared ActivityResultLauncher for Health Connect permissions,
     * registering it once with a stable key to avoid leaking launchers.
     */
    private fun getOrCreatePermissionLauncher(activity: ComponentActivity): ActivityResultLauncher<Set<String>> {
        val existing = permissionLauncher
        if (existing != null) return existing

        val launcher = activity.activityResultRegistry.register(
            "hc_permissions",
            PermissionController.createRequestPermissionResultContract()
        ) { grantedPermissions ->
            isRequestingPermissions = false
            val promise = pendingPermissionsPromise
            pendingPermissionsPromise = null
            if (promise != null) {
                val allGranted = grantedPermissions.containsAll(HealthDataProvider.REQUIRED_PERMISSIONS)
                val partialGranted = grantedPermissions.isNotEmpty()
                promise.resolve(buildResultMap(allGranted, partialGranted && !allGranted))
            }
        }
        permissionLauncher = launcher
        return launcher
    }

    /**
     * Solicita permisos de Health Connect al usuario.
     * Usa un único ActivityResultLauncher (creado lazy una vez) en vez de
     * registrar uno nuevo por cada invocación, evitando fugas de memoria.
     *
     * Retorna: { granted: boolean, partiallyGranted: boolean }
     */
    @ReactMethod
    fun requestPermissions(promise: Promise) {
        if (isRequestingPermissions) {
            promise.reject("ALREADY_REQUESTING", "Ya hay una solicitud de permisos en curso.")
            return
        }

        val activity = getCurrentActivity()
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No hay actividad activa para solicitar permisos.")
            return
        }

        if (healthDataProvider == null) {
            promise.reject("HC_NOT_READY", "Health Connect no está inicializado. Llama checkAvailability primero.")
            return
        }

        val activityForResult = activity as? ComponentActivity
        if (activityForResult == null) {
            promise.reject("NO_COMPAT_ACTIVITY", "La actividad actual no es ComponentActivity.")
            return
        }

        isRequestingPermissions = true

        // Store the promise before entering the coroutine so the callback can resolve it
        pendingPermissionsPromise = promise

        scope.launch {
            try {
                val granted = healthDataProvider!!.getGrantedPermissions()
                Log.d(TAG, "Permisos concedidos: $granted")
                Log.d(TAG, "Permisos requeridos: ${HealthDataProvider.REQUIRED_PERMISSIONS}")
                if (granted.containsAll(HealthDataProvider.REQUIRED_PERMISSIONS)) {
                    Log.d(TAG, "Todos los permisos concedidos ✓")
                    isRequestingPermissions = false
                    pendingPermissionsPromise = null
                    promise.resolve(buildResultMap(true, false))
                    return@launch
                }
                Log.d(TAG, "Faltan permisos, lanzando diálogo...")

                val launcher = getOrCreatePermissionLauncher(activityForResult)

                // Lanzamos en el main thread
                reactApplicationContext.runOnUiQueueThread {
                    launcher.launch(HealthDataProvider.REQUIRED_PERMISSIONS)
                }
            } catch (e: Exception) {
                isRequestingPermissions = false
                pendingPermissionsPromise = null
                Log.e(TAG, "Error requesting permissions", e)
                promise.reject("PERMISSION_ERROR", "Error al solicitar permisos: ${e.message}")
            }
        }
    }

    /**
     * Lee todos los datos de Health Connect del día de hoy.
     * Requiere que los permisos hayan sido concedidos primero.
     *
     * Retorna: HealthSummary como ReadableMap
     */
    @ReactMethod
    fun getHealthData(promise: Promise) {
        val provider = healthDataProvider
        if (provider == null) {
            promise.reject("HC_NOT_READY", "Health Connect no está inicializado. Llama checkAvailability primero.")
            return
        }

        scope.launch {
            try {
                val summary = provider.loadTodayData()
                promise.resolve(toWritableMap(summary.toMap()))
            } catch (e: Exception) {
                Log.e(TAG, "Error loading health data", e)
                promise.reject("DATA_ERROR", "Error al leer datos: ${e.message}")
            }
        }
    }

    /**
     * Abre Google Play Store en la página de Health Connect
     * para instalar o actualizar la app.
     */
    @ReactMethod
    fun openHealthConnectStore(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = HealthDataProvider.createPlayStoreIntent()
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening Play Store", e)
            promise.reject("STORE_ERROR", "No se pudo abrir Play Store.")
        }
    }

    /**
     * Cleanup al desmontar el módulo: cancela corrutinas,
     * limpia el launcher de permisos y la promesa pendiente.
     */
    override fun invalidate() {
        super.invalidate()
        permissionLauncher?.unregister()
        permissionLauncher = null
        pendingPermissionsPromise = null
        scope.cancel()
    }

    // ===== Helpers de conversión =====

    /**
     * Construye un WritableMap con el resultado de permisos.
     */
    private fun buildResultMap(granted: Boolean, partiallyGranted: Boolean): WritableMap {
        val map = Arguments.createMap()
        map.putBoolean("granted", granted)
        map.putBoolean("partiallyGranted", partiallyGranted)
        return map
    }

    /**
     * Convierte Map<String, Any?> a WritableMap (ReadableMap).
     */
    private fun toWritableMap(map: Map<String, Any?>): WritableMap {
        val result = Arguments.createMap()
        for ((key, value) in map) {
            when (value) {
                null -> result.putNull(key)
                is Int -> result.putInt(key, value)
                is Long -> result.putDouble(key, value.toDouble())
                is Double -> result.putDouble(key, value)
                is Float -> result.putDouble(key, value.toDouble())
                is Boolean -> result.putBoolean(key, value)
                is String -> result.putString(key, value)
                else -> result.putString(key, value.toString())
            }
        }
        return result
    }
}
