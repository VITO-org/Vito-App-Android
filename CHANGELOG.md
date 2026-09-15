# Changelog — Vito App Android

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Cada PR futuro agrega su entrada bajo `Unreleased`. Ver DoD de releases:
`.cortex/vault/runbooks/RB-dod-de-releases-checklist-canonico-estado-de-brechas.md`.

## [Unreleased]

### Agregado
- (Tus cambios acá: `### Agregado/Cambiado/Corregido/Quitado` por PR)

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
