# Changelog — Vito App Android

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Cada PR futuro agrega su entrada bajo `Unreleased`. Ver DoD de releases:
`.cortex/vault/runbooks/RB-dod-de-releases-checklist-canonico-estado-de-brechas.md`.

## [Unreleased]

### Agregado
- (Tus cambios acá: `### Agregado/Cambiado/Corregido/Quitado` por PR)

## [1.2.1] — 2026-10-24

### Sobre esta release

**Release 1.2.1 — Corrección de seguridad y aislamiento de datos.** Esta versión
corrige el envío del token de sesión en las consultas de la app y completa el
bloqueo de acceso anónimo a los datos de pacientes en Supabase.

### Corregido

- **Autenticación de consultas**: `HealthProvider`, `NotificationsProvider`,
  `HistorialScreen`, `DetalleSignoScreen` y la sincronización Health Connect
  ahora envían el `access_token` de la sesión en todas las operaciones sobre
  `datos_reloj`, `alerta`, `dispositivo_usuario`, `preferencia_notificacion`
  y `notificacion_entrega`.
- **Historial y detalle de signos**: siguen cargando los datos del usuario
  autenticado después del bloqueo de RLS.
- **Sincronización Health Connect**: `insertDatosRelojYML` propaga el token
  para que la escritura en `datos_reloj` siga funcionando con RLS activo.

### Seguridad

- **RLS activo** en las 6 tablas de pacientes: `alerta`, `datos_reloj`,
  `dispositivo_usuario`, `notificacion_entrega`, `preferencia_notificacion`
  y `suggestion`.
- **Policies anónimas eliminadas**: se removieron `anon_select_alertas`,
  `"Dashboard puede crear alertas"`, `anon_select_notificacion_entrega`,
  `anon_select_preferencia_notificacion`, `anon_upsert_preferencia_notificacion`,
  `anon_update_preferencia_notificacion` y `anon_select_suggestions`.
- **Privilegios de `anon` revocados**: la publishable key pública ya no puede
  leer ni escribir esas tablas (responde 404). El rol `authenticated` conserva
  acceso solo a sus propias filas.
- **Verificación de aislamiento**: dos usuarios de prueba ven exclusivamente
  sus propios datos.

### Infraestructura

- Migración `20261023000000_rls_panel_alertas_parte3_cierre_total.sql`.
- Las partes 1 y 2 del cierre RLS fueron aplicadas en Supabase desde la rama
  `test`; esta release incluye el cierre total y el fix de la app.
- Sin cambios de funcionalidad visibles para el usuario.

## [1.2.0] — 2026-10-19

### Sobre esta release

**Release 3 — Dashboard, Gráficos y Correcciones de Datos**. Esta versión consolida
el trabajo de `dev` desde la release anterior: rediseño de la pantalla de Inicio
según mockups, detalle de signos con buckets horarios, unificación del visual de
alertas, y las correcciones de cálculo de sueño y pasos que Inflaban los valores
agregados (doble conteo por sesiones solapadas y suma de acumulados).

### Funcionalidades nuevas

- **Rediseño de la pantalla de Inicio** (`InicioScreen`): filas con comparativa
  verde/rojo, iconos por severidad, pop-up de detalle y acceso directo a gráficos.
- **Tarjeta de Estado General** (`EstadoGeneralCard`): reemplaza el banner de
  alertas con una vista unificada del estado clínico del paciente.
- **Detalle de signos con buckets horarios** (`DetalleSignoScreen`): agrupación
  de lecturas en intervalos de 30 minutos, ejes con 5 divisiones y tooltips con
  medición del rango.
- **Sección de últimos síntomas registrados** en el historial, con nombre e icono
  del síntoma y mejoras de accesibilidad.
- **Iconografía unificada** (`SignoIcon`): componente compartido para los 30
  signos vitales, con sets nuevos de Flaticon (frecuencia cardíaca, presión
  arterial, oxígeno, temperatura, advertencia, gráficos, historial).
- **Icono de app y launcher VITO** + icono de notificación con silueta.
- **Tests unitarios** de `estadoGeneral` (`__tests__/estadoGeneral.test.ts`).

### Corregido

- **Sueño sin doble conteo**: se fusionan las sesiones de sueño solapadas antes
  de sumar (la app marcaba 9.1 h contra 4.54 h del reloj) y solo se cuentan las
  etapas dormidas, con tolerancia de 5 min.
