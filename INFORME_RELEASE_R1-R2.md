# 📊 Informe de Presentación de Release — Proyecto Final

---

## 1️⃣ Portada

| | |
|---|---|
| **Nombre del proyecto** | VITO Health Connect |
| **Identificación de la release** | **R1 — Fundación Técnica** (Completada) |
| | **R2 — Monitoreo y Alertas Tempranas** (En curso — Sprint 5) |
| **Equipo** | Flor González, Emma, Cristian Vera, Flor Galarza, Nicolás |
| **Fecha de presentación** | 28 de junio de 2026 |
| **Repositorio** | `vito-app-android` (React Native 0.85.3 + TypeScript + Kotlin) |

---

## 2️⃣ Planificación de la Release

### Objetivo y alcance

**R1 — Fundación Técnica (mayo — junio)**
Establecer la infraestructura base del proyecto: inicialización de React Native con módulos nativos para Health Connect, autenticación de usuarios, registro de perfil personal y baseline clínico, integración con dispositivos wearables y sincronización de datos de salud.

**R2 — Monitoreo y Alertas Tempranas (junio — agosto)**
Construir el dashboard principal de monitoreo de signos vitales, menú de navegación, reportes diarios/semanales/mensuales, sistema de alertas inteligentes (hipoxia, frecuencia cardíaca, presión arterial) y notificaciones push.

### Sprints que la componen

| Sprint | Nombre | Duración | Tipo |
|--------|--------|----------|------|
| S1 | Fundación Técnica | 26 may — 2 jun | QA + Análisis + Setup |
| S2 | Login y Registro | 3 jun — 9 jun | Desarrollo |
| S3 | Perfil y Baseline | 10 jun — 16 jun | Desarrollo |
| S4 | Calidad de Datos | 17 jun — 23 jun | QA + Estabilización |
| S5 | Dashboard y Navegación | 24 jun — 30 jun | Desarrollo (en curso) |
| S6 | Dashboard + Check-in Emocional | 1 jul — 7 jul | Desarrollo |
| S7 | Reportes + Respuestas Sugeridas | 8 jul — 14 jul | Desarrollo |
| S8 | Alertas Cardíacas | 15 jul — 21 jul | Desarrollo |
| S9 | Alertas + Recomendaciones | 22 jul — 28 jul | Desarrollo |
| S10 | Push + Vittito Chat | 29 jul — 4 ago | Desarrollo |
| S11 | Estabilización R2 | 5 ago — 10 ago | QA + Estabilización |

### Duración y fechas clave

| Hito | Fecha |
|------|-------|
| Inicio del proyecto | 26 de mayo de 2026 |
| Fin estimado R1 | 23 de junio de 2026 ✅ |
| Inicio R2 | 24 de junio de 2026 |
| Fin estimado R2 | 10 de agosto de 2026 |
| Entrega final (R5) | 10 de noviembre de 2026 |

### Definición de Terminado (DoD) general

- [ ] Código compila sin errores (`npx react-native run-android`)
- [ ] Pruebas unitarias pasan (`npm test`)
- [ ] Criterios de aceptación de la HU verificados
- [ ] Código revisado por al menos un compañero del equipo
- [ ] Integración con Supabase/Health Connect funcional
- [ ] Commits con mensajes descriptivos siguiendo la convención del equipo

---

## 🔁 Sprint 1 — Fundación Técnica

### 3️⃣ Sprint 1 — Historias de Usuario

| HU | Título | Prioridad |
|----|--------|-----------|
| Setup | Inicialización RN + HC native module + build | 🔴 Alta |
| HU-14 | Registro básico de cuenta | 🔴 Alta |
| HU-11 | Inicio de sesión (mail) | 🔴 Alta |
| HU-15 | Configuración de perfil personal | 🔴 Alta |
| HU-21 | Registro de baseline clínico inicial | 🟡 Media |
| HU-24 | Integración con dispositivos wearables | 🔴 Alta |

#### Criterios de aceptación destacados

**Setup:**
- Proyecto React Native 0.85.3 con TypeScript inicializado
- Módulo nativo `VitoHealthModule.kt` creado y funcional
- Bridge TypeScript `VitoHealthNative.ts` comunicándose con Kotlin
- Build exitoso en Android (`compileSdk 35`, `targetSdk 35`)

**HU-14 (Registro de cuenta):**
- CA-01: Formulario con nombre, email y contraseña
- CA-02: Validación de campos obligatorios
- CA-03: Prevención de emails duplicados

