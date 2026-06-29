# Informe de Presentación de Release — Proyecto Final

---

## 1️⃣ Portada

| | |
|---|---|
| **Nombre del proyecto** | VITO Health Connect |
| **Identificación de la release** | R1 — Fundación Técnica |
| **Equipo** | Flor González, Emma, Cristian Vera, Flor Galarza, Nicolás |
| **Fecha de presentación** | 28 de junio de 2026 |
| **Repositorio** | `vito-app-android` |
| **Período** | 26 de mayo — 23 de junio de 2026 |

---

## 2️⃣ Planificación de la Release

### Objetivo y alcance

Establecer la infraestructura base del proyecto: inicialización de React Native con módulos nativos para Health Connect, autenticación de usuarios, registro de perfil personal y baseline clínico, integración con dispositivos wearables y sincronización de datos de salud.

**Fuente:** `.cortex/vault/specs/2026-06-04_planificacion-tdd-sprints.md`

### Sprints que la componen

| Sprint | Nombre | Fechas | Tipo | Estado |
|--------|--------|--------|------|--------|
| S1 | Fundación Técnica | 26 may — 2 jun | QA + Análisis + Setup | Completado |
| S2 | Login y Registro | 3 jun — 9 jun | Desarrollo | Completado |
| S3 | Perfil y Baseline | 10 jun — 16 jun | Desarrollo | Completado |
| S4 | Calidad de Datos | 17 jun — 23 jun | QA + Estabilización | Completado |

### Duración y fechas clave

| Hito | Fecha |
|------|-------|
| Inicio del proyecto | 26 de mayo de 2026 |
| Primer commit del proyecto | 1 de abril de 2026 (pre-R1) |
| Fin de R1 | 23 de junio de 2026 |

### Releases del plan completo

| Release | Nombre | Sprints |
|---------|--------|---------|
| **R1** | Fundación Técnica | S1-S4 |
| **R2** | Monitoreo y Alertas Tempranas | S5-S11 |
| **R3** | Red de Confianza y Voz | S12-S14 |
| **R4** | Vittito y Reportes IA | S15-S18 |
| **R5** | Salud Predictiva | S19-S24 |

### Definición de Terminado (DoD)

_No se encontró un documento formal de DoD para esta release. La spec define criterios de aceptación específicos por cada HU y una definición de done individual por historia._

---

## 🔁 Sprint 1 — Fundación Técnica

### 3️⃣ Sprint 1 — Historias de Usuario

| ID | Título | Prioridad | Dev(s) asignados |
|----|--------|-----------|------------------|
| Setup | Inicialización RN + HC native module + build | _Sin dato_ | Todo el equipo |
| HU-14 | Registro básico de cuenta | _Sin dato_ | Flor G., Cristian, Flor Ga. |
| HU-11 | Inicio de sesión (mail) | _Sin dato_ | Flor G., Emma, Cristian |
| HU-15 | Configuración de perfil personal | _Sin dato_ | Flor G., Cristian, Emma, Flor Ga. |
| HU-21 | Registro de baseline clínico inicial | _Sin dato_ | Flor G., Cristian, Flor Ga. |
| HU-24 | Integración con dispositivos wearables | _Sin dato_ | Flor G., Emma, Cristian, Nico |

**Nota:** La planificación no registra nivel de prioridad por HU. Se asignaron desarrolladores pero no prioridad relativa.

**Fuente:** `.cortex/vault/specs/2026-06-04_planificacion-tdd-sprints.md`

#### Criterios de aceptación

**Setup — Inicialización del proyecto:**

| CA | Descripción | Estado |
|----|-------------|--------|
| CA-01 | Proyecto React Native 0.85.3 con TypeScript inicializado | Completado |
| CA-02 | Módulo nativo `VitoHealthModule.kt` creado | Completado |
| CA-03 | Bridge TypeScript `VitoHealthNative.ts` creado | Completado |
| CA-04 | Build exitoso en Android | Completado |

**HU-11 — Inicio de sesión:**

| CA | Descripción | Estado |
|----|-------------|--------|
| CA-01 | El usuario puede ingresar email y contraseña | Completado |
| CA-02 | El sistema valida credenciales incorrectas | Completado |
| CA-03 | El sistema redirige al dashboard luego del login exitoso | Completado |
| CA-04 | La contraseña debe ocultarse visualmente | Completado |

