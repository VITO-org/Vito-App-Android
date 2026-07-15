package com.vito.healthconnect.nativeModule

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * ReactPackage que registra VitoHealthModule en el ecosistema React Native.
 *
 * Debe agregarse en MainApplication.getPackages() para que RN reconozca
 * el módulo nativo VitoHealthModule desde JavaScript.
 */
class VitoHealthPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            VitoHealthModule(reactContext)
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