**HU-11 (Inicio de sesión):**
- CA-01: Login con email y contraseña
- CA-02: Validación de credenciales incorrectas
- CA-03: Redirección al dashboard tras login exitoso

### 4️⃣ Sprint 1 — Estimación

| Técnica utilizada | Planning Poker |
|---|---|
| **Capacidad del equipo** | 5 desarrolladores × 5 días = 25 días-hombre |

| Historia | Puntos de historia | Dev(s) asignados |
|----------|-------------------|------------------|
| Setup RN + HC | 8 | Todo el equipo |
| HU-14 (Registro) | 5 | Flor G., Cristian, Flor Ga. |
| HU-11 (Login) | 5 | Flor G., Emma, Cristian |
| HU-15 (Perfil) | 5 | Flor G., Cristian, Emma, Flor Ga. |
| HU-21 (Baseline) | 5 | Flor G., Cristian, Flor Ga. |
| HU-24 (Wearables) | 8 | Flor G., Emma, Cristian, Nico |
| **Total** | **36 puntos** | |

### 5️⃣ Sprint 1 — Artefactos Generados 🛠️

**Sprint Backlog:**
- Tareas de inicialización del proyecto React Native con Expo
- Configuración de módulos nativos Kotlin para Health Connect
- Configuración de Supabase (autenticación, base de datos)
- Creación de estructura de directorios (`src/screens`, `src/components`, `src/services`, etc.)

**Tablero Scrum/Kanban:**
- Gestión mediante GitHub Projects / ramas `dev`, `dev-pruebas`, `feature/*`

**Artefactos de arquitectura:**
- [`arquitectura.md`](./arquitectura.md) — Documento de arquitectura general del sistema
- [`README.md`](./README.md) — Documentación del proyecto con diagrama de arquitectura híbrida
- Archivos de configuración: `package.json`, `tsconfig.json`, `babel.config.js`, `metro.config.js`, `eas.json`
- APK de desarrollo generado vía GitHub Actions (`VitoHealth-Release.apk`)

**Código base creado:**
- Módulo nativo `android/app/src/main/java/.../VitoHealthModule.kt`
- Provider `android/app/src/main/java/.../HealthDataProvider.kt`
- Bridge TypeScript `src/services/VitoHealthNative.ts`
- Contextos: `src/context/HealthProvider.tsx`, `src/context/SupabaseProvider.tsx`
- Servicios Supabase: `src/services/supabase/`

### 6️⃣ Sprint 1 — Sprint Review

**Funcionalidades completadas:**
- ✅ Proyecto React Native 0.85.3 con TypeScript operativo
- ✅ Módulo nativo Health Connect (Kotlin) con lectura de 6 tipos de datos biométricos
- ✅ Bridge TypeScript funcional (`checkAvailability`, `requestPermissions`, `getHealthData`, `openHealthConnectStore`)
- ✅ Base de datos Supabase configurada (autenticación + PostgreSQL)
- ✅ Pantallas base de Login y Registro
- ✅ Configuración de CI/CD con GitHub Actions (build Android Dev Client)
- ✅ Integración con Expo Dev Client para desarrollo en vivo

**Feedback de stakeholders:**
- Se decidió migrar a Expo Dev Client para facilitar el desarrollo sin compilar localmente
- Se priorizó Health Connect como fuente principal de datos biométricos
- Se optó por Supabase como BaaS por su integración con React Native

**Historias no completadas y motivos:**
- HU-21 (Baseline clínico): Pasó a S3 por dependencia con perfil de usuario
- HU-15 (Perfil completo): Pasó a S3, se implementó versión básica

### 7️⃣ Sprint 1 — Sprint Retrospective

**Qué funcionó bien:**
- ✅ Configuración inicial rápida del proyecto gracias a la experiencia con React Native
- ✅ Integración temprana de Health Connect para validar la viabilidad técnica
- ✅ Documentación clara de la arquitectura y stack tecnológico
- ✅ CI/CD configurado desde el inicio permitiendo builds automatizados

**Qué mejorar:**
- ⚠️ Mejor estimación de tareas de setup (el módulo nativo tomó más tiempo del previsto)
- ⚠️ Coordinación entre miembros para evitar conflictos de merge
- ⚠️ Sincronización entre ramas `dev` y `dev-pruebas`

**Acciones de mejora:**
- Establecer daily standups de 15 minutos
- Definir convención de commits clara
- Crear ramas `feature/*` por HU en lugar de trabajar todos sobre la misma rama

---

## 🔁 Sprint 2 — Login y Registro