**HU-14 — Registro básico de cuenta:**

| CA | Descripción | Estado |
|----|-------------|--------|
| CA-01 | El usuario puede registrar nombre, email y contraseña | Completado |
| CA-02 | El sistema valida campos obligatorios | Completado |
| CA-03 | El sistema evita emails duplicados | Completado |

**Fuente:** `Historias-de-Usuario_VITO.md`, `src/screens/LoginScreen.tsx`, `src/screens/RegisterScreen.tsx`

### 4️⃣ Sprint 1 — Estimación

_No se encontró registro de la técnica de estimación utilizada, puntos de historia, ni capacidad del equipo._

### 5️⃣ Sprint 1 — Artefactos Generados

**Código:**

| Archivo | Propósito |
|---------|-----------|
| `package.json` | Dependencias del proyecto |
| `tsconfig.json`, `babel.config.js`, `metro.config.js` | Configuración del toolchain |
| `android/.../VitoHealthModule.kt` | Módulo nativo Health Connect |
| `android/.../HealthDataProvider.kt` | Lógica de lectura de Health Connect |
| `src/services/VitoHealthNative.ts` | Bridge TypeScript para módulo nativo |
| `src/context/HealthProvider.tsx` | Proveedor de datos de salud |
| `src/context/SupabaseProvider.tsx` | Proveedor de Supabase |
| `src/services/supabase/client.ts` | Cliente Supabase |
| `src/screens/LoginScreen.tsx` | Pantalla de inicio de sesión |
| `src/screens/RegisterScreen.tsx` | Pantalla de registro |
| `App.tsx` | Punto de entrada |

**CI/CD:**

| Archivo | Propósito |
|---------|-----------|
| `.github/workflows/build-android-dev.yml` | Workflow de build Android |

**Documentación:**

| Archivo | Propósito |
|---------|-----------|
| `arquitectura.md` | Documento de arquitectura |
| `README.md` | Documentación del proyecto |
| `INSTRUCCIONES_EQUIPO.md` | Guía de desarrollo para el equipo |

**Commits representativos:**
- `2670950` — feat: Login/Register screens, Health Connect native modules, navegación y config Android
- `0ebc532` — feat: conexión funcional Supabase F1 - auth foundation

**Capturas de pantalla:**

| Archivo | Propósito |
|---------|-----------|
| `screenshots/sprint-1/login-form.png` | Formulario de inicio de sesión |
| `screenshots/sprint-1/register-form.png` | Formulario de registro |
| `screenshots/sprint-1/login-validation.png` | Validación de credenciales incorrectas |

> ⚠️ *Las capturas están planificadas pero requieren un emulador Android o dispositivo físico para generarse. Ver instrucciones en la sección Pendientes.*

### 6️⃣ Sprint 1 — Sprint Review

**Funcionalidades completadas (según commits y código):**
- Proyecto React Native 0.85.3 con TypeScript compilando
- Módulo nativo Health Connect (Kotlin) operativo
- Bridge TypeScript funcional
- Supabase configurado como BaaS
- Pantallas Login y Register creadas
- CI/CD con GitHub Actions

**Historias no completadas y motivos:**

| Historia | Motivo |
|----------|--------|
| HU-21 (Baseline clínico) | Dependía del perfil de usuario (HU-15), pasó a S3 |
| HU-15 (Perfil completo) | Versión básica implementada, completa pasó a S3 |

**Fuente:** análisis de commits y evolución del código en git log.

### 7️⃣ Sprint 1 — Sprint Retrospective

_No se encontraron minutas de retrospectiva registradas en el repositorio._

---

## 🔁 Sprint 2 — Login y Registro

### 3️⃣ Sprint 2 — Historias de Usuario

| ID | Título | Prioridad | Dev(s) asignados |
|----|--------|-----------|------------------|
| HU-11 | Inicio de sesión (mail) | _Sin dato_ | Flor G., Emma, Cristian |
| HU-14 | Registro básico de cuenta | _Sin dato_ | Flor G., Cristian, Flor Ga. |

#### Criterios de aceptación

Los mismos criterios listados en Sprint 1, dado que son las mismas HUs.

**Fuente:** `Historias-de-Usuario_VITO.md`

### 4️⃣ Sprint 2 — Estimación

