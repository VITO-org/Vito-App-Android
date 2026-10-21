---
title: Arquitectura React Native + Native Module para Vito Health Connect
session: 2026-05-31_migracion-rn-health-connect
spec: 2026-05-31_migracion-rn-health-connect
status: draft
tags:
  - react-native
  - native-modules
  - health-connect
  - architecture
  - phase-1
created: 2026-05-31
---

# Design: React Native + Native Module para Vito Health Connect

## Architecture Decision

Se adopta **React Native con TypeScript** como plataforma principal, con **módulo nativo Android** para Health Connect. El módulo nativo expone 4 métodos a JS. La UI se construye en React Native con componentes funcionales + hooks. La estructura del proyecto proyecta RN como raíz y el código Kotlin existente como módulo nativo interno.

## Project Structure

```
vito-app-android/
├── package.json                    # Dependencias RN
├── tsconfig.json                   # TypeScript config
├── index.js                        # Entry point RN
├── App.tsx                         # Componente raíz
├── babel.config.js
├── metro.config.js
├── android/                        # Proyecto Android (generado por RN + modificado)
│   └── app/
│       └── src/main/java/com/vito/healthconnect/
│           ├── MainActivity.kt     # Activity RN (generada por init, modificada mínimamente)
│           ├── nativeModule/       # ← Nuevo código nativo
│           │   ├── VitoHealthModule.kt        # ReactModule principal
│           │   ├── VitoHealthPackage.kt       # ReactPackage de registro
│           │   ├── HealthDataProvider.kt      # Lógica Health Connect (extraída del MainActivity original)
│           │   └── HealthSummary.kt           # Modelo de datos compartido
│           └── ...
├── src/
│   ├── types/
│   │   └── health.ts               # Interface HealthSummary y tipos
│   ├── services/
│   │   └── VitoHealthNative.ts     # Wrapper TS del Native Module
│   ├── context/
│   │   └── HealthProvider.tsx      # React Context para Health Connect
│   ├── components/
│   │   ├── MetricCard.tsx          # Componente reutilizable de métrica
│   │   ├── HealthDashboard.tsx     # Dashboard principal
│   │   ├── StatusBanner.tsx        # Banner de estado (permisos, errores)
│   │   └── PermissionButton.tsx    # Botón de conectar/refresh
│   └── theme/
│       ├── colors.ts              # Colores migrados de colors.xml
│       └── styles.ts              # Estilos consistentes con la app nativa
└── __tests__/
    └── ...
```

## Data Model

### Native → JS Bridge Contract

```typescript
// src/types/health.ts
interface HealthSummary {
  steps: number;
  distanceMeters: number;
  caloriesKcal: number;
  sleepMinutes: number;
  averageBpm: number | null;
  exerciseSessions: number;
}

type HealthConnectStatus = 'available' | 'update_required' | 'unavailable';

interface PermissionResult {
  granted: boolean;
  partiallyGranted: boolean;
}
```

### Native Module API

| Method | Return Type | Description |
|--------|-------------|-------------|
| `checkAvailability()` | `Promise<HealthConnectStatus>` | Verifica si Health Connect está disponible en el dispositivo |
| `requestPermissions()` | `Promise<PermissionResult>` | Solicita permisos runtime de Health Connect |
| `getHealthData()` | `Promise<HealthSummary>` | Lee todos los datos de Health Connect del día |
| `openHealthConnectStore()` | `Promise<void>` | Abre Play Store para instalar/actualizar HC |

### React Context

```typescript
// src/context/HealthProvider.tsx
interface HealthContextValue {
  summary: HealthSummary | null;
  status: HealthConnectStatus | null;
  loading: boolean;
  error: string | null;
  permissionsGranted: boolean;
  requestPermissions: () => Promise<void>;
  refreshData: () => Promise<void>;
}
```

## Data Flow