### 3️⃣ Sprint 2 — Historias de Usuario

| HU | Título | Prioridad |
|----|--------|-----------|
| HU-11 | Inicio de sesión (mail) | 🔴 Alta |
| HU-14 | Registro básico de cuenta | 🔴 Alta |

#### Criterios de aceptación

**HU-11 (Inicio de sesión):**
- CA-01: El usuario puede ingresar email y contraseña
- CA-02: El sistema valida credenciales incorrectas con mensaje de error
- CA-03: El sistema redirige al dashboard luego del login exitoso
- CA-04: La contraseña debe ocultarse visualmente

**HU-14 (Registro):**
- CA-01: El usuario puede registrar nombre, email y contraseña
- CA-02: El sistema valida campos obligatorios
- CA-03: El sistema evita emails duplicados

### 4️⃣ Sprint 2 — Estimación

| Técnica utilizada | Planning Poker |
|---|---|
| **Capacidad del equipo** | 5 desarrolladores × 5 días = 25 días-hombre |

| Historia | Puntos | Dev(s) |
|----------|--------|--------|
| HU-11 (Login) | 5 | Flor G., Emma, Cristian |
| HU-14 (Registro) | 5 | Flor G., Cristian, Flor Ga. |
| **Total** | **10 puntos** | |

### 5️⃣ Sprint 2 — Artefactos Generados 🛠️

**Código desarrollado:**
- [`src/screens/LoginScreen.tsx`](./src/screens/LoginScreen.tsx) — Pantalla de inicio de sesión con email/contraseña
- [`src/screens/RegisterScreen.tsx`](./src/screens/RegisterScreen.tsx) — Pantalla de registro de cuenta
- Integración con Supabase Auth (`signInWithPassword`, `signUp`)
- Manejo de sesión persistente con `@react-native-async-storage/async-storage`
- [`App.tsx`](./App.tsx) — Punto de entrada con `SupabaseProvider` y `NavigationContainer`

**Arquitectura de navegación:**
- [`src/navigation/RootNavigator.tsx`](./src/navigation/RootNavigator.tsx) — Navegador raíz condicional (Login/Register vs Dashboard según sesión)

**📸 Vistas del sistema:**
- LoginScreen: formulario con campos de email (o nombre de usuario) y contraseña, botón "Iniciar sesión"
- RegisterScreen: formulario con nombre, email, contraseña y confirmación

### 6️⃣ Sprint 2 — Sprint Review

**Funcionalidades completadas:**
- ✅ Login con email y contraseña funcional contra Supabase Auth
- ✅ Registro de nueva cuenta con validación de campos
- ✅ Sesión persistente (al cerrar y reabrir la app, la sesión se mantiene)
- ✅ Redirección condicional: Login/Register si no hay sesión, Dashboard si hay sesión activa
- ✅ Manejo de errores: credenciales inválidas, email duplicado, campos vacíos

**Feedback de stakeholders:**
- Se solicitó agregar registro de perfil completo post-registro (HU-15 → CompleteProfileScreen)
- Se identificó la necesidad de un flujo de recuperación de contraseña (HU-13, planificado para R4)

**Historias no completadas y motivos:**
- Ninguna — ambas HUs se completaron en tiempo y forma

### 7️⃣ Sprint 2 — Sprint Retrospective

**Qué funcionó bien:**
- ✅ Integración fluida con Supabase Auth
- ✅ Sesión persistente funcionando correctamente
- ✅ UI responsiva en dispositivos móviles Android

**Qué mejorar:**
- ⚠️ Los tests TDD no se escribieron antes del código (contra la guía TDD establecida)
- ⚠️ La navegación condicional requirió varios parches (commits `6d03dcc`, `6d592a1`, `aab43a4`)

**Acciones de mejora:**
- Escribir tests primero en S3 siguiendo estrictamente TDD
- Mejorar el diseño del flujo de navegación condicional

---

## 🔁 Sprint 3 — Perfil y Baseline

### 3️⃣ Sprint 3 — Historias de Usuario

| HU | Título | Prioridad |
|----|--------|-----------|
| HU-15 | Configuración de perfil personal | 🔴 Alta |
| HU-21 | Registro de baseline clínico inicial | 🟡 Media |
| HU-24 | Integración con dispositivos wearables | 🔴 Alta |
| HU-22 | Registro manual de signos vitales | 🟡 Media |
| HU-23 | Registro de síntomas | 🟢 Baja |
| HU-25 | Sincronización de datos de salud | 🔴 Alta |
| HU-26 | Validación / normalización de datos | 🟡 Media |