_No se encontró registro de estimación._

### 5️⃣ Sprint 2 — Artefactos Generados

**Código:**

| Archivo | Propósito | Commit |
|---------|-----------|--------|
| `src/screens/LoginScreen.tsx` | Pantalla de inicio de sesión | `0378ac5` |
| `src/screens/RegisterScreen.tsx` | Pantalla de registro | `0378ac5` |
| `src/navigation/RootNavigator.tsx` | Navegador raíz con lógica condicional | `06e01b5`, `aab43a4` |

**Integración con Supabase Auth:**
- `supabase.auth.signInWithPassword()` — login
- `supabase.auth.signUp()` — registro
- `supabase.auth.getSession()` — sesión persistente
- `@react-native-async-storage/async-storage` — persistencia local

**Capturas de pantalla:**

| Archivo | Propósito |
|---------|-----------|
| `screenshots/sprint-1/login-form.png` | Pantalla de inicio de sesión (misma que S1) |
| `screenshots/sprint-1/register-form.png` | Pantalla de registro (misma que S1) |

> Las capturas de S2 comparten las de S1 ya que son las mismas pantallas (Login y Register).

### 6️⃣ Sprint 2 — Sprint Review

**Funcionalidades completadas:**
- Login con email y contraseña funcional contra Supabase Auth
- Registro de nueva cuenta con validación de campos
- Sesión persistente entre reinicios de la app
- Redirección condicional según sesión activa

**Historias no completadas:**
- Ninguna. Ambas HUs se completaron.

### 7️⃣ Sprint 2 — Sprint Retrospective

_No se encontraron minutas de retrospectiva registradas en el repositorio._

---

## 🔁 Sprint 3 — Perfil y Baseline

### 3️⃣ Sprint 3 — Historias de Usuario

| ID | Título | Prioridad | Dev(s) asignados |
|----|--------|-----------|------------------|
| HU-15 | Configuración de perfil personal | _Sin dato_ | Flor G., Cristian, Emma, Flor Ga. |
| HU-21 | Registro de baseline clínico inicial | _Sin dato_ | Flor G., Cristian, Flor Ga. |
| HU-24 | Integración con dispositivos wearables | _Sin dato_ | Flor G., Emma, Cristian, Nico |
| HU-22 | Registro manual de signos vitales | _Sin dato_ | Flor G., Emma |
| HU-23 | Registro de síntomas | _Sin dato_ | Cristian, Flor Ga. |
| HU-25 | Sincronización de datos de salud | _Sin dato_ | Nico |
| HU-26 | Validación / normalización de datos | _Sin dato_ | Nico |

#### Criterios de aceptación

**HU-15 — Configuración de perfil personal:**

| CA | Descripción | Estado |
|----|-------------|--------|
| CA-01 | Registrar nombre, apellido, DNI, fecha de nacimiento, sexo biológico, género, nacionalidad | Completado |
| CA-02 | Cálculo automático de edad desde fecha de nacimiento | Completado |
| CA-03 | Los datos persisten entre sesiones | Completado |

**HU-24 — Integración con dispositivos wearables:**

| CA | Descripción | Estado |
|----|-------------|--------|
| CA-01 | Conexión con dispositivos compatibles desde la app | Completado (Health Connect) |
| CA-02 | Recepción automática de datos biométricos | Completado |
| CA-03 | Cada dato almacena su origen (dispositivo o manual) | Completado |

**HU-25 — Sincronización de datos de salud:**

| CA | Descripción | Estado |
|----|-------------|--------|
| CA-01 | Sincronización automática en intervalos | Completado (30s auto-refresh) |
| CA-02 | Botón manual de recarga | Completado |
| CA-03 | Detección de conflictos entre fuentes | No implementado |
| CA-04 | Priorización de wearable sobre manual | No implementado |

**Fuente:** `Historias-de-Usuario_VITO.md`, código en `src/`

### 4️⃣ Sprint 3 — Estimación

_No se encontró registro de estimación._

### 5️⃣ Sprint 3 — Artefactos Generados

**Pantallas creadas:**

| Archivo | Propósito |
|---------|-----------|
| `src/screens/PerfilScreen.tsx` | Visualización de perfil |
| `src/screens/EditarPerfilScreen.tsx` | Edición de perfil |
| `src/screens/CompleteProfileScreen.tsx` | Finalización de registro post-signup |
| `src/screens/HistorialScreen.tsx` | Historial de signos vitales |

