---
schema_version: 1
doc_type: spec
title: Última Actividad dinámica + lastSync tracking + diagnóstico BP
created_at: '2026-06-12T16:52:58.038006Z'
updated_at: '2026-06-12T16:52:58.038006Z'
tags:
- spec
- dev-pruebas
- inicioscreen
- healthprovider
- healthdata
- hu-24
- hu-25
- hu-31
- diagnostico
status: draft
links: []
vault_scope: local
fingerprint: 3e6ca9427918535eff578bf761cd0378b176caec4a9d82554daa99675cda8dc8
verification_hooks: []
goal: Reemplazar datos mock en sección Última Actividad del dashboard por datos reales
  sincronizados, agregar tracking de lastSync, mejorar diagnóstico de presión arterial
  en módulo nativo, y actualizar historias de usuario afectadas
files_in_scope:
- src/screens/InicioScreen.tsx
- src/context/HealthProvider.tsx
- android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt
- android/app/src/main/java/com/vito/healthconnect/nativeModule/VitoHealthModule.kt
- .cortex/vault/hu/hu-24_integración-con-dispositivos-wearables.md
- .cortex/vault/hu/hu-25_sincronización-de-datos-de-salud.md
- .cortex/vault/hu/hu-31_visualizar-signos-vitales-en-un-dashboard.md
constraints:
- No romper funcionalidad existente de Health Connect sync
- La UI no debe bloquearse mientras se sincronizan datos
- El orden de las actividades debe reflejar el flujo real de sincronización
acceptance_criteria:
- InicioScreen muestra último horario de sincronización y datos reales del día en
  Última Actividad
- lastSync se actualiza en el contexto cada vez que HealthProvider completa una carga
  exitosa
- BP se busca en últimos 7 días además de hoy
- logcat muestra permisos concedidos y cantidad de registros BP encontrados
- HU-24, HU-25, HU-31 reflejan el progreso actual
---

## Goal

Reemplazar datos mock en sección Última Actividad del dashboard por datos reales sincronizados, agregar tracking de lastSync, mejorar diagnóstico de presión arterial en módulo nativo, y actualizar historias de usuario afectadas

## Requirements

- InicioScreen: sección 'Última Actividad' debe mostrar datos reales sincronizados (última sincronización, pasos, calorías, distancia, sueño, FC) en lugar de mock fijo
- HealthProvider: agregar lastSync timestamp al contexto que se actualice post-sincronización
- HealthDataProvider: expandir búsqueda de BP a últimos 7 días para tolerar delays de Health Sync
- HealthDataProvider: agregar logging diagnóstico para BP (cantidad de registros, valores, errores)
- VitoHealthModule: agregar logging de permisos concedidos vs requeridos
- Actualizar HU-24, HU-25, HU-31 con progreso reciente

## Files in Scope

- `src/screens/InicioScreen.tsx`
- `src/context/HealthProvider.tsx`
- `android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt`
- `android/app/src/main/java/com/vito/healthconnect/nativeModule/VitoHealthModule.kt`
- `.cortex/vault/hu/hu-24_integración-con-dispositivos-wearables.md`
- `.cortex/vault/hu/hu-25_sincronización-de-datos-de-salud.md`
- `.cortex/vault/hu/hu-31_visualizar-signos-vitales-en-un-dashboard.md`

## Constraints

- No romper funcionalidad existente de Health Connect sync
- La UI no debe bloquearse mientras se sincronizan datos
- El orden de las actividades debe reflejar el flujo real de sincronización

## Acceptance Criteria

- [ ] InicioScreen muestra último horario de sincronización y datos reales del día en Última Actividad
- [ ] lastSync se actualiza en el contexto cada vez que HealthProvider completa una carga exitosa
- [ ] BP se busca en últimos 7 días además de hoy
- [ ] logcat muestra permisos concedidos y cantidad de registros BP encontrados
- [ ] HU-24, HU-25, HU-31 reflejan el progreso actual

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

*(none declared — legacy spec; finish-session will skip verification)*
