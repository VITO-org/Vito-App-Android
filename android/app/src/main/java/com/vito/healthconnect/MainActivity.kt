package com.vito.healthconnect

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * Actividad principal de la app React Native.
 *
 * Reemplaza la anterior MainActivity que manejaba todo el ciclo de
 * Health Connect + UI nativa. Ahora React Native maneja la UI y el
 * módulo nativo VitoHealthModule expone Health Connect al JS.
 *
 * Los permisos runtime de Health Connect se manejan desde
 * VitoHealthModule.requestPermissions() usando currentActivity.
 */
class MainActivity : ReactActivity() {

    /**
     * Nombre del componente principal registrado en index.js.
     */
    override fun getMainComponentName(): String = "VitoHealthConnect"

    /**
     * ReactActivityDelegate que puede activar la nueva arquitectura (Fabric).
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
