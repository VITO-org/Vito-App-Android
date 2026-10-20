---
schema_version: 1
doc_type: spec
title: fix sueño muestra -- por ventana que excluye sesión de anoche
created_at: '2026-10-10T19:20:15.754869Z'
updated_at: '2026-10-10T19:20:15.754869Z'
tags:
- spec
- spec
- bug
- sueño
- health-connect
- nativo
status: draft
links: []
vault_scope: local
fingerprint: fc25fecc411f4224b1f59cd7b6c2de2101fbd54b4e9a7b2f2e89a59d3a745c4b
verification_hooks:
- name: tsc
  command: npx tsc --noEmit
  required: true
  success_criteria: sin errores de tipos
  timeout_seconds: 300
goal: 'Corregir card de Sueño en "--": la ventana de lectura (medianoche→ahora) excluye
  la sesión de anoche que empieza el día anterior. Cambiar a ventana "última noche"
  (ayer 18:00→ahora) manteniendo merge/dedup y logs. Sin tocar pasos/distancia/calorías.'
files_in_scope:
- android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt
constraints:
- 'Continuar sobre rama fix/ui-fixes-dia (trae cambios de distancia sin commitear
  + PR #34)'
- No tocar lógica de pasos/distancia/calorías del provider
- No romper CI (tsc bloqueante)
- No cambiar el merge/dedup de SCRUM-207, solo la ventana de lectura
acceptance_criteria:
- La card de Sueño muestra las horas de anoche tras pull-to-refresh cuando HC contiene
  la sesión
- Si no hay sesión en la ventana, se mantiene '--' con log que confirma 0 sesiones
  (comportamiento correcto, no bug)
- tsc en verde
- Verificado en físico (Xiaomi) con logcat VitoHealth
---

## Goal

Corregir card de Sueño en "--": la ventana de lectura (medianoche→ahora) excluye la sesión de anoche que empieza el día anterior. Cambiar a ventana "última noche" (ayer 18:00→ahora) manteniendo merge/dedup y logs. Sin tocar pasos/distancia/calorías.

## Requirements

- Diagnóstico previo: confirmar en Health Connect que existe sesión de sueño de anoche (si Mi Fitness no la escribe, la ventana no es la causa)
- Ventana de SleepSessionRecord desde ayer 18:00 hasta ahora en loadTodayData
- Mantener mergeSleepIntervals/dedup de SCRUM-207 y tolerancia vigentes
- Logs de conteo de sesiones antes/después para diagnóstico en logcat
- Valor de UI (horas) se deriva del mismo summary.sleepMinutes sin cambios TS

## Files in Scope

- `android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt`

## Constraints

- Continuar sobre rama fix/ui-fixes-dia (trae cambios de distancia sin commitear + PR #34)
- No tocar lógica de pasos/distancia/calorías del provider
- No romper CI (tsc bloqueante)
- No cambiar el merge/dedup de SCRUM-207, solo la ventana de lectura

## Acceptance Criteria

- [ ] La card de Sueño muestra las horas de anoche tras pull-to-refresh cuando HC contiene la sesión
- [ ] Si no hay sesión en la ventana, se mantiene '--' con log que confirma 0 sesiones (comportamiento correcto, no bug)
- [ ] tsc en verde
- [ ] Verificado en físico (Xiaomi) con logcat VitoHealth

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### tsc
```bash
npx tsc --noEmit
```

Success: sin errores de tipos · Timeout: 300s
