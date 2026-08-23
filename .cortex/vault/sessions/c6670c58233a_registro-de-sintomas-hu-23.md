---
schema_version: 1
doc_type: session
title: Registro de Síntomas - HU-23
created_at: '2026-07-27T19:19:06.180432Z'
updated_at: '2026-07-27T19:19:06.180432Z'
tags:
- session
- session
- byo
- auto-draft
- handoff
status: handoff
links: []
vault_scope: local
fingerprint: 4b7516e639e6d3bdf78dacf2b2c5a2c25b80cbb0c69c8f55348a36263aec0c4d
session_id: c6670c58233a
pr: null
branch: null
commit: null
cortex_telemetry: null
---

## Original Specification

Implementar formulario de registro de síntomas con catálogo controlado, selección múltiple, intensidad, descripción, fecha y hora. Botón "Registrar Síntoma" en dashboard.

## Changes Made

(none)

## Files Touched

(none)

## Key Decisions

(none)

## Next Steps

- [ ] Implement: src/services/supabase/schema.sql
- [ ] Implement: src/services/supabase/models.ts
- [ ] Implement: src/services/supabase/api.ts
- [ ] Implement: src/screens/DashboardScreen.tsx
- [ ] Implement: src/navigation/RootNavigator.tsx
- [ ] Implement: android/app/build.gradle
- [ ] [self-review] Placeholders detected in draft: ['todo']

## Verified State

- verification hook 'build' passed

## Unverified Claims

- acceptance criterion: Catálogo precargado con todos los síntomas de las 6 categorías
- acceptance criterion: Botón (+) muestra listado seleccionable de síntomas
- acceptance criterion: Formulario permite completar intensidad, descripción, fecha y hora
- acceptance criterion: Los datos se guardan correctamente en Supabase
- acceptance criterion: Botón 'Registrar Síntoma' visible en dashboard