#### Criterios de aceptación destacados

**HU-15 (Perfil personal):**
- CA-01: Registrar nombre, apellido, DNI, fecha de nacimiento, sexo biológico, género, nacionalidad
- CA-02: Cálculo automático de edad desde fecha de nacimiento

**HU-24 (Wearables):**
- CA-01: Conexión con dispositivos compatibles desde la app
- CA-02: Recepción automática de datos biométricos
- CA-03: Cada dato almacena su origen (dispositivo o manual)

**HU-25 (Sincronización):**
- CA-01: Sincronización automática por intervalos
- CA-02: Detección de conflictos entre fuentes de datos
- CA-03: Priorización de datos de wearable sobre manual

### 4️⃣ Sprint 3 — Estimación

| Técnica utilizada | Planning Poker |
|---|---|
| **Capacidad del equipo** | 5 desarrolladores × 5 días = 25 días-hombre |

| Historia | Puntos | Dev(s) |
|----------|--------|--------|
| HU-15 (Perfil) | 5 | Flor G., Cristian, Emma, Flor Ga. |
| HU-21 (Baseline) | 5 | Flor G., Cristian, Flor Ga. |
| HU-24 (Wearables) | 8 | Flor G., Emma, Cristian, Nico |
| HU-22 (Signos manuales) | 3 | Flor G., Emma |
| HU-23 (Síntomas) | 3 | Cristian, Flor Ga. |
| HU-25 (Sincronización) | 5 | Nico |
| HU-26 (Validación) | 5 | Nico |
| **Total** | **34 puntos** | |

### 5️⃣ Sprint 3 — Artefactos Generados 🛠️

**Código desarrollado:**
- [`src/screens/CompleteProfileScreen.tsx`](./src/screens/CompleteProfileScreen.tsx) — Registro de perfil completo post-registro
- [`src/screens/PerfilScreen.tsx`](./src/screens/PerfilScreen.tsx) — Visualización de perfil
- [`src/screens/EditarPerfilScreen.tsx`](./src/screens/EditarPerfilScreen.tsx) — Edición de perfil
- [`src/screens/HistorialScreen.tsx`](./src/screens/HistorialScreen.tsx) — Historial de signos vitales
- Health Connect extendido: lectura de `BloodPressureRecord`, `OxygenSaturationRecord`, `BodyTemperatureRecord`
- Auto-refresh cada 30 segundos en `HealthProvider.tsx`
- Botón manual de recarga (↻) en dashboard

**Arquitectura y diseño:**
- [`vault/designs/2026-05-31_migracion-rn-health-connect.md`](.cortex/vault/designs/2026-05-31_migracion-rn-health-connect.md) — Diseño de migración RN + Health Connect
- [`vault/decisions/DEC-2026-06-05-custom-svg-chart-con-panresponder-vs-libreria-externa-de-graficos.md`](.cortex/vault/decisions/DEC-2026-06-05-custom-svg-chart-con-panresponder-vs-libreria-externa-de-graficos.md) — Decisión sobre gráficos custom vs librería externa
- [`vault/decisions/DEC-2026-06-05-rootnavigator-wrapper-vs-inline-stack-en-bottomtabnavigator.md`](.cortex/vault/decisions/DEC-2026-06-05-rootnavigator-wrapper-vs-inline-stack-en-bottomtabnavigator.md) — Decisión de navegación

**ML y Ciencia de Datos:**
- Configuración del pipeline de Machine Learning en `ml-trainer/`
- Dataset `heart_attack_prediction_dataset.csv` para HU-91
- Schema de base de datos orientado a ML

**📸 Vistas del sistema:**
- PerfilScreen: muestra datos personales del usuario
- EditarPerfilScreen: formulario editable con campos de perfil
- CompleteProfileScreen: pantalla de finalización de registro
- Botón de refresh ↻ en el dashboard

### 6️⃣ Sprint 3 — Sprint Review

**Funcionalidades completadas:**
- ✅ Perfil de usuario completo con cálculo automático de edad
- ✅ Edición de perfil (datos personales, altura, peso)
- ✅ Health Connect extendido: lectura de presión arterial, SpO₂, temperatura corporal
- ✅ Sincronización automática cada 30 segundos con datos del wearable
- ✅ Botón de recarga manual en dashboard
- ✅ Navegación entre pantallas de perfil, historial y dashboard
- ✅ Pipeline ML inicializado con dataset cardiovascular