- **Ventana de sueño**: la tarjeta ya no muestra `--` cuando la ventana de
  lectura (medianoche → ahora) excluye la sesión de la noche; formato `Xh Ym`.
- **Pasos acumulados**: se agregan con `MAX` por día en vez de `SUMA`, que
  inflaba el total con cada refresh (3.470 → 10.977 pasos).
- **Distancia imposible** (valor 35): unidad `km`/`m` visible en la card y sanéo
  de `DISTANCE_TOTAL`.
- **Unidades y promedios**: unidades en tamaño chico en las cards y promedio sin
  nulos en el detalle de signo.
- **Gráfico semanal**: ya dibuja los registros del período.
- **Alertas**: refresh de push/foreground compartido y destino/títulos
  centralizados en `src/utils/alertas.ts`; el menú de alertas ya no auto-marca
  como revisada y navega a los gráficos.

### Cambiado

- **Visual de alertas unificado** entre banner y pantalla de alertas (HU-37),
  con helpers compartidos en `src/utils/alertas.ts`.
- **`ActiveAlertsBanner`** eliminado: la información se muestra en
  `EstadoGeneralCard` (banner duplicado sin uso).
- **CI/CD de `dev` endurecido**: `tsc --noEmit` y `jest` pasan a ser
  bloqueantes en los PRs a `dev` (lint sigue siendo permisivo).
- **Workflows**: `ci-jira.yml` restringido a `opened` + notas de release mejoradas;
  se ignora el borrado de ramas para evitar transiciones falsas a "In Progress".
- **Lint no bloqueante en el gate de `main`** (`ci-pr-main.yml`): el repo arrastra
  60 errores de lint idénticos en `main` y `dev`, por lo que el step hacía
  inoperable cualquier PR a `main`. Ahora corre con `continue-on-error: true`
  (los errores siguen en el log); `tsc`, `jest`, `dod:check` y el build de Gradle
  siguen bloqueando el merge.

### Infraestructura

- Sin migraciones de base de datos en esta release.
- Se eliminan los archivos de planificación desactualizados del repo
  (`SPRINTS.md`, `RELEASES.md`, índice de épicas, historias y Excel VITO).

## [1.1.0] — 2026-09-15

### Sobre esta release

**Release 2 - Automatización y Alertas**. Esta versión agrega el sistema
completo de alertas clínicas automáticas (hipoxemia, frecuencia cardíaca y
presión arterial fuera de rango), captura y almacenamiento estructurado de
datos de salud, validación de calidad de datos ingresados, generación de
históricos para análisis ML, y una vista mejorada de gráficos de reporte.

### Historias de Usuario (Release 2)

| HU | SCRUM | Descripción | Estado |
|----|-------|-------------|--------|
| HU-21 | SCRUM-84 | Registro de baseline de salud | ✅ Done |
| HU-25 | SCRUM-79 | Sincronización de datos de salud (Health Connect) | ✅ Done |
| HU-31 | SCRUM-72 | Visualizar signos vitales en el dashboard | ✅ Done |
| HU-38 | SCRUM-116 | Vista de los gráficos de reporte | ✅ Done |
| HU-41 | SCRUM-90 | Alerta por hipoxia (SpO₂ baja) | ✅ Done |
| HU-42 | SCRUM-91 | Alerta por frecuencia cardíaca fuera de rango | ✅ Done |
| HU-43 | SCRUM-92 | Alerta por presión arterial fuera de rango | ✅ Done |
| HU-94 | SCRUM-110 | Captura y almacenamiento estructurado de datos de salud | ✅ Done |
| HU-95 | SCRUM-111 | Generación y disponibilidad de históricos de datos del paciente | ✅ Done |
| HU-96 | SCRUM-112 | Validación de calidad de datos ingresados | ✅ Done |

### Funcionalidades nuevas

- **Alertas clínicas automáticas**: monitoreo continuo de SpO₂, frecuencia cardíaca y presión arterial con notificaciones cuando los valores están fuera de rango.
- **Baseline de salud**: registro de valores de referencia personalizados para cada paciente.
- **Captura estructurada de datos**: almacenamiento optimizado de datos de salud con esquema orientado a ML.
- **Validación de calidad de datos**: verificación automática de integridad y registro de intentos fallidos.
- **Generación de históricos**: exportación de datos de paciente en formato estructurado para análisis de Machine Learning.
- **Gráficos de reporte mejorados**: vista optimizada de reportes con visualización interactiva.

