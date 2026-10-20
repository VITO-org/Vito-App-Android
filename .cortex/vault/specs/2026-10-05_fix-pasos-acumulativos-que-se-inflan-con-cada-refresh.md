---
schema_version: 1
doc_type: spec
title: fix pasos acumulativos que se inflan con cada refresh
created_at: '2026-10-05T23:19:28.616653Z'
updated_at: '2026-10-05T23:19:28.616653Z'
tags:
- spec
- bug
- pasos
- health-connect
- datos_reloj
- dev
status: draft
links: []
vault_scope: local
fingerprint: 7091c9a199b5f54de09b4834b61f40ba214bb2a45cb5d929b531060ed25cc9cb
verification_hooks:
- name: jest sugerencias
  command: npm test -- src/services/suggestions/__tests__/supabaseSource.test.ts src/services/suggestions/__tests__/rulesEngine.test.ts
  required: true
  success_criteria: 44 passed
  timeout_seconds: 120
- name: tsc limpio
  command: npx tsc --noEmit
  required: true
  success_criteria: sin errores
  timeout_seconds: 120
goal: 'Documentar fix del bug dev donde pasos se inflan con cada refresh (reloj 3470
  vs vito 10977). Causa: actividad_pasos es contador acumulativo diario (HC COUNT_TOTAL)
  pero se SUMABA. Fix read-path: ULTIMO/MAX en vez de SUMA.'
files_in_scope:
- src/services/suggestions/supabaseMapper.ts
- src/services/suggestions/__tests__/supabaseSource.test.ts
- src/services/HealthDataCache.ts
- src/screens/HistorialScreen.tsx
constraints:
- No cambiar write-path (HealthProvider doble insert queda como deuda fase 2)
- No migrar ni borrar filas históricas duplicadas en dev
acceptance_criteria:
- datosRelojToSummary devuelve ULTIMO actividad_pasos por recorded_at, no suma (ej
  800->1200 da 1200)
- datosRelojToTrends usa MAX por día (ej 6000+6500 mismo día da 6500)
- Historial calcularResumen suma máximos diarios, no todas las filas
- HealthDataCache computeDailyAverages usa MAX para steps
- 'jest supabaseSource + rulesEngine: 44 passed'
- tsc --noEmit limpio
---

## Goal

Documentar fix del bug dev donde pasos se inflan con cada refresh (reloj 3470 vs vito 10977). Causa: actividad_pasos es contador acumulativo diario (HC COUNT_TOTAL) pero se SUMABA. Fix read-path: ULTIMO/MAX en vez de SUMA.

## Requirements

- datosRelojToSummary: steps = último por recorded_at (stepsTime), mantiene -1 sin datos
- datosRelojToTrends: stepsByDay = MAX por día
- HistorialScreen.calcularResumen: pasosPorDia MAP MAX por día, total = suma de máximos diarios
- HealthDataCache.computeDailyAverages: steps = MAX de snapshots
- Tests actualizados: pasos acumulativo + promedio por día con MAX

## Files in Scope

- `src/services/suggestions/supabaseMapper.ts`
- `src/services/suggestions/__tests__/supabaseSource.test.ts`
- `src/services/HealthDataCache.ts`
- `src/screens/HistorialScreen.tsx`

## Constraints

- No cambiar write-path (HealthProvider doble insert queda como deuda fase 2)
- No migrar ni borrar filas históricas duplicadas en dev

## Acceptance Criteria

- [ ] datosRelojToSummary devuelve ULTIMO actividad_pasos por recorded_at, no suma (ej 800->1200 da 1200)
- [ ] datosRelojToTrends usa MAX por día (ej 6000+6500 mismo día da 6500)
- [ ] Historial calcularResumen suma máximos diarios, no todas las filas
- [ ] HealthDataCache computeDailyAverages usa MAX para steps
- [ ] jest supabaseSource + rulesEngine: 44 passed
- [ ] tsc --noEmit limpio

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### jest sugerencias
```bash
npm test -- src/services/suggestions/__tests__/supabaseSource.test.ts src/services/suggestions/__tests__/rulesEngine.test.ts
```

Success: 44 passed · Timeout: 120s
### tsc limpio
```bash
npx tsc --noEmit
```

Success: sin errores · Timeout: 120s