```
App.tsx
  └── HealthProvider (Context wrapper)
        └── HealthDashboard
              ├── StatusBanner (muestra estado de HC y permisos)
              ├── PermissionButton ("Conectar" / "Actualizar")
              └── [MetricCard] × 6
                    ├── "Pasos hoy" → steps
                    ├── "Distancia" → distanceMeters
                    ├── "Calorías activas" → caloriesKcal
                    ├── "Sueño hoy" → sleepMinutes
                    ├── "Pulso medio" → averageBpm
                    └── "Ejercicios" → exerciseSessions
```

Flujo de datos:
1. App monta → `HealthProvider` llama `checkAvailability()`
2. Si `available` → muestra botón "Conectar Health Connect"
3. Usuario tapa → `requestPermissions()` → diálogo nativo HC
4. Permisos OK → `getHealthData()` → `aggregate()` + `readRecords()` → `HealthSummary`
5. Resultado fluye por Context a los MetricCard
6. Botón "Actualizar" → repite paso 4

## Android Manifest (a preservar)

Los siguientes elementos del manifiesto actual DEBEN mantenerse en `android/app/src/main/AndroidManifest.xml` del proyecto RN:

- 6 permisos Android 14+: `READ_STEPS`, `READ_DISTANCE`, `READ_HEART_RATE`, `READ_SLEEP`, `READ_EXERCISE`, `READ_TOTAL_CALORIES_BURNED`
- 6 permisos legacy: `androidx.health.permission.*`
- `<queries>` para `com.google.android.apps.healthdata`
- Intent filter `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`
- Activity alias `ViewPermissionUsageActivity`

## Gradle Dependencies (android/app/build.gradle)

A las dependencias que RN genera por defecto, agregar:

```gradle
implementation "androidx.health.connect:connect-client:1.1.0-alpha11"
implementation "androidx.activity:activity-ktx:1.9.0"
implementation "androidx.lifecycle:lifecycle-runtime-ktx:2.8.0"
```

## Temas visuales

```typescript
// src/theme/colors.ts
export const colors = {
  screenBackground: '#F7F8FA',
  surface: '#FFFFFF',
  textPrimary: '#18202A',
  textSecondary: '#5F6B7A',
  accent: '#2563EB',
};
```

```typescript
// src/theme/styles.ts
export const spacing = {
  paddingHorizontal: 40,
  paddingVertical: 60,
  cardPadding: 30,
  cardMarginBottom: 20,
};

export const fontSize = {
  title: 32,
  metricLabel: 14,
  metricValue: 22,
  status: 14,
};
```

## Wearables Architecture (future)

Para cuando se implemente Wear OS:

```
VitoNativeModule (base interface, en Kotlin)
  ├── HealthConnectModule  (actual, ya implementado)
  └── WearModule           (futuro, stub)
```

El `VitoHealthModule` se diseña como un facade que puede crecer horizontalmente. Cuando llegue wearables, se agrega un nuevo `@ReactMethod` en el mismo módulo (o un módulo separado registrado en el mismo `ReactPackage`).

## Migration Phases

| Phase | Descripción | Files |
|-------|-------------|-------|
| **P1** | Inicializar proyecto RN + TS | `npx react-native init`, config TS, migrar package.json |
| **P2** | Crear Native Module Kotlin | `VitoHealthModule.kt`, `VitoHealthPackage.kt`, `HealthDataProvider.kt` |
| **P3** | Implementar servicios RN | `VitoHealthNative.ts`, `HealthProvider.tsx` |
| **P4** | Migrar UI | `MetricCard.tsx`, `HealthDashboard.tsx`, `StatusBanner.tsx`, theme |
| **P5** | Integrar y probar | Build, tests, paridad visual |

## Risks

| Risk | Mitigation |
|------|-----------|
| react-native-health-connect desactualizado | Implementar módulo nativo propio |
| Permisos runtime requieren Activity | getCurrentActivity() en Native Module |
| Build híbrido conflictos Gradle | Mantener AGP 8.13.2, alinear versiones |
| Wear OS requiere módulo separado | Interfaz extensible VitoNativeModule |
