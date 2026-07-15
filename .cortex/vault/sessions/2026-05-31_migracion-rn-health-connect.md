---
title: Migración Vito Health Connect a React Native con puente nativo para wearables
session_id: 2026-05-31_migracion-rn-health-connect
status: closed
date: 2026-05-31
tags:
  - react-native
  - migration
  - health-connect
  - native-modules
  - wearables
  - typescript
  - phase-1
---

# Session Note: Migración Vito Health Connect → React Native

## Spec

- **Spec**: `.cortex/vault/specs/2026-05-31_migracion-rn-health-connect.md`
- **Design Doc**: `.cortex/vault/designs/2026-05-31_migracion-rn-health-connect.md`
- **Modo**: Deep Track (4 checkpoints emitidos)

## Resumen

Se migró la app Vito Health Connect de Android nativo (Kotlin) a React Native 0.85.3 + TypeScript como plataforma principal, conservando un módulo nativo Android para Google Health Connect.

## Cambios realizados

| Área | Antes | Después |
|------|-------|---------|
| Plataforma | Android nativo (Kotlin) | React Native 0.85.3 + TS |
| UI | Views programáticas en MainActivity.kt | Componentes RN (MetricCard, HealthDashboard, etc.) |
| Health Connect | Directo en Activity | Native Module (VitoHealthModule.kt) |
| Build | Gradle KTS en raíz | Groovy DSL bajo `android/` |
| Permisos HC | En manifiesto | Preservados + INTERNET (RN) |
| Estructura | `app/src/main/java/` | `android/app/src/main/java/` |

## Archivos tocados (~30)

### Nuevos (RN)
- `package.json`, `tsconfig.json`, `index.js`, `App.tsx`, `app.json`
- `babel.config.js`, `metro.config.js`
- `src/types/health.ts`
- `src/services/VitoHealthNative.ts`
- `src/context/HealthProvider.tsx`
- `src/components/MetricCard.tsx`, `StatusBanner.tsx`, `PermissionButton.tsx`, `HealthDashboard.tsx`
- `src/theme/colors.ts`, `spacing.ts`

### Nuevos (Native Module Android)
- `android/app/src/main/java/com/vito/healthconnect/nativeModule/VitoHealthModule.kt`
- `android/app/src/main/java/com/vito/healthconnect/nativeModule/VitoHealthPackage.kt`
- `android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt`
- `android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthSummary.kt`

### Modificados
- `android/app/src/main/java/com/vito/healthconnect/MainActivity.kt` → ReactActivity
- `android/app/src/main/java/com/vito/healthconnect/MainApplication.kt` → ReactHost
- `android/app/src/main/AndroidManifest.xml` → HC + RN merge
- `.gitignore` → + RN entries

### Reemplazados (build system)
- `android/build.gradle` (Groovy)
- `android/settings.gradle` (Groovy)
- `android/app/build.gradle` (Groovy + HC deps)
- `android/gradle.properties` (RN template)

## Decisiones arquitectónicas

1. **React Native 0.85.3** con React 19 como plataforma principal
2. **Native Module propio** para Health Connect (no dependemos de react-native-health-connect)
3. **4 métodos** en el bridge: checkAvailability, requestPermissions, getHealthData, openHealthConnectStore
4. **Wearables futuros**: arquitectura extensible VitoNativeModule → HealthConnectModule + WearModule
5. **TypeScript estricto** configurado

## Pendientes

- `npm install` (dependencias no instaladas aún)
- `npx react-native run-android` (build no verificado)
- Implementar módulo de wearables (Wear OS) en fase futura
- Reemplazar Supabase Kotlin deps por @supabase/supabase-js

## Próximos pasos

1. ✅ Instalar dependencias npm
2. ✅ Verificar build con `npx react-native run-android`
3. Probar Health Connect en dispositivo/emulador
4. Implementar mejoras de UI y funcionalidad