**Health Connect extendido (tipos de datos leídos):**
- Pasos, Calorías, Distancia, Sueño, Ejercicio
- Frecuencia cardíaca, Presión arterial, Oxigenación (SpO₂), Temperatura corporal

**ML Pipeline:**

| Archivo | Propósito |
|---------|-----------|
| `ml-trainer/` | Pipeline de ML en Python |
| Dataset cardiovascular | Para modelo de predicción |

**Decisiones de diseño documentadas:**
- `vault/decisions/DEC-2026-06-05-custom-svg-chart-con-panresponder-vs-libreria-externa-de-graficos.md`
- `vault/decisions/DEC-2026-06-05-rootnavigator-wrapper-vs-inline-stack-en-bottomtabnavigator.md`

**Capturas de pantalla:**

| Archivo | Propósito |
|---------|-----------|
| `screenshots/sprint-3/perfil-view.png` | Vista de perfil de usuario |
| `screenshots/sprint-3/perfil-editar.png` | Edición de perfil |
| `screenshots/sprint-3/complete-profile.png` | Finalización de registro post-signup |
| `screenshots/sprint-3/dashboard-salud.png` | Dashboard con 4 indicadores vitales (Inicio) |
| `screenshots/sprint-3/detalle-signo.png` | Detalle de signo vital individual |
| `screenshots/sprint-3/historial-signos.png` | Historial de signos vitales |
| `screenshots/sprint-3/vito-screen.png` | Pantalla VITO (asistente) |
| `screenshots/sprint-3/bottom-tabs.png` | Navegación inferior con iconos Flaticon |
| `screenshots/sprint-3/vital-sign-card.png` | Componente de tarjeta de signo vital |
| `screenshots/sprint-3/health-dashboard.png` | Componente HealthDashboard |

**Commits representativos:**
- `9aa169d` — feat: Health Connect BP/SpO2/temp + auto-refresh 30s + rename VITO + refresh button (2026-06-06)
- `db5f3b7` — feat: CompleteProfileScreen post-registro + fix loading hang + BP siempre visible (2026-06-17)

### 6️⃣ Sprint 3 — Sprint Review

**Funcionalidades completadas:**
- Perfil de usuario completo con visualización y edición
- Cálculo automático de edad
- Health Connect extendido a 10 tipos de datos biométricos
- Auto-refresh de datos cada 30 segundos
- Botón de recarga manual en dashboard
- Dashboard con 4 indicadores vitales desde datos sincronizados
- Pipeline ML inicializado

**Historias no completadas y motivos:**

| Historia | Motivo |
|----------|--------|
| HU-23 (Síntomas) | No se encontró evidencia de implementación |
| HU-26 (Validación/normalización) | No se encontró evidencia de implementación |
| HU-22 (Signos manuales) | No se encontró evidencia de implementación completa |

### 7️⃣ Sprint 3 — Sprint Retrospective

_No se encontraron minutas de retrospectiva registradas en el repositorio._

---

## 🔁 Sprint 4 — Calidad de Datos

### 3️⃣ Sprint 4 — Historias de Usuario

| ID | Título | Prioridad | Dev(s) asignados |
|----|--------|-----------|------------------|
| HU-22 | Registro manual de signos vitales | _Sin dato_ | Flor G., Emma |
| HU-23 | Registro de síntomas | _Sin dato_ | Cristian, Flor Ga. |
| HU-25 | Sincronización de datos de salud | _Sin dato_ | Nico |
| HU-26 | Validación / normalización de datos | _Sin dato_ | Nico |

#### Criterios de aceptación

**HU-25 — Sincronización:**

| CA | Descripción | Estado |
|----|-------------|--------|
| CA-01 | Sincronización automática en intervalos configurables | Completado |
| CA-02 | Caché local de Health Connect cuando datos_reloj está vacío | Completado |
| CA-03 | Detección de conflictos entre fuentes | No implementado |
| CA-04 | Priorización de wearable sobre manual | No implementado |

### 4️⃣ Sprint 4 — Estimación

_No se encontró registro de estimación._

### 5️⃣ Sprint 4 — Artefactos Generados

**Código de estabilización:**

