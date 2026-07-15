---
title: Migración Vito Health Connect a React Native con puente nativo para wearables
status: approved
date: 2026-05-31
tags:
  - react-native
  - migration
  - health-connect
  - native-modules
  - wearables
  - typescript
---

# Spec: Migración Vito Health Connect → React Native + Native Modules

## Goal

Migrar la app **Vito Health Connect** de Android nativo (Kotlin) a **React Native como plataforma principal**, conservando la capacidad de usar **módulos nativos de Android** para Health Connect y futura integración con wearables.

## Requirements

1. Inicializar proyecto React Native con TypeScript como plataforma principal
2. Migrar toda la lógica de Health Connect (permisos, lectura de pasos, distancia, calorías, sueño, frecuencia cardíaca, ejercicio) a un módulo nativo Android embebido en RN
3. Crear la estructura base de la app RN con navegación entre pantallas
4. Migrar la UI actual a componentes React Native replicando funcionalidad y diseño
5. Preparar la arquitectura de módulo nativo Android para soporte futuro de wearables (Wear OS)
6. Configurar `react-native-health-connect` como bridge inicial para Health Connect
7. Mantener la configuración Gradle funcional para el módulo nativo Android dentro del proyecto RN
8. Migrar el theme visual (colores, tipografía) de la app actual a un sistema de temas en RN

## Files in Scope

| Archivo actual | Acción |
|----------------|--------|
| `README.md` | Actualizar |
| `app/src/main/java/com/vito/healthconnect/MainActivity.kt` | Refactorizar a módulo nativo RN |
| `app/build.gradle.kts` | Mantener + adaptar para RN |
| `app/src/main/AndroidManifest.xml` | Mantener + adaptar |
| `app/src/main/res/values/colors.xml` | Migrar a theme RN |
| `app/src/main/res/values/strings.xml` | Migrar a i18n RN |
| `app/src/main/res/values/styles.xml` | Migrar a theme RN |
| `build.gradle.kts` (root) | Mantener + adaptar |
| `settings.gradle.kts` | Mantener + adaptar |
| `gradle.properties` | Mantener |

## Constraints

1. El código Kotlin existente se transforma en módulo nativo Android dentro del proyecto RN, no se descarta
2. La app debe poder compilar y ejecutarse correctamente al final de cada fase de migración
3. Compatibilidad con Health Connect SDK 1.1.0-alpha11
4. La arquitectura del módulo nativo de wearables debe quedar definida aunque los métodos sean stub
5. Migración progresiva: primero RN funcional con Health Connect, luego mejoras

## Acceptance Criteria

1. `npx react-native run-android` compila y lanza la app sin errores
2. La app lee y muestra pasos diarios desde Health Connect a través del bridge nativo
3. La app lee y muestra distancia, calorías, sueño, frecuencia cardíaca y ejercicio
4. La UI en React Native replica toda la funcionalidad de la app nativa actual
5. La estructura del módulo nativo Android para wearables está definida con su interfaz (aunque los métodos concretos sean stub)
6. El proyecto RN tiene TypeScript configurado y funcionando

## Verification Hooks

| Nombre | Comando | Criterio |
|--------|---------|----------|
| Build React Native | `npx react-native run-android` | exit code 0 |
| Health Connect Data | `adb shell am start -n com.vito.healthconnect/.MainActivity` | app muestra datos |
