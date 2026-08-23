---
schema_version: 1
doc_type: spec
title: Registro de Síntomas - HU-23
created_at: '2026-07-24T22:19:30.211990Z'
updated_at: '2026-07-24T22:19:30.211990Z'
tags:
- spec
- HU-23
- sintomas
- catalogo
- formulario
status: draft
links: []
vault_scope: local
fingerprint: 2df31f0d8747ddc64d3a8db4e7df7aef9b506bf7fe380fd4b9793d45de26a97a
verification_hooks:
- name: build
  command: cd android && ./gradlew assembleRelease
  required: true
  success_criteria: exit code 0
  timeout_seconds: 300
goal: Implementar formulario de registro de síntomas con catálogo controlado, selección
  múltiple, intensidad, descripción, fecha y hora. Botón "Registrar Síntoma" en dashboard.
files_in_scope:
- src/services/supabase/schema.sql
- src/services/supabase/models.ts
- src/services/supabase/api.ts
- src/screens/DashboardScreen.tsx
- src/navigation/RootNavigator.tsx
- android/app/build.gradle
constraints: []
acceptance_criteria:
- Catálogo precargado con todos los síntomas de las 6 categorías
- Botón (+) muestra listado seleccionable de síntomas
- Formulario permite completar intensidad, descripción, fecha y hora
- Los datos se guardan correctamente en Supabase
- Botón 'Registrar Síntoma' visible en dashboard
---

## Goal

Implementar formulario de registro de síntomas con catálogo controlado, selección múltiple, intensidad, descripción, fecha y hora. Botón "Registrar Síntoma" en dashboard.

## Requirements

- Catálogo de síntomas precargado en tabla sintomas (6 categorías, ~20 síntomas)
- UI de selección: botón (+) despliega listado de síntomas del catálogo
- Formulario post-selección: intensidad (1-5), descripción libre, fecha, hora
- Guardar en sintomas_usuario con FK a catálogo
- Botón 'Registrar Síntoma' en el dashboard principal
- Clasificación automática según categoría del catálogo

## Files in Scope

- `src/services/supabase/schema.sql`
- `src/services/supabase/models.ts`
- `src/services/supabase/api.ts`
- `src/screens/DashboardScreen.tsx`
- `src/navigation/RootNavigator.tsx`
- `android/app/build.gradle`

## Constraints

(none)

## Acceptance Criteria

- [ ] Catálogo precargado con todos los síntomas de las 6 categorías
- [ ] Botón (+) muestra listado seleccionable de síntomas
- [ ] Formulario permite completar intensidad, descripción, fecha y hora
- [ ] Los datos se guardan correctamente en Supabase
- [ ] Botón 'Registrar Síntoma' visible en dashboard

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### build
```bash
cd android && ./gradlew assembleRelease
```

Success: exit code 0 · Timeout: 300s