**Feedback de stakeholders:**
- Se destacó la importancia de no bloquear la app si el perfil está incompleto (se implementó banner opcional)
- Se identificaron problemas con `@supabase/supabase-js` que requirieron bypass con `raw fetch`
- El equipo de ML comenzó a trabajar en paralelo con la estructura de datos

**Historias no completadas y motivos:**
- HU-23 (Registro de síntomas): Pasa a S4 por baja prioridad
- HU-26 (Validación/normalización): Pasa a S4, dependía de HU-25

### 7️⃣ Sprint 3 — Sprint Retrospective

**Qué funcionó bien:**
- ✅ Avance significativo en la integración con Health Connect (10 tipos de datos biomédicos)
- ✅ Feature de perfil completa con edición y persistencia
- ✅ Trabajo paralelo del equipo de ML

**Qué mejorar:**
- ⚠️ Problemas de sesión con Supabase (timeout race condition en `CompleteProfileScreen`)
- ⚠️ Conflictos de merge entre ramas `dev` y `dev-pruebas`
- ⚠️ Bug con `@supabase/supabase-js` requirió workaround con `raw fetch`

**Acciones de mejora:**
- Implementar reintentos automáticos para llamadas a Supabase
- Mejorar estrategia de merge: `dev-pruebas` → `dev` con PR y revisión
- Agregar polyfill para `@supabase/supabase-js` en React Native

---

## 🔁 Sprint 4 — Calidad de Datos

### 3️⃣ Sprint 4 — Historias de Usuario

| HU | Título | Prioridad |
|----|--------|-----------|
| HU-22 | Registro manual de signos vitales | 🟡 Media |
| HU-23 | Registro de síntomas | 🟢 Baja |
| HU-25 | Sincronización de datos de salud | 🔴 Alta |
| HU-26 | Validación / normalización de datos | 🟡 Media |

### 4️⃣ Sprint 4 — Estimación

| Historia | Puntos | Dev(s) |
|----------|--------|--------|
| HU-22 (Signos manuales) | 3 | Flor G., Emma |
| HU-23 (Síntomas) | 3 | Cristian, Flor Ga. |
| HU-25 (Sincronización) | 5 | Nico |
| HU-26 (Validación) | 5 | Nico |
| **Total** | **16 puntos** | |

### 5️⃣ Sprint 4 — Artefactos Generados 🛠️

**Código desarrollado:**
- Estabilización de la navegación: arreglo de `initialRouteName` condicional
- Fix de orden de pantallas en Stack Navigator
- Caché local de Health Connect cuando `datos_reloj` está vacío
- Mejoras en la sincronización de datos
- Fix de sesión persistente con reintentos automáticos
- CI/CD mejorado: build release APK standalone (sin necesidad de Metro/PC)
- Bypass de `@supabase/supabase-js` con `raw fetch`

**Infraestructura:**
- Workflow de GitHub Actions: `.github/workflows/build-android-dev.yml`
  - Build APK de desarrollo con Expo Dev Client
  - Build APK de release standalone
  - Actualización a `gradle/actions/setup-gradle` v4

**📸 Vistas del sistema:**
- Pantalla de Historial con datos de Health Connect
- Indicadores de última sincronización

### 6️⃣ Sprint 4 — Sprint Review

**Funcionalidades completadas:**
- ✅ Estabilización de la navegación completa (se corrigieron múltiples bugs)
- ✅ Caché local de Health Connect para cuando no hay datos del reloj
- ✅ Sesión persistente con reintentos automáticos
- ✅ CI/CD robusto con build de APK standalone
- ✅ Bypass funcional para problemas de `@supabase/supabase-js` en React Native

**Feedback de stakeholders:**
- El APK standalone permite a cualquier miembro del equipo instalar la app sin necesidad de entorno de desarrollo
- El bypass de Supabase fue necesario para desbloquear el avance del equipo

**Historias no completadas y motivos:**
- HU-26 (Validación/normalización): Pendiente por dependencias técnicas. Se priorizó la estabilización de la navegación

### 7️⃣ Sprint 4 — Sprint Retrospective

**Qué funcionó bien:**
- ✅ Gran avance en estabilidad de la aplicación
- ✅ CI/CD completamente operativo
- ✅ Mejora significativa en la experiencia de navegación

**Qué mejorar:**
- ⚠️ Deuda técnica acumulada por no haber escrito tests (0% cobertura)
- ⚠️ Múltiples fixes de navegación indican falta de diseño inicial robusto

