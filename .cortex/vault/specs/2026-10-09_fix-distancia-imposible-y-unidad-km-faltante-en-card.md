---
schema_version: 1
doc_type: spec
title: fix distancia imposible y unidad km faltante en card
created_at: '2026-10-09T15:29:05.850134Z'
updated_at: '2026-10-09T15:29:05.850134Z'
tags:
- spec
- spec
- bug
- distancia
- ui
- health-connect
status: draft
links: []
vault_scope: local
fingerprint: d87f1b17df917e55574f33d5f0f91f9892d807488f95856257ce65f633bbfca4
verification_hooks:
- name: tsc
  command: npx tsc --noEmit
  required: true
  success_criteria: sin errores de tipos
  timeout_seconds: 300
goal: 'Corregir distancia imposible (35) y unidad km/m faltante en card: UI con unidad
  siempre visible + dato DISTANCE_TOTAL con logs por fuente, dedup o cap de cordura.
  Todo en rama fix del día basada en dev + PR #34.'
files_in_scope:
- android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt
- src/utils/signosVitales.ts
- src/components/VitalSignCard.tsx
- src/screens/DetalleSignoScreen.tsx
- src/screens/TodosLosSignosScreen.tsx
- src/screens/InicioScreen.tsx
constraints:
- 'Trabajar en rama fix del día basada en dev actualizado + PR #34 (traer todo antes
  de implementar)'
- No tocar lógica de pasos/sueño/calorías del provider
- No romper CI (tsc bloqueante)
acceptance_criteria:
- La card de distancia siempre muestra unidad (km si >=1000m, m si no) en dashboard,
  signos, detalle y todos-los-signos — nunca número pelado
- El caso 35 imposible queda explicado (doble conteo reloj+teléfono o fuente vehículo)
  y corregido con dedup o cap de cordura logueado
- 'Rama fix del día creada desde dev actualizado incluyendo PR #34'
- tsc en verde
---

## Goal

Corregir distancia imposible (35) y unidad km/m faltante en card: UI con unidad siempre visible + dato DISTANCE_TOTAL con logs por fuente, dedup o cap de cordura. Todo en rama fix del día basada en dev + PR #34.

## Requirements

- UI: garantizar unidad km/m siempre visible en distancia (signosVitales value+unit, VitalSignCard, DetalleSignoScreen header, TodosLosSignosScreen, mapeo InicioScreen)
- Nativo: investigar DISTANCE_TOTAL (doble conteo reloj+teléfono como pasos/sueño), agregar logs por dataOrigin y aplicar dedup o cap de cordura
- Rama: crear rama fix del día desde dev actualizado trayendo PR #34 aun no aprobado antes de implementar

## Files in Scope

- `android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt`
- `src/utils/signosVitales.ts`
- `src/components/VitalSignCard.tsx`
- `src/screens/DetalleSignoScreen.tsx`
- `src/screens/TodosLosSignosScreen.tsx`
- `src/screens/InicioScreen.tsx`

## Constraints

- Trabajar en rama fix del día basada en dev actualizado + PR #34 (traer todo antes de implementar)
- No tocar lógica de pasos/sueño/calorías del provider
- No romper CI (tsc bloqueante)

## Acceptance Criteria

- [ ] La card de distancia siempre muestra unidad (km si >=1000m, m si no) en dashboard, signos, detalle y todos-los-signos — nunca número pelado
- [ ] El caso 35 imposible queda explicado (doble conteo reloj+teléfono o fuente vehículo) y corregido con dedup o cap de cordura logueado
- [ ] Rama fix del día creada desde dev actualizado incluyendo PR #34
- [ ] tsc en verde

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### tsc
```bash
npx tsc --noEmit
```

Success: sin errores de tipos · Timeout: 300s
