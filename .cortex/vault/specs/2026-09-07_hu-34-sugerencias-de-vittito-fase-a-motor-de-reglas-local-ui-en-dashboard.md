---
schema_version: 1
doc_type: spec
title: 'HU-34 Sugerencias de Vittito fase A: motor de reglas local + UI en dashboard'
created_at: '2026-09-07T22:55:25.281103Z'
updated_at: '2026-09-07T22:55:25.281103Z'
tags:
- spec
- hu-34
- scrum-86
- fase-a
- vittito
- dashboard
status: draft
links: []
vault_scope: local
fingerprint: fda505a9e7fa5b60057d8dd3f23f6a7bc3cc8cb817e9d7a2cb8365c50eddaf38
verification_hooks:
- name: typecheck
  command: npx tsc --noEmit -p tsconfig.json
  required: true
  success_criteria: exit 0 sin errores de tipos
  timeout_seconds: 180
- name: unit-rules-engine
  command: npx jest src/services/suggestions/__tests__/rulesEngine.test.ts
  required: true
  success_criteria: 'todos los tests en verde: casos normal, limite y anomalos + ordenamiento'
  timeout_seconds: 300
- name: unit-supabase-mapper
  command: npx jest src/services/suggestions/__tests__/supabaseSource.test.ts
  required: true
  success_criteria: 'mapper puro datos_reloj a summary + fallback null en verde'
  timeout_seconds: 300
goal: 'Implementar HU-34 fase A: seccion de sugerencias de salud personalizadas de
  Vittito en el dashboard generadas por un motor de reglas local (sin IA ni LLM),
  con fuente primaria Supabase (datos_reloj 24h) y fallback a Health Connect,
  con interfaz SuggestionProvider que permita enchufar la fase C (LLM) despues.'
files_in_scope:
- src/services/suggestions/types.ts
- src/services/suggestions/rulesEngine.ts
- src/services/suggestions/storage.ts
- src/services/suggestions/supabaseMapper.ts
- src/services/suggestions/supabaseSource.ts
- src/services/suggestions/__tests__/rulesEngine.test.ts
- src/services/suggestions/__tests__/supabaseSource.test.ts
- src/components/SuggestionCard.tsx
- src/components/SuggestionDetailModal.tsx
- src/screens/InicioScreen.tsx
constraints:
- Compatibilidad Android 14+ (API 34+), stack React Native + TypeScript existente
- Fase A sin SDKs de LLM ni API keys de IA; se permite solo lectura Supabase a
  datos_reloj (via getDatosReloj) para la fuente primaria, sin escritura
- UI con componentes funcionales y StyleSheet; reutilizar theme (colors, spacing,
  fontSize) y patron de VitalSignCard
- El motor de reglas es funcion pura sincronica (sin red, sin AsyncStorage adentro)
  para ser testeable en jest sin mocks nativos; supabaseMapper.ts es tambien puro
  (solo tipos) y la red vive unicamente en supabaseSource.ts
- Umbrales por defecto documentados como pendientes de validacion clinica
acceptance_criteria:
- 'CA-01: la seccion de sugerencias se renderiza en InicioScreen debajo de la seccion
  de signos vitales'
- 'CA-02: las sugerencias se ordenan por prioridad descendente (Alta > Media > Baja),
  primero las asociadas a signos vitales fuera de rango'
- 'CA-03: cada tarjeta muestra icono representativo, titulo corto y etiqueta de prioridad
  Alta/Media/Baja'
- 'CA-04: al tocar una sugerencia se abre detalle con descripcion, motivo y acciones
  concretas recomendadas'
- 'CA-05: el usuario puede marcar Vista o Hecha y el estado persiste entre sesiones
  (AsyncStorage)'
- 'CA-06: las sugerencias se recalculan ante cambios en HealthSummary y como maximo
  una vez por dia se refresca el timestamp de generacion'
- 'CA-07: sin sugerencias activas se muestra ''Todo en orden, segui asi'' y la seccion
  ocupa su lugar'
- 'CA-08: la fuente primaria es Supabase datos_reloj 24h (via supabaseMapper +
  supabaseSource); si falla la red o no hay filas, fallback a Health Connect sin
  romper la UI'
---

## Goal

Implementar HU-34 fase A: seccion de sugerencias de salud personalizadas de Vittito en el dashboard generadas por un motor de reglas local (sin IA ni LLM), con fuente primaria Supabase (datos_reloj 24h) y fallback a Health Connect, con interfaz SuggestionProvider que permita enchufar la fase C (LLM) despues.

## Requirements