| Área | Cambios realizados | Commit |
|------|--------------------|--------|
| Navegación | Fix initialRouteName condicional según sesión | `6d03dcc` |
| Navegación | Stack.Screen individuales sin grupos | `06e01b5` |
| Navegación | Login y Register siempre en el navigator | `aab43a4` |
| Health Connect | Caché local cuando datos_reloj vacío | `601b103` |
| Sesión | Retry automático + fix timeout race condition | `3ad5e93` |
| CI/CD | Build release APK standalone | `31968e0`, `d32bfb0` |
| CI/CD | Actualización Gradle v4 | `6e6df05` |
| Perfil | Bypass @supabase/supabase-js con raw fetch | `9c7d2f2` |
| UX | Banner opcional en PerfilScreen (no bloqueante) | `5d8c2b7` |

**Capturas de pantalla:**

| Archivo | Propósito |
|---------|-----------|
| `screenshots/sprint-5/alertas-listado.png` | Listado de alertas y notificaciones |

> Las capturas de S4 se organizan bajo `sprint-5/` por consistencia con la estructura definida en los criterios de aceptación.

### 6️⃣ Sprint 4 — Sprint Review

**Funcionalidades completadas:**
- Estabilización de la navegación (4 bugs corregidos)
- Caché local de Health Connect
- Sesión persistente con reintentos automáticos
- CI/CD robusto con APK standalone + Dev Client
- Bypass de @supabase/supabase-js funcional
- Experiencia no bloqueante (banner en lugar de pantalla obligatoria)

**Historias no completadas y motivos:**

| Historia | Motivo |
|----------|--------|
| HU-23 (Síntomas) | Postergado — se priorizó estabilización técnica |
| HU-26 (Validación/normalización) | Postergado — requiere diseño adicional |
| HU-22 (Signos manuales) | Parcial — entrada manual requiere diseño UX adicional |

### 7️⃣ Sprint 4 — Sprint Retrospective

_No se encontraron minutas de retrospectiva registradas en el repositorio._

---

## 🎬 8. Demo de la Release R1

### Funcionalidades a demostrar

Las siguientes funcionalidades existen en el código y pueden demostrarse:

1. **Registro de nueva cuenta** — `RegisterScreen.tsx`
2. **Inicio de sesión** — `LoginScreen.tsx`
3. **Persistencia de sesión** — `SupabaseProvider.tsx`
4. **Perfil de usuario** — `PerfilScreen.tsx`, `EditarPerfilScreen.tsx`
5. **Health Connect** — `VitoHealthModule.kt`, `HealthDataProvider.kt`
6. **Dashboard con 4 indicadores vitales** — `InicioScreen.tsx`, `HealthDashboard.tsx`
7. **Auto-refresh y recarga manual** — `HealthProvider.tsx`
8. **Navegación entre pantallas** — `RootNavigator.tsx`, `BottomTabNavigator.tsx`

### Flujo de la demo

```
1. Abrir la app → LoginScreen (sin sesión activa)
2. "¿No tenés cuenta? Registrate" → completar formulario → [Crear cuenta]
3. Redirección al Dashboard con 4 indicadores vitales
4. Cerrar app y reabrir → sesión persistente → Dashboard directo
5. Navegar a Perfil → ver datos → editar → guardar
6. Health Connect → permisos → datos biométricos en dashboard
7. Recarga manual (↻) en dashboard
```

### Resultados

| Métrica | Valor |
|---------|-------|
| Commits en R1 | 50+ |
| Líneas de código TypeScript | ~6,418 |
| Archivos TypeScript/TSX | 34 |
| Pantallas desarrolladas | 8 |
| Componentes UI | 10 |
| Tipos de datos Health Connect | 9 |
| HUs del plan | 10 |
| HUs con evidencia de implementación parcial o total | 5 (Setup, HU-11, HU-14, HU-15, HU-24) |
| Capturas planificadas en informe | 16 (ver `screenshots/`) |

> **Nota sobre screenshots:** La estructura de directorios `screenshots/sprint-1/`, `screenshots/sprint-3/` y `screenshots/sprint-5/` está creada. Las capturas deben generarse en un emulador Android o dispositivo físico, siguiendo el flujo de demo detallado arriba. Comando de ejemplo por pantalla: `adb exec-out screencap -p > screenshots/sprint-<n>/<nombre>.png`.

---

