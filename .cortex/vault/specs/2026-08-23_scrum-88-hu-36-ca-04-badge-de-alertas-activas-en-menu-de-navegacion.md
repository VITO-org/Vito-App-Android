---
schema_version: 1
doc_type: spec
title: 'Scrum 88 - HU-36 CA-04: Badge de alertas activas en menu de navegacion'
created_at: '2026-08-23T22:58:33.858532Z'
updated_at: '2026-08-23T22:58:33.858532Z'
tags:
- spec
- scrum-88
- hu-36
- badge
- alertas
- navegacion
- real-time
status: draft
links: []
vault_scope: local
fingerprint: fb6b344926ef2cafa40b3397c8cebdca7e9f66d025fda99a1e009e8ff96be725
verification_hooks:
- name: TypeScript compile
  command: npx tsc --noEmit
  required: true
  success_criteria: exit code 0
  timeout_seconds: 120
- name: Android build
  command: ./gradlew assembleRelease
  required: true
  success_criteria: exit code 0
  timeout_seconds: 300
goal: Mostrar un badge con la cantidad de alertas sin leer en el boton de Alertas
  del menu inferior, actualizandose en tiempo real cuando se generan o leen alertas.
files_in_scope:
- src/navigation/BottomTabNavigator.tsx
- src/screens/AlertasScreen.tsx
- src/context/HealthProvider.tsx
- src/services/alerts/engine.ts
constraints:
- No romper navegacion existente
- Usar mecanismo de estado existente (context/refreshAlerts)
- Compatible con el pattern de listeners onGenerated/onEscalated/onResolved ya existente
acceptance_criteria:
- Badge numerico visible en tab de Alertas cuando hay alertas activas (leida_en IS
  NULL)
- Badge se actualiza en tiempo real via listener onGenerated del AlertEngine
- Badge se decrementa cuando el usuario lee alertas en AlertasScreen
- Badge desaparece cuando no quedan alertas sin leer
---

## Goal

Mostrar un badge con la cantidad de alertas sin leer en el boton de Alertas del menu inferior, actualizandose en tiempo real cuando se generan o leen alertas.

## Requirements

- El boton de Alertas en BottomTabNavigator muestra un badge numerico cuando hay alertas sin leer (leida_en IS NULL)
- El badge se muestra/oculta automaticamente al generarse nuevas alertas
- El badge se actualiza cuando el usuario lee una alerta en AlertasScreen
- El badge muestra la cantidad exacta de alertas activas sin leer
- Si no hay alertas sin leer, no se muestra badge

## Files in Scope

- `src/navigation/BottomTabNavigator.tsx`
- `src/screens/AlertasScreen.tsx`
- `src/context/HealthProvider.tsx`
- `src/services/alerts/engine.ts`

## Constraints

- No romper navegacion existente
- Usar mecanismo de estado existente (context/refreshAlerts)
- Compatible con el pattern de listeners onGenerated/onEscalated/onResolved ya existente

## Acceptance Criteria

- [ ] Badge numerico visible en tab de Alertas cuando hay alertas activas (leida_en IS NULL)
- [ ] Badge se actualiza en tiempo real via listener onGenerated del AlertEngine
- [ ] Badge se decrementa cuando el usuario lee alertas en AlertasScreen
- [ ] Badge desaparece cuando no quedan alertas sin leer

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### TypeScript compile
```bash
npx tsc --noEmit
```

Success: exit code 0 · Timeout: 120s
### Android build
```bash
./gradlew assembleRelease
```

Success: exit code 0 · Timeout: 300s
