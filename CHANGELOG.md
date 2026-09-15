# Changelog — Vito App Android

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
Cada PR futuro agrega su entrada bajo `Unreleased`. Ver DoD de releases:
`.cortex/vault/runbooks/RB-dod-de-releases-checklist-canonico-estado-de-brechas.md`.

## [Unreleased]

### Agregado
- (Tus cambios acá: `### Agregado/Cambiado/Corregido/Quitado` por PR)

## [1.0.0] — 2026-09-11 (base inicial, entradas históricas a completar)

### Agregado
- Alertas de salud: hipoxia SpO2 (HU-41/SCRUM-90), frecuencia cardíaca (HU-42/SCRUM-91),
  presión arterial (HU-43/SCRUM-92) con AlertEngine local.
- Notificaciones push HU-51/SCRUM-95: deep link al detalle, horario silencioso,
  log de entrega; push server-side vía Edge Function + trigger versionados + panel-admin QA.
- Sincronización de datos de salud HU-25/SCRUM-79; registro de síntomas HU-23;
  reportes de signos vitales HU-32; sugerencias Vittito HU-34 (fase A).
- Integración Supabase (auth, perfil, raw REST en RN), Health Connect, FCM
  (`google-services.json`, proyecto vito-39dda).
- CI: lint + type-check + Jest en PRs, builds Android en CI, sync Jira.

### Notas
- Las entradas anteriores a este archivo se reconstruyen de a poco desde el
  historial de git (`git log --oneline`) en siguientes iteraciones.