## ➡️ 9. Planificación de la Próxima Release

### R2 — Monitoreo y Alertas Tempranas (24 jun — 10 ago)

**Fuente:** `.cortex/vault/specs/2026-06-04_planificacion-tdd-sprints.md`

**Historias candidatas por sprint:**

| Sprint | HUs |
|--------|-----|
| S5 (24 jun — 30 jun) | HU-31 Dashboard, HU-36 Menú, HU-32 Reportes, HU-41 Alerta hipoxia, HU-42 Alerta FC, HU-43 Alerta PA |
| S6 (1 jul — 7 jul) | HU-31 Dashboard, HU-36 Menú, HU-65 Check-in emocional |
| S7 (8 jul — 14 jul) | HU-32 Reportes, HU-41 Alerta hipoxia, HU-62 Respuestas sugeridas |
| S8 (15 jul — 21 jul) | HU-42 Alerta FC, HU-43 Alerta PA |
| S9 (22 jul — 28 jul) | HU-37 Alertas en dashboard, HU-63 Recomendaciones |
| S10 (29 jul — 4 ago) | HU-51 Notificaciones push, HU-61 Chat Vittito |
| S11 (5 ago — 10 ago) | Estabilización R2 |

---

## Pendientes de completar

Las siguientes secciones del template no pudieron completarse por falta de datos en el repositorio. Acá van sugerencias de cómo generarlos:

| Sección | ¿Qué falta? | Sugerencia |
|---------|-------------|------------|
| **Prioridad por HU** | No hay registro de prioridades | Definir en equipo: Alta/Media/Baja según impacto y dependencias. Podría hacerse en una reunión de 30 min. |
| **Estimación (story points / planning poker)** | No hay estimación | Hacer una sesión de Planning Poker con el equipo. Usar la secuencia de Fibonacci (1,2,3,5,8,13). Estimar solo las HUs pendientes. |
| **Sprint Backlog / Kanban** | No hay tablero registrado | Crear un proyecto en GitHub Projects con columnas: To Do / In Progress / Done. Mover las HUs de la spec como issues. |
| **Burndown chart** | No hay seguimiento diario de puntos | Arrancar desde R2: al final de cada día, registrar puntos completados. Con 2 semanas de datos ya se puede trazar. |
| **Screenshots** | Estructura `screenshots/` creada con carpetas por sprint. Capturas documentadas en Artefactos Generados. | **PENDIENTE:** Tomar capturas con emulador Android o dispositivo físico (16 capturas planificadas). Ejecutar `adb exec-out screencap -p > screenshots/sprint-<n>/<nombre>.png` en cada pantalla. |
| **Sprint Review (feedback)** | No hay minutas | Documentar después de cada demo de sprint: qué se mostró, qué comentarios dio el equipo/profesor. |
| **Sprint Retrospective** | No hay minutas | Usar la dinámica "Start / Stop / Continue" después de cada sprint y guardar el resultado en `.cortex/vault/`. |
| **DoD de release** | No hay Definition of Done global | Definir checklist común: compila, tests pasan, código revisado, criterios de aceptación OK. |

---

## Anexo: Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework principal | React Native | 0.85.3 |
| Lenguaje | TypeScript | 5.8.3 |
| UI Engine | React | 19.2.3 |
| Navegación | React Navigation | v7 |
| Android SDK | compileSdk / targetSdk | 35 |
| Módulos nativos | Kotlin | 1.9.24 |
| Health Connect SDK | `connect-client` | 1.1.0-alpha11 |
| Backend | Supabase | 2.107.0 |
| ML Pipeline | Python / FastAPI | — |
| CI/CD | GitHub Actions + Expo Dev Client | — |

---

## Anexo: Equipo

| Desarrollador | Correo en git | Commits en R1 |
|--------------|---------------|---------------|
| Cristian Vera | `veracristianadrian@gmail.com` | 31 |
| florenstt (Flor/Nico) | `florenstt@...` | 22 |
| flor-galarza | `flor.univ2024@gmail.com` | 14 |
| florensg (Flor González) | `floo.g1096@gmail.com` | 3 |
| Florencia Gonzalez | `79384901+florensg@...` | 2 |

**Fuente:** `git shortlog -sn`

---

*Documento generado el 28 de junio de 2026 — VITO Health Connect — Release R1: Fundación Técnica*
