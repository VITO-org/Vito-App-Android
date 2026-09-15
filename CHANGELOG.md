# Changelog — Vito App Android

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Cada PR futuro agrega su entrada bajo `Unreleased`. Ver DoD de releases:
`.cortex/vault/runbooks/RB-dod-de-releases-checklist-canonico-estado-de-brechas.md`.

## [Unreleased]

### Agregado
- (Tus cambios acá: `### Agregado/Cambiado/Corregido/Quitado` por PR)

## [1.0.0] — 2026-09-15

### Historias de Usuario (Release 1)
- **HU-11 (SCRUM-66)**: Acceso a la cuenta.
- **HU-12 (SCRUM-67)**: Registro básico de cuenta.
- **HU-14 (SCRUM-69)**: Registro de contactos de confianza.
- **HU-15 (SCRUM-70)**: Configuración de perfil personal.
- **HU-22 (SCRUM-71)**: Actualización manual de signos vitales.
- **HU-23 (SCRUM-78)**: Registro de síntomas.
- **HU-24 (SCRUM-83)**: Integración con Health Connect.
- **HU-26 (SCRUM-77)**: Validación y normalización de datos de signos vitales.
- **HU-32 (SCRUM-73)**: Visualizar reportes de signos vitales diario, semanal y mensual.
- **HU-36 (SCRUM-88)**: Menú de navegación principal.
- **HU-93 (SCRUM-76)**: Selección de tecnologías de Machine Learning.

### Infraestructura y Calidad
- Definición de DoD y pipeline de releases automáticos (APK de release + GitHub Release).
- SAST con GitHub CodeQL y verificación de idempotencia de migraciones SQL (`dod:check`).
- Integración continua en PRs a dev con validación de tests Android y reporte de cobertura Jest.
