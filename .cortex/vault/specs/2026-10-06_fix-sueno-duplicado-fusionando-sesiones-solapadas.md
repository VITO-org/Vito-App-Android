---
schema_version: 1
doc_type: spec
title: fix sueño duplicado fusionando sesiones solapadas
created_at: '2026-10-06T01:40:35.479557Z'
updated_at: '2026-10-06T01:40:35.479557Z'
tags:
- spec
- bug
- sueño
- health-connect
- nativo
- scrum-207
status: draft
links: []
vault_scope: local
fingerprint: 1f442864d4481d18fcee9299513588c41e9141aeac0cbd6f1bad50ec8555da4c
verification_hooks:
- name: unit tests android
  command: cd android && ./gradlew :app:testDebugUnitTest --no-daemon
  required: true
  success_criteria: BUILD SUCCESSFUL + nuevo test de merge en verde
  timeout_seconds: 600
goal: 'Eliminar el doble conteo de sueño (app 9.1h vs reloj 4.54h, ratio 2x): fusionar
  intervalos solapados de SleepSessionRecord antes de sumar duraciones en HealthDataProvider.loadTodayData,
  con función pura y unit test.'
files_in_scope:
- android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt
constraints:
- No cambiar la ventana temporal (medianoche→ahora) en esta spec; solo la fusión
- No tocar FC/PA/SpO2/pasos del provider
- 'Calorías fuera de scope (descartadas: 1.3% = timing)'
acceptance_criteria:
- Sesiones solapadas/adyacentes se fusionan antes de sumar (caso 23:00-07:00 + 23:05-06:55
  da ~8h, no ~16h)
- Duplicados exactos colapsan en uno
- Sesiones disjuntas (noche + siesta) se siguen sumando
- Unit test nativo nuevo en verde
- Ratio app/reloj objetivo entre 0.9 y 1.1 a validar en físico
---

## Goal

Eliminar el doble conteo de sueño (app 9.1h vs reloj 4.54h, ratio 2x): fusionar intervalos solapados de SleepSessionRecord antes de sumar duraciones en HealthDataProvider.loadTodayData, con función pura y unit test.

## Requirements

- Función pura mergeSleepIntervals(sesiones): ordena por inicio, fusiona solapadas/adyacentes (tolerancia configurable, default 0-5 min), devuelve lista fusionada
- loadTodayData usa la fusión antes del sumOf de sleepMinutes
- Crear harness android/app/src/test + test con casos: duplicado exacto, solapada parcial, disjuntas, vacía
- Log de conteo antes/después para diagnóstico en APKBulid

## Files in Scope

- `android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt`

## Constraints

- No cambiar la ventana temporal (medianoche→ahora) en esta spec; solo la fusión
- No tocar FC/PA/SpO2/pasos del provider
- Calorías fuera de scope (descartadas: 1.3% = timing)

## Acceptance Criteria

- [ ] Sesiones solapadas/adyacentes se fusionan antes de sumar (caso 23:00-07:00 + 23:05-06:55 da ~8h, no ~16h)
- [ ] Duplicados exactos colapsan en uno
- [ ] Sesiones disjuntas (noche + siesta) se siguen sumando
- [ ] Unit test nativo nuevo en verde
- [ ] Ratio app/reloj objetivo entre 0.9 y 1.1 a validar en físico

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### unit tests android
```bash
cd android && ./gradlew :app:testDebugUnitTest --no-daemon
```

Success: BUILD SUCCESSFUL + nuevo test de merge en verde · Timeout: 600s