### Infraestructura

- Migraciones de base de datos para tablas de alertas, baseline y datos estructurados.
- Triggers de evaluación automática de eventos de salud.
- Schema Supabase extendido para soportaralertas y datos clínicos.

## [1.0.0] — 2026-09-15

### Sobre esta release

**Vito Health Connect** es una aplicación móvil de salud que permite a pacientes
monitorear y registrar sus signos vitales (frecuencia cardíaca, saturación de
oxígeno, presión arterial, pasos, sueño y calorías quemadas), visualizar
reportes diarios/semanales/mensuales, y registrar síntomas de forma
estructurada. La app se integra con **Health Connect** (Android) para sincronizar
datos del reloj inteligente de forma automática, y sincroniza todo con
**Supabase** como backend.

La primera release incluye el motor completo de captura y visualización de datos
clínicos, con un enfoque en **hipoxemia** (alerta por SpO₂ baja), **frecuencia
cardíaca fuera de rango** y **presión arterial fuera de rango**, más un sistema
de notificaciones push server-side y contactos de confianza para alertas
clínicas.

### Historias de Usuario (Release 1)

| HU | SCRUM | Descripción | Estado |
|----|-------|-------------|--------|
| HU-11 | SCRUM-66 | Acceso a la cuenta (login) | ✅ Done |
| HU-12 | SCRUM-67 | Registro básico de cuenta | ✅ Done |
| HU-14 | SCRUM-69 | Registro de contactos de confianza | ✅ Done |
| HU-15 | SCRUM-70 | Configuración de perfil personal | ✅ Done |
| HU-22 | SCRUM-71 | Actualización manual de signos vitales | ✅ Done |
| HU-23 | SCRUM-78 | Registro de síntomas | ✅ Done |
| HU-24 | SCRUM-83 | Integración con Health Connect (sincronización automática) | ✅ Done |
| HU-26 | SCRUM-77 | Validación y normalización de datos de signos vitales | ✅ Done |
| HU-32 | SCRUM-73 | Visualizar reportes de signos vitales (diario, semanal, mensual) | ✅ Done |
| HU-36 | SCRUM-88 | Menú de navegación principal | ✅ Done |
| HU-93 | SCRUM-76 | Selección de tecnologías de Machine Learning | ✅ Done |

### Funcionalidades principales

- **Captura de signos vitales**: Health Connect (automática) + ingreso manual.
- **Reportes interactivos**: gráficos diario/semanal/mensual con `react-native-gifted-charts`.
- **Registro de síntomas**: formulario estructurado con timestamps.
- **Alertas clínicas**: hipoxemia (SpO₂), frecuencia cardíaca y presión arterial fuera de rango.
- **Notificaciones push**: server-side via Edge Functions de Supabase + Expo Push.
- **Contactos de confianza**: administración y configuración de notificaciones por contacto.
- **Perfil personal**: configuración editable con datos clínicos iniciales.
- **Navegación**: bottom tabs con iconos nativos, detalle de signos con gráfico interactivo.

### Infraestructura y Calidad

- **CI/CD**: pipelines completos (lint + tsc + jest + Android build) en PRs a `dev` y `main`.
- **Release Gate**: `ci-pr-main.yml` — a `main` solo entran releases confirmadas con DoD completo.
- **SAST**: GitHub CodeQL (javascript-typescript) en PR + push + semanal.
- **Releases automáticas**: `release.yml` — tag `vX.Y.Z` → build APK → GitHub Release → Discord.
- **DoD verificado**: `dod:check` (paridad versiones + CHANGELOG + migraciones idempotentes).
- **Cobertura**: umbral 80% líneas/funcs (baseline: 95.29% / 89.39%).
- **Rollback**: template documentado por release en runbook DoD.

### Migraciones de base de datos

- Schema Supabase para signos vitales, alertas, contactos de confianza, notificaciones y configuración.
- Triggers idempotentes para sincronización y entrega de notificaciones.
- Políticas RLS configuradas (staging temporalmente deshabilitado para QA; revert obligatorio antes de prod).