**Acciones de mejora:**
- Dedicar tiempo en S5 para escribir tests unitarios de los módulos críticos
- Documentar las decisiones de navegación como ADR para futuras referencias
- Implementar code review obligatorio para cambios de navegación

---

## 🔁 Sprint 5 — Dashboard y Navegación (En curso)

### 3️⃣ Sprint 5 — Historias de Usuario

| HU | Título | Prioridad | Estado |
|----|--------|-----------|--------|
| HU-31 | Dashboard de signos vitales | 🔴 Alta | ✅ Avanzado |
| HU-36 | Menú de navegación principal | 🔴 Alta | ✅ Avanzado |
| HU-32 | Reportes diario/semanal/mensual | 🟡 Media | ✅ Avanzado |
| HU-41 | Alerta por hipoxia | 🟡 Media | 🟡 En desarrollo |
| HU-42 | Alerta por frecuencia cardíaca | 🟡 Media | 🟡 En desarrollo |
| HU-43 | Alerta por presión arterial | 🟡 Media | 🟡 En desarrollo |

#### Criterios de aceptación destacados

**HU-31 (Dashboard):**
- CA-01: 4 indicadores principales (frecuencia cardíaca, presión arterial, SpO₂, actividad)
- CA-02: Color de estado y etiqueta de tendencia por indicador
- CA-03: Círculo de progreso de actividad física
- CA-04: Actualización automática sin recargar pantalla
- CA-05: Mensaje "Sin datos recientes" cuando no hay datos

**HU-36 (Menú de navegación):**
- CA-01: Menú fijo en la parte inferior en todas las pantallas
- CA-02: 5 botones: Alertas, Reportes, Inicio, Vittito, Perfil
- CA-03: Botón activo resaltado
- CA-04: Badge de alertas sin leer
- CA-05: No se oculta al hacer scroll

### 4️⃣ Sprint 5 — Estimación

| Historia | Puntos | Dev(s) |
|----------|--------|--------|
| HU-31 (Dashboard) | 8 | Flor G., Emma |
| HU-36 (Menú) | 5 | Flor G. |
| HU-32 (Reportes) | 8 | Cristian, Emma |
| HU-41 (Alerta hipoxia) | 5 | Flor Ga., Emma |
| HU-42 (Alerta FC) | 5 | Flor Ga., Emma |
| HU-43 (Alerta PA) | 5 | Flor Ga., Nico |
| **Total** | **36 puntos** | |

### 5️⃣ Sprint 5 — Artefactos Generados 🛠️

**Código desarrollado a la fecha:**
- [`src/screens/InicioScreen.tsx`](./src/screens/InicioScreen.tsx) — Dashboard principal con indicadores vitales
- [`src/screens/DetalleSignoScreen.tsx`](./src/screens/DetalleSignoScreen.tsx) — Detalle de cada signo vital con gráficos
- [`src/screens/AlertasScreen.tsx`](./src/screens/AlertasScreen.tsx) — Pantalla de alertas
- [`src/screens/VITOScreen.tsx`](./src/screens/VITOScreen.tsx) — Asistente virtual Vittito
- [`src/navigation/BottomTabNavigator.tsx`](./src/navigation/BottomTabNavigator.tsx) — Menú inferior con 5 tabs
- [`src/components/HealthDashboard.tsx`](./src/components/HealthDashboard.tsx) — Dashboard de salud
- [`src/components/VitalSignCard.tsx`](./src/components/VitalSignCard.tsx) — Card de indicador vital
- [`src/components/MetricCard.tsx`](./src/components/MetricCard.tsx) — Card de métrica genérica
- [`src/components/LineChart.tsx`](./src/components/LineChart.tsx) — Gráfico de línea para reportes
- [`src/components/ResumenEstadistico.tsx`](./src/components/ResumenEstadistico.tsx) — Resumen de estadísticas
- [`src/components/StatusBanner.tsx`](./src/components/StatusBanner.tsx) — Banner de estado
- [`src/components/VITOMascot.tsx`](./src/components/VITOMascot.tsx) — Mascota del asistente
- [`src/components/PermissionButton.tsx`](./src/components/PermissionButton.tsx) — Botón de permisos HC
- [`src/components/Card.tsx`](./src/components/Card.tsx) — Componente Card base
- [`src/components/PrimaryButton.tsx`](./src/components/PrimaryButton.tsx) — Botón primario

