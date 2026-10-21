---
schema_version: 1
doc_type: spec
title: 'Scrum 72 - HU-31 CA-03/04/05: Verificacion dashboard signos vitales'
created_at: '2026-08-23T23:27:05.728526Z'
updated_at: '2026-08-23T23:27:05.728526Z'
tags:
- spec
- scrum-72
- hu-31
- dashboard
- signos-vitales
- verificacion
status: draft
links: []
vault_scope: local
fingerprint: 275d66a8c0e62a6ec72e493ba13522601d1d22ae93867e06b1c750a55d813cd5
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
goal: 'Verificar e implementar CA-03, CA-04 y CA-05 del dashboard de signos vitales
  HU-31. CA-03: circulo de progreso para actividad fisica. CA-04: actualizacion automatica
  de datos. CA-05: mensaje ''Sin datos recientes'' cuando no hay datos.'
files_in_scope:
- src/screens/InicioScreen.tsx
- src/components/HealthDashboard.tsx
- src/components/MetricCard.tsx
- src/context/HealthProvider.tsx
constraints:
- No romper funcionalidad existente del dashboard
- Usar componentes existentes (MetricCard, HealthDashboard)
- Respetar theme y estilos actuales
acceptance_criteria:
- 'CA-03: Indicador de actividad física como círculo de progreso con porcentaje del
  objetivo diario'
- 'CA-04: Datos se actualizan automáticamente según frecuencia de sincronización configurada'
- 'CA-05: Si dato no disponible, mostrar ''Sin datos recientes'' con fecha del último
  registro'
---

## Goal

Verificar e implementar CA-03, CA-04 y CA-05 del dashboard de signos vitales HU-31. CA-03: circulo de progreso para actividad fisica. CA-04: actualizacion automatica de datos. CA-05: mensaje 'Sin datos recientes' cuando no hay datos.

## Requirements

- CA-03: El indicador de actividad física se visualiza como un círculo de progreso con porcentaje del objetivo diario cumplido
- CA-04: Los datos se actualizan automáticamente según la frecuencia de sincronización configurada
- CA-05: Si algún dato no está disponible, se muestra el mensaje 'Sin datos recientes' con la fecha del último registro

## Files in Scope

- `src/screens/InicioScreen.tsx`
- `src/components/HealthDashboard.tsx`
- `src/components/MetricCard.tsx`
- `src/context/HealthProvider.tsx`

## Constraints

- No romper funcionalidad existente del dashboard
- Usar componentes existentes (MetricCard, HealthDashboard)
- Respetar theme y estilos actuales

## Acceptance Criteria

- [ ] CA-03: Indicador de actividad física como círculo de progreso con porcentaje del objetivo diario
- [ ] CA-04: Datos se actualizan automáticamente según frecuencia de sincronización configurada
- [ ] CA-05: Si dato no disponible, mostrar 'Sin datos recientes' con fecha del último registro

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