- R1 Motor de reglas: funcion pura getSuggestions(input: SuggestionInput): Suggestion[] que evalua HealthSummary (averageBpm, bloodPressureSystolic/Diastolic, spo2Percent, bodyTemperatureCelsius, steps, sleepMinutes) con umbrales por defecto (FC>100/<60, PA>=130/85, SpO2<95, temp>37.5/<36.0, pasos<5000, sueno<360min) y devuelve sugerencias tipadas {id, icon, titulo, prioridad Alta|Media|Baja, descripcion, motivo, acciones[]}
- R2 Ordenamiento: Alta > Media > Baja; dentro de igual prioridad, primero signos vitales fuera de rango; empate por id estable
- R3 Interfaz SuggestionProvider { getSuggestions(input): Suggestion[] }: RulesSuggestionProvider la implementa en fase A; LlmSuggestionProvider futura (fase C) la reutiliza sin tocar UI
- R4 UI seccion: en InicioScreen debajo de la seccion de signos vitales (linea ~220), lista de SuggestionCard con icono, titulo y etiqueta de prioridad; tap abre SuggestionDetailModal con descripcion, motivo y acciones
- R5 Acciones Vista/Hecha: storage.ts con AsyncStorage (keys vito:suggestions:seen/done + lastGenerated) e integracion en la seccion; Hecha oculta la sugerencia de la lista activa
- R6 Actualizacion: recalculo con useMemo ante cambios de summary de useHealth() y de remoteSummary Supabase; timestamp lastGenerated persistido, refresh de generacion como maximo diario
- R7 Estado vacio: sin sugerencias activas mostrar 'Todo en orden, segui asi'
- R8 Fuente Supabase (extension aprobada 2026-09-17): supabaseMapper.ts puro condensa datos_reloj 24h a HealthSummary (FC promedio, PA/SpO2/temp ultimo valor por recorded_at, pasos suma ventana, sueno ultimo horas_sueno*60, excluye reemplazado_por, null si sin senal); supabaseSource.ts loader con getDatosReloj(userId, {from 24h, limit 200}); InicioScreen usa effectiveSummary = remoteSummary ?? summary y refresca en pull-to-refresh

## Files in Scope

- `src/services/suggestions/types.ts`
- `src/services/suggestions/rulesEngine.ts`
- `src/services/suggestions/storage.ts`
- `src/services/suggestions/supabaseMapper.ts`
- `src/services/suggestions/supabaseSource.ts`
- `src/services/suggestions/__tests__/rulesEngine.test.ts`
- `src/services/suggestions/__tests__/supabaseSource.test.ts`
- `src/components/SuggestionCard.tsx`
- `src/components/SuggestionDetailModal.tsx`
- `src/screens/InicioScreen.tsx`

## Constraints

- Compatibilidad Android 14+ (API 34+), stack React Native + TypeScript existente
- Fase A sin SDKs de LLM ni API keys de IA; se permite solo lectura Supabase a datos_reloj para la fuente primaria, sin escritura
- UI con componentes funcionales y StyleSheet; reutilizar theme (colors, spacing, fontSize) y patron de VitalSignCard
- El motor de reglas es funcion pura sincronica (sin red, sin AsyncStorage adentro) para ser testeable en jest sin mocks nativos; supabaseMapper.ts es tambien puro y la red vive unicamente en supabaseSource.ts
- Umbrales por defecto documentados como pendientes de validacion clinica

## Acceptance Criteria

- [ ] CA-01: la seccion de sugerencias se renderiza en InicioScreen debajo de la seccion de signos vitales
- [ ] CA-02: las sugerencias se ordenan por prioridad descendente (Alta > Media > Baja), primero las asociadas a signos vitales fuera de rango
- [ ] CA-03: cada tarjeta muestra icono representativo, titulo corto y etiqueta de prioridad Alta/Media/Baja
- [ ] CA-04: al tocar una sugerencia se abre detalle con descripcion, motivo y acciones concretas recomendadas
- [ ] CA-05: el usuario puede marcar Vista o Hecha y el estado persiste entre sesiones (AsyncStorage)
- [ ] CA-06: las sugerencias se recalculan ante cambios en HealthSummary y como maximo una vez por dia se refresca el timestamp de generacion
- [ ] CA-07: sin sugerencias activas se muestra 'Todo en orden, segui asi' y la seccion ocupa su lugar
- [ ] CA-08: la fuente primaria es Supabase datos_reloj 24h; si falla la red o no hay filas, fallback a Health Connect sin romper la UI

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### typecheck
```bash
npx tsc --noEmit -p tsconfig.json
```

Success: exit 0 sin errores de tipos · Timeout: 180s
### unit-rules-engine
```bash
npx jest src/services/suggestions/__tests__/rulesEngine.test.ts
```

Success: todos los tests en verde: casos normal, limite y anomalos + ordenamiento · Timeout: 300s
### unit-supabase-mapper
```bash
npx jest src/services/suggestions/__tests__/supabaseSource.test.ts
```

Success: mapper puro datos_reloj→summary + fallback null en verde · Timeout: 300s