**Artefactos de diseño:**
- [`vault/designs/2026-06-05_hu-32-visualizar-reportes-de-signos-vitales-diario-semanal-y-mensual.md`](.cortex/vault/designs/2026-06-05_hu-32-visualizar-reportes-de-signos-vitales-diario-semanal-y-mensual.md) — Diseño de reportes gráficos
- [`vault/handoffs/2026-06-05_hu-32-reportes-de-signos-vitales-diariosemanalmensual.md`](.cortex/vault/handoffs/2026-06-05_hu-32-reportes-de-signos-vitales-diariosemanalmensual.md) — Handoff de implementación

**📸 Vistas del sistema:**
- Dashboard principal (`InicioScreen`): 4 cards de signos vitales con colores semánticos
  - ❤️ Frecuencia cardíaca (rojo) con valor y tendencia
  - 🔴 Presión arterial (rojo/danger) con valor sistólica/diastólica
  - 💙 Oxígeno en sangre (azul) con porcentaje SpO₂
  - 🌡️ Temperatura corporal (rojo) con valor en °C
- Sección Health Connect: resumen del día con pasos, calorías, distancia, sueño y ejercicios
- Bottom navigation: 5 íconos (Alertas, Reportes, Inicio, Vittito, Perfil)
- DetalleSignoScreen: gráfico de línea con vistas diaria/semanal/mensual

### 6️⃣ Sprint 5 — Sprint Review (Parcial)

**Funcionalidades completadas a la fecha:**
- ✅ Dashboard funcional con datos de Health Connect en tiempo real
- ✅ 4 indicadores vitales con colores semánticos y etiquetas de tendencia
- ✅ Menú de navegación inferior con 5 botones y badge de alertas
- ✅ Pantalla de detalle de cada signo vital con gráfico
- ✅ Sección de resumen de Health Connect (pasos, calorías, distancia, sueño, ejercicio)
- ✅ Navegación completa entre todas las pantallas principales

**Pendiente (resto del Sprint 5):**
- ⬜ Implementar lógica completa de alertas (HU-41, HU-42, HU-43)
- ⬜ Reportes diario/semanal/mensual con gráficos funcionales
- ⬜ Escribir tests unitarios (TDD)

---

## 🎬 8. Demo de la Release

### Funcionalidades a demostrar (hasta R1 + S5)

1. **Registro y autenticación**
   - Crear cuenta nueva → Login → Dashboard
   - Persistencia de sesión (cerrar y reabrir la app)
   - Manejo de errores (credenciales inválidas, email duplicado)

2. **Perfil de usuario**
   - Visualizar y editar datos personales
   - Cálculo automático de edad
   - Registro de altura, peso y datos clínicos

3. **Health Connect — Integración con wearable**
   - Solicitud de permisos
   - Lectura automática de datos biométricos
   - Visualización en dashboard

4. **Dashboard de monitoreo**
   - 4 indicadores vitales en tiempo real
   - Colores semánticos según rangos
   - Actualización automática cada 30 segundos
   - Recarga manual

5. **Navegación**
   - Menú inferior fijo con 5 secciones
   - Navegación entre todas las pantallas
   - Badge de alertas

6. **CI/CD**
   - Build automático de APK via GitHub Actions
   - APK standalone instalable en cualquier dispositivo Android

### Flujo de la demo

```
1. Abrir la app → LoginScreen
2. Registrar nuevo usuario → Redirige al dashboard
3. Cerrar sesión y reabrir → Sesión persistente
4. Ver dashboard con 4 indicadores vitales ← Health Connect
5. Tocar cada indicador → Detalle con gráfico
6. Navegar: Perfil, Alertas, Vittito
7. Editar perfil → Guardar cambios
8. Mostrar Health Connect → Resumen del día (pasos, calorías, etc.)
```

### Resultados y conclusiones

**Métricas del proyecto:**

| Métrica | Valor |
|---------|-------|
| Total commits | 58+ |
| Líneas de código TypeScript | ~6,418 |
| Archivos TypeScript/TSX | 34 |
| Pantallas desarrolladas | 10 |
| Componentes UI reutilizables | 10 |
| Módulos nativos Kotlin | 6 archivos |
| Tipos de datos Health Connect | 10 (pasos, calorías, distancia, sueño, ejercicio, FC, PA, SpO₂, temperatura, ...) |
| Releases planificadas | 5 (R1-R5) |
| HUs planificadas | 38 |
| Sprints planificados | 24 |

