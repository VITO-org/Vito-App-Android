# Vito Health Connect

Probando 

Aplicación móvil de salud y bienestar que integra **Google Health Connect** para leer métricas biométricas (pasos, distancia, calorías, sueño, frecuencia cardíaca y ejercicio).

## Índice

- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Prerrequisitos](#prerrequisitos)
- [Setup Inicial](#setup-inicial)
- [Conectar el teléfono para probar la app](#conectar-el-teléfono-para-probar-la-app)
- [Cómo ejecutar la app](#cómo-ejecutar-la-app)
  - [Probar Health Connect](#probar-health-connect)
- [Resolución de problemas](#resolución-de-problemas)
- [Convenciones de desarrollo](#convenciones-de-desarrollo)
- [Roadmap](#roadmap)
- [Planificación](#planificación)
  - [Historias de Usuario (HUs)](#backlog-de-producto)
  - [Sprints](#timeline-completo-s1s24)
  - [Releases](#releases)
  - [Equipo](#equipo-y-asignaciones)
- [Recursos](#recursos)

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework principal | React Native | 0.85.3 |
| Lenguaje UI | TypeScript | 5.8.3 |
| UI Engine | React | 19.2.3 |
| JS Engine | Hermes | provisto por RN 0.85 |
| Android SDK | compileSdk / targetSdk 35 | API 35 (Android 15) |
| Módulos nativos | Kotlin | 1.9.24 |
| Build System | Gradle (Groovy DSL) | 9.3.1 |
| Android Gradle Plugin | AGP | 8.13.2 |
| Health Connect SDK | `androidx.health.connect:connect-client` | 1.1.0-alpha11 |
| Node.js mínimo | | 22.11.0 |

## Arquitectura

### Hybrid Architecture: React Native + Native Modules

La app usa React Native como plataforma principal de UI, con **módulos nativos Android (Kotlin)** para la integración con Health Connect y (en el futuro) Wear OS.

```
┌──────────────────────────────────────────────────┐
│                 React Native (TS)                │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  App.tsx     │  │  Context / Providers     │  │
│  │  (entry)     │  │  ┌────────────────────┐  │  │
│  │              │  │  │  HealthProvider    │  │  │
│  │              │  │  │  (useHealth hook)  │  │  │
│  └──────┬───────┘  │  └─────────┬──────────┘  │  │
│         │          └────────────┼─────────────┘  │
│         ▼                       ▼                │
│  ┌──────────────────────────────────────────┐    │
│  │         Componentes (TSX)                │    │
│  │  HealthDashboard │ MetricCard │          │    │
│  │  PermissionButton│ StatusBanner          │    │
│  └───────────────────────┬──────────────────┘    │
│                          │                       │
│  ┌───────────────────────▼──────────────────┐    │
│  │  VitoHealthNative.ts (TypeScript Bridge) │    │
│  │  checkAvailability()                     │    │
│  │  requestPermissions()                    │    │
│  │  getHealthData()                         │    │
│  │  openHealthConnectStore()                │    │
│  └───────────────────────┬──────────────────┘    │
└──────────────────────────┼───────────────────────┘
                           │  NativeModules (RN Bridge)
┌──────────────────────────▼─────────────────────────┐
│              Android Native (Kotlin)               │
│  ┌──────────────────────────────────────────────┐  │
│  │  VitoHealthModule.kt (@ReactMethod)          │  │
│  │  checkAvailability() → Promise<String>       │  │
│  │  requestPermissions() → Promise<ReadableMap> │  │
│  │  getHealthData() → Promise<ReadableMap>      │  │
│  │  openHealthConnectStore() → Promise<Void>    │  │
│  └──────────────────────┬───────────────────────┘  │
│                         │                          │
│  ┌──────────────────────▼───────────────────────┐  │
│  │  HealthDataProvider.kt (lógica HC pura)      │  │
│  │  • loadTodayData() → HealthSummary           │  │
│  │  • getGrantedPermissions()                   │  │
│  │  • checkSdkStatus() (companion)              │  │
│  │  • 6 tipos de records: Steps, Distance,      │  │
│  │    HeartRate, Sleep, Exercise, Calories      │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │           Google Health Connect SDK          │  │
│  │  androidx.health.connect:connect-client      │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### Flujo de datos

1. `HealthDashboard` monta → `HealthProvider` llama `checkAvailability()` vía native module
2. Usuario toca **"Conectar Health Connect"** → `requestPermissions()` abre el sistema de permisos de Android
3. Permisos concedidos → `getHealthData()` → `HealthDataProvider.loadTodayData()` lee los 6 tipos de records de HC
4. Data viaja: `HealthSummary (Kotlin)` → `ReadableMap` → `HealthSummary (TypeScript)` → `React Context` → Componentes

### `applicationId`

La app se instala con `com.vito.healthconnect.rn` como `applicationId` para convivir con la versión nativa original (`com.vito.healthconnect`) en el mismo dispositivo. El `namespace` de Android sigue siendo `com.vito.healthconnect` para mantener compatibilidad con el R.class generado por React Native autolinking.

## Estructura del Proyecto

```
vito-app-android/
├── App.tsx                          # Componente raíz React Native
├── index.js                         # Entry point RN (AppRegistry)
├── app.json                         # displayName: "Vito Health Connect"
├── package.json                     # Dependencias RN/React
├── tsconfig.json                    # TypeScript strict, path alias @/
├── metro.config.js                  # Metro bundler config
├── babel.config.js                  # Babel preset RN
├── src/
│   ├── types/
│   │   └── health.ts                # Interfaces TS: HealthSummary, PermissionResult, etc.
│   ├── services/
│   │   └── VitoHealthNative.ts      # Wrapper TS del native module (con guardModule)
│   ├── context/
│   │   └── HealthProvider.tsx        # React Context + useHealth() hook
│   ├── components/
│   │   ├── HealthDashboard.tsx       # Pantalla principal con todas las métricas
│   │   ├── MetricCard.tsx            # Card individual para una métrica
│   │   ├── StatusBanner.tsx          # Banner de estado (disponible/error/warning)
│   │   └── PermissionButton.tsx     # Botón de acción (conectar/actualizar)
│   └── theme/
│       ├── colors.ts                # Paleta (screenBackground, surface, textPrimary, etc.)
│       └── spacing.ts               # Spacing, fontSize (title, metricLabel, metricValue)
├── android/
│   ├── build.gradle                 # Root: AGP 8.13.2, Kotlin 1.9.24, RN gradle plugin
│   ├── settings.gradle              # RN settings + autolinking
│   ├── gradle.properties            # newArchEnabled=true, hermesEnabled=true
│   ├── gradlew / gradlew.bat        # Gradle wrapper (9.3.1)
│   ├── local.properties             # SDK path (Windows)
│   └── app/
│       ├── build.gradle             # applicationId, HC SDK deps, signing
│       └── src/main/
│           ├── AndroidManifest.xml  # 12 permisos HC + RN config + intent filters
│           └── java/com/vito/healthconnect/
│               ├── MainActivity.kt          # ReactActivity (RN entry)
│               ├── MainApplication.kt       # ReactApplication + VitoHealthPackage
│               └── nativeModule/
│                   ├── VitoHealthModule.kt  # 4 @ReactMethod (bridge RN ↔ HC)
│                   ├── VitoHealthPackage.kt # ReactPackage registration
│                   ├── HealthDataProvider.kt # Lógica HC pura (sin dep RN)
│                   └── HealthSummary.kt     # Data class Kotlin ↔ Map bridge
├── .gitignore
├── README.md
└── .cortex/
    └── vault/
        ├── hu/                          # 38 HUs del backlog (ver Planificación)
        │   ├── INDICE-EPICAS.md         # HUs organizadas por épica
        │   └── SPRINTS.md              # HUs organizadas por sprint con fechas
        ├── specs/                       # Especificaciones técnicas de cada fase
        ├── designs/                     # Decisiones de arquitectura (ADRs)
        └── sessions/                    # Notas de sesiones de trabajo
```

## Prerrequisitos

### Windows

| Herramienta | Versión | Instalación |
|------------|---------|-------------|
| Node.js | ≥ 22.11.0 | [nodejs.org](https://nodejs.org) |
| Java JDK | 17 (LTS) | `winget install EclipseAdoptium.Temurin.17.JDK` |
| Android Studio | Hedgehog+ | [developer.android.com/studio](https://developer.android.com/studio) |
| Android SDK | API 35 (Android 15) | SDK Manager en Android Studio |
| Gradle | 9.3.1 (wrapper) | automático via `gradlew` |
| Google Health Connect | cualquier versión | [Play Store](https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata) |
| Dispositivo físico o emulador | Android 14+ | AVD Manager o USB |

### Variables de entorno (Windows)

```
JAVA_HOME = C:\Program Files\Java\jdk-17
ANDROID_HOME = %LOCALAPPDATA%\Android\Sdk
PATH += %ANDROID_HOME%\platform-tools
PATH += %ANDROID_HOME%\emulator
```

> **Nota WSL2:** Si trabajás desde WSL, el `gradlew` ya tiene soporte para detectar Windows JDK (`java.exe`) y convertir paths con `wslpath -w`. Sin embargo, es más simple ejecutar `npx react-native run-android` desde **PowerShell/cmd de Windows** directamente.

## Setup Inicial

```powershell
# 1. Clonar el repo (si no lo tenés)
git clone <repo-url>
cd vito-app-android

# 2. Instalar dependencias
npm install

# 3. Verificar que el SDK de Android está configurado
#    El archivo android/local.properties debe apuntar a tu SDK:
#    sdk.dir=C:\\Users\\<tu-user>\\AppData\\Local\\Android\\Sdk

# 4. Conectar un dispositivo físico (recomendado) o iniciar un emulador
#    - Físico: USB + depuración USB activada (Ajustes → Opciones de desarrollador)
#    - Emulador: Android Studio → Device Manager → Play
adb devices
#    Deberías ver: <id> device

# 5. (Opcional) Si ya tenés la app nativa instalada, la RN se convive
#    porque usa applicationId diferente: com.vito.healthconnect.rn
```

## Conectar el teléfono para probar la app

Podés conectar tu dispositivo Android por **USB** o por **WiFi** (ADB inalámbrico).

### USB (recomendado para primera vez)

1. Activá **Opciones de desarrollador** en el teléfono:
   Ajustes → Acerca del teléfono → tocar **Número de compilación** 7 veces
2. Activá **Depuración USB**: Ajustes → Sistema → Opciones de desarrollador → Depuración USB
3. Conectá el teléfono por USB a la PC
4. Aceptá el mensaje "Permitir depuración USB" en el teléfono
5. Verificá la conexión:
   ```powershell
   adb devices
   # Deberías ver: <id> device
   ```

### WiFi (ADB inalámbrico — Android 11+)

1. En el teléfono, activá **Opciones de desarrollador** y **Depuración USB** (igual que en USB)
2. Activá **Depuración inalámbrica**: Ajustes → Sistema → Opciones de desarrollador → Depuración inalámbrica
3. Tocá **Vincular dispositivo con código de pareamiento** → anotá la IP, puerto y código de 6 dígitos
4. En la PC, vinculate con el código:
   ```powershell
   adb pair <IP>:<PUERTO_PAREO>
   # Ingresá el código de 6 dígitos cuando lo pida
   ```
5. Una vez vinculado, conectate al puerto de servicio que muestra el teléfono:
   ```powershell
   adb connect <IP>:<PUERTO_SERVICIO>
   ```
6. Verificá la conexión:
   ```powershell
   adb devices
   ```
7. Si la conexión se pierde (p. ej. al suspender el teléfono), repetí el `adb connect`.

> **Nota WSL2:** Si usás WSL, `adb.exe` está en Windows. Usá la ruta completa:
> `/mnt/c/Users/<tu-user>/AppData/Local/Android/Sdk/platform-tools/adb.exe`
> o agregala al PATH de WSL:
> ```bash
> export PATH="$PATH:/mnt/c/Users/<tu-user>/AppData/Local/Android/Sdk/platform-tools"
> ```

## Cómo ejecutar la app

```powershell
# Arrancar Metro Bundler (en una terminal)
npx react-native start

# En otra terminal, compilar e instalar
npx react-native run-android
```

Si Metro ya está corriendo y solo querés rebuild + install:

```powershell
cd android
./gradlew assembleDebug
cd ..
# Instalar el APK generado:
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Probar Health Connect

1. Abrí la app **Vito Health Connect** en tu dispositivo
2. La app verifica automáticamente si Health Connect está disponible
3. Presioná **"Conectar Health Connect"** para solicitar permisos
4. En la pantalla de permisos de Health Connect, activá los 6 tipos de datos
5. Una vez concedidos, la app cargará automáticamente los datos del día

### Qué métricas se leen

| Métrica | Fuente (Health Connect) | Unidad |
|---------|------------------------|--------|
| Pasos | `StepsRecord.COUNT_TOTAL` | número |
| Distancia | `DistanceRecord.DISTANCE_TOTAL` | metros → km |
| Calorías | `TotalCaloriesBurnedRecord.ENERGY_TOTAL` | kcal |
| Sueño | `SleepSessionRecord` | minutos → Xh Ym |
| Pulso medio | `HeartRateRecord.samples` | bpm |
| Ejercicios | `ExerciseSessionRecord` | cantidad de sesiones |

## Magnitudes canónicas de signos vitales

| Signo vital | Unidad canónica |
|-------------|-----------------|
| Frecuencia cardíaca | lpm |
| Presión arterial sistólica | mmHg |
| Presión arterial diastólica | mmHg |
| Saturación de oxígeno | % |
| Temperatura corporal | °C |

Todos los `recorded_at` de `datos_reloj` se almacenan en UTC usando `TIMESTAMPTZ` y `toISOString()`.

## Resolución de problemas

### Error: `JAVA_HOME is set to an invalid directory`

```powershell
# Verificar versión instalada
dir "C:\Program Files\Java\"

# Fijar JAVA_HOME al JDK 17
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-17", "Machine")
# Cerrar y reabrir la terminal
```

### Error: `adb" no se reconoce como un comando`

```powershell
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
# Para hacerlo permanente (admin):
[System.Environment]::SetEnvironmentVariable("Path", "$env:Path;$env:LOCALAPPDATA\Android\Sdk\platform-tools", "Machine")
```

### Error: `INSTALL_FAILED_UPDATE_INCOMPATIBLE`

La app original de Vito (`com.vito.healthconnect`) está instalada con otra firma. La versión RN usa `com.vito.healthconnect.rn` justamente para evitar este conflicto. Si ves este error, verificá que el `applicationId` en `android/app/build.gradle` sea `com.vito.healthconnect.rn`.

### Error: `SDK location not found`

Asegurate que `android/local.properties` exista con:

```properties
sdk.dir=C:\\Users\\<TU_USER>\\AppData\\Local\\Android\\Sdk
```

### Error: Metro `EADDRINUSE: address already in use :::8081`

Ya hay una instancia de Metro corriendo. Usá esa misma o cerrá el proceso anterior:

```powershell
# Encontrar el proceso en el puerto 8081
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

### Error de compilación: `cannot find symbol BuildConfig`

El autolinking de RN genera código que referencia `com.vito.healthconnect.BuildConfig`. Si el `namespace` se cambió, el BuildConfig se genera en el nuevo namespace. Mantené `namespace "com.vito.healthconnect"` y solo cambiá `applicationId` si necesitás otro identificador.

## Convenciones de desarrollo

### TypeScript

- **strict mode** habilitado en `tsconfig.json`
- Path alias `@/` → `src/`
- Tipos compartidos en `src/types/`
- Props de componentes tipadas con interfaces

### Estructura de componentes

- Cada componente en su propio archivo `.tsx`
- Estilos co-locados con `StyleSheet.create()` al final del archivo
- Sin CSS modules, sin styled-components — solo `StyleSheet`

### Módulos nativos

- Todo el código Kotlin de Health Connect está en `nativeModule/`
- `HealthDataProvider.kt` **no depende de React Native** — es Kotlin/Android puro, reutilizable
- `VitoHealthModule.kt` es solo el bridge: recibe llamadas de RN, delega en `HealthDataProvider`
- Para agregar un nuevo módulo nativo (ej: Wear OS), crear `WearModule.kt` + `WearPackage.kt` y registrarlo en `MainApplication.kt`

### Commits

Seguí el estilo de commits existente en el repo. Preferí mensajes en español o inglés consistentes con el historial.

## Roadmap

- [x] Migración a React Native 0.85.3 + TypeScript 5.8
- [x] Native module para Health Connect (4 métodos bridge)
- [x] Dashboard con 6 métricas biométricas
- [x] Build Groovy DSL funcional (Gradle 9.3.1, AGP 8.13.2)
- [ ] Migrar Supabase de Kotlin a `@supabase/supabase-js`
- [ ] Wear OS native module
- [ ] Autenticación y login
- [ ] Pantallas de perfil y configuración

## Planificación

### Backlog de producto

Las 38 historias de usuario (HUs) del producto están documentadas en `.cortex/vault/hu/` como archivos markdown individuales. Cada HU incluye: release, sprint, épica, desarrolladores asignados, criterios de aceptación, tareas y Definition of Done.

Para consultar:

- **Por épica** → [`.cortex/vault/hu/INDICE-EPICAS.md`](.cortex/vault/hu/INDICE-EPICAS.md)
- **Por sprint** → [`.cortex/vault/hu/SPRINTS.md`](.cortex/vault/hu/SPRINTS.md)

### Releases

| Release | Épicas | HUs | Sprints |
|---------|--------|-----|---------|
| **R1** (may-jun) | Épica 1 (Gestión de Usuarios) + Épica 2 (Registro de Datos) | HU-11 a HU-26 | S1-S4 |
| **R2** (jun-ago) | Épica 3 (Monitoreo) + Épica 4 (Alertas) + Épica 5 (Notif. push) | HU-31 a HU-51 | S5-S11 |
| **R3** (ago) | Épica 5 (Notif. WhatsApp) + Épica 8 (Perfil Clínico) + Épica 1 (Contactos) | HU-16,52,54,81,82 | S12-S14 |
| **R4** (sep) | Épica 6 (IA) + Épica 3 (Reportes/Sugerencias) + Épica 1 (Google/Pass) | HU-12,13,33,34,61-64 | S15-S18 |
| **R5** (sep-nov) | Épica 4 (Alertas avanzadas) + Épica 6 (Check-in/Voz) + Épica 7 (IA Predictiva) | HU-35,44,45,53,65,66,71,72 | S19-S24 |

### Timeline completo (S1→S24)

```
S1  (26 may - 2 jun)   QA+Analisis      → Setup técnico + HU-11,14,15,21,24
S2  (3 jun - 9 jun)    Desarrollo       → HU-11, HU-14
S3  (10 jun - 16 jun)  Desarrollo       → HU-15, HU-21, HU-24
S4  (17 jun - 23 jun)  QA+Estabilizacion → HU-22, HU-23, HU-25, HU-26
S5  (24 jun - 30 jun)  Desarrollo       → HU-31, HU-32, HU-36, HU-41, HU-42, HU-43
S6  (1 jul - 7 jul)    Desarrollo       → HU-31, HU-36
S7  (8 jul - 14 jul)   Desarrollo       → HU-32, HU-41
S8  (15 jul - 21 jul)  Desarrollo       → HU-42, HU-43
S9  (22 jul - 28 jul)  Desarrollo       → HU-37
S10 (29 jul - 4 ago)   Desarrollo       → HU-51
S11 (5 ago - 10 ago)   QA+Estabilizacion → HU-31,32,37,41,42,43,51
S12 (12 ago - 18 ago)  QA+Analisis      → HU-16, HU-52, HU-54, HU-81, HU-82
S13 (19 ago - 25 ago)  Desarrollo       → HU-16, HU-54
S14 (26 ago - 1 sep)   QA+Estabilizacion → HU-52, HU-81, HU-82
S15 (2 sep - 8 sep)    QA+Analisis      → HU-34, HU-61, HU-62, HU-63, HU-64
S16 (9 sep - 15 sep)   Desarrollo       → HU-61, HU-62
S17 (16 sep - 22 sep)  Desarrollo       → HU-34, HU-63
S18 (23 sep - 29 sep)  Desarrollo       → HU-12, HU-13, HU-33, HU-64
S19 (30 sep - 6 oct)   QA+Analisis      → HU-35,44,45,53,65,66,71,72
S20 (7 oct - 13 oct)   Desarrollo       → HU-35, HU-65, HU-66
S21 (14 oct - 20 oct)  Desarrollo       → HU-44, HU-71
S22 (21 oct - 27 oct)  Desarrollo       → HU-53
S23 (28 oct - 3 nov)   Desarrollo       → HU-72
S24 (4 nov - 10 nov)   QA+Estabilizacion → HU-45
```

### Equipo y asignaciones

| Desarrollador | HUs asignadas |
|--------------|---------------|
| **Flor Gonzalez** | 18 HUs: HU-11,14,15,21,22,24,31,36,37,54,62,63,65,66,81,12,33,34 |
| **Emma** | 22 HUs: HU-11,15,22,24,31,32,37,41,42,44,45,51,52,53,61,63,71,72,82,34,35,64 |
| **Cristian** | 13 HUs: HU-11,13,14,15,16,21,23,24,32,61,64,81,82 |
| **Flor Galarza** | 18 HUs: HU-13,14,15,21,23,41,42,43,44,45,53,54,62,64,65,66,71,72 |
| **Nico** | 7 HUs: HU-16,24,25,26,33,43,81 |

## Recursos

- [React Native 0.85 docs](https://reactnative.dev/docs/0.85/getting-started)
- [Health Connect SDK](https://developer.android.com/health-connect)
- [Health Connect permissions](https://developer.android.com/health-connect/design/health-connect-permissions)
- [Native Modules (New Arch)](https://reactnative.dev/docs/the-new-architecture/pillars-turbomodules)