**Estado actual del proyecto:**
- ✅ R1 (Fundación Técnica) completada exitosamente
- 🔄 R2 (Monitoreo y Alertas) en progreso — Sprint 5 actual
- ✅ Infraestructura: React Native + TypeScript + Health Connect + Supabase + GitHub Actions
- ✅ Autenticación: registro, login, sesión persistente
- ✅ Perfil: visualización, edición, datos clínicos
- ✅ Dashboard: 4 indicadores vitales con datos en tiempo real
- ✅ Navegación: menú inferior con 5 secciones
- ⬜ Tests: pendientes (0% cobertura actual)
- ⬜ Alertas: en desarrollo

---

## ➡️ 9. Planificación de la Próxima Release

### R3 — Red de Confianza y Voz (12 ago — 1 sep)

**Objetivos:**
- Implementar registro de contactos de confianza (familiares, médicos)
- Configurar notificaciones automáticas por WhatsApp a contactos
- Administrar permisos y preferencias de notificación
- Configurar funcionalidades según perfil de salud del usuario
- Advertir sobre configuraciones clínicamente peligrosas

**Historias candidatas:**

| HU | Título | Prioridad | Sprint |
|----|--------|-----------|--------|
| HU-16 | Registro de contactos de confianza | 🔴 Alta | S12 |
| HU-52 | Notificaciones automáticas por WhatsApp | 🔴 Alta | S12 |
| HU-54 | Administración de contactos y notificaciones | 🔴 Alta | S13 |
| HU-81 | Configurar según perfil de salud | 🟡 Media | S12 |
| HU-82 | Advertencia configuraciones peligrosas | 🟡 Media | S14 |
| HU-66 | Consultas por voz | 🟢 Baja | S13 |
| HU-34 | Sugerencias personalizadas de Vittito | 🟡 Media | S14 |

### R4 — Vittito y Reportes IA (2 sep — 29 sep)

**Objetivos:**
- Implementar chat con asistente IA Vittito desde el dashboard
- Generar reportes automáticos de salud con IA
- Exportar reportes en PDF
- Login con Google y recuperación de contraseña

### R5 — Salud Predictiva (30 sep — 10 nov)

**Objetivos:**
- Implementar modelo ML de predicción de eventos críticos
- Detección de patrones anormales en signos vitales
- Ajuste automático de umbrales según baseline individual
- Reducción de falsas alarmas mediante análisis multivariable
- Comunicación por micrófono con Vittito

### Fechas estimadas

| Release | Inicio | Fin |
|---------|--------|-----|
| R2 — Monitoreo y Alertas Tempranas | 24 jun 2026 | 10 ago 2026 |
| R3 — Red de Confianza y Voz | 12 ago 2026 | 1 sep 2026 |
| R4 — Vittito y Reportes IA | 2 sep 2026 | 29 sep 2026 |
| R5 — Salud Predictiva | 30 sep 2026 | 10 nov 2026 |

---

## Anexo: Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework principal | React Native | 0.85.3 |
| Lenguaje | TypeScript | 5.8.3 |
| UI Engine | React | 19.2.3 |
| JS Engine | Hermes | RN 0.85 |
| Navegación | React Navigation | v7 |
| Android SDK | compileSdk / targetSdk | 35 (API 35) |
| Módulos nativos | Kotlin | 1.9.24 |
| Build System | Gradle | 9.3.1 |
| Android Gradle Plugin | AGP | 8.13.2 |
| Health Connect SDK | `connect-client` | 1.1.0-alpha11 |
| Backend | Supabase (Auth + PostgreSQL) | 2.107.0 |
| ML Pipeline | Python / FastAPI | — |
| CI/CD | GitHub Actions + Expo Dev Client | — |

## Anexo: Equipo y asignaciones

| Desarrollador | Rol | HUs asignadas |
|--------------|-----|---------------|
| **Flor González** | Frontend + Coordinación | 18 HUs: HU-11,14,15,21,22,24,31,36,37,54,62,63,65,66,81,12,33,34 |
| **Emma** | Frontend + Alertas + ML | 22 HUs: HU-11,15,22,24,31,32,37,41,42,44,45,51,52,53,61,63,71,72,82,34,35,64 |
| **Cristian Vera** | Frontend + Autenticación | 13 HUs: HU-11,13,14,15,16,21,23,24,32,61,64,81,82 |
| **Flor Galarza** | Frontend + QA + ML | 18 HUs: HU-13,14,15,21,23,41,42,43,44,45,53,54,62,64,65,66,71,72 |
| **Nicolás** | Backend + Datos | 7 HUs: HU-16,24,25,26,33,43,81 |

---

*Documento generado el 28 de junio de 2026 — VITO Health Connect*
