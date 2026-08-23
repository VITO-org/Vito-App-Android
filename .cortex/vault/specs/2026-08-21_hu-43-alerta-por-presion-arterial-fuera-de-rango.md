---
schema_version: 1
doc_type: spec
title: 'HU-43: Alerta por presión arterial fuera de rango'
created_at: '2026-08-21T20:48:41.827905Z'
updated_at: '2026-08-21T20:48:41.827905Z'
tags:
- spec
- hu-43
- alertas
- presion-arterial
- hipertension
- hipotension
- detector
- engine
- contextos-especiales
status: draft
links: []
vault_scope: local
fingerprint: 273753e70c2a0e690b70d972d0978308f31264536427b32330c18bc046122311
verification_hooks:
- name: TypeScript compilation
  command: npx tsc --noEmit
  required: true
  success_criteria: exit code 0, no type errors
  timeout_seconds: 120
- name: Alert tests
  command: npx jest __tests__/alerts.test.ts --verbose
  required: true
  success_criteria: all tests pass
  timeout_seconds: 120
goal: Implementar el módulo de detección de presión arterial fuera de rango que genera
  alertas cuando la presión sistólica o diastólica del usuario sale de su rango seguro
  personalizado, con soporte para contextos especiales (post-medicación, reposo nocturno)
  y alerta combinada cuando ambos valores están fuera de rango.
files_in_scope:
- src/services/alerts/types.ts
- src/services/alerts/detector.ts
- src/services/alerts/engine.ts
- src/services/alerts/index.ts
- src/services/supabase/models.ts
- src/services/supabase/api.ts
- src/context/HealthProvider.tsx
- src/screens/AlertasScreen.tsx
- src/services/vitals.ts
- __tests__/alerts.test.ts
constraints:
- Reutilizar la infraestructura existente del AlertEngine (persistencia, escalación,
  cache). No crear clase separada.
- Los defaults OMS se usan cuando no hay baseline_clinico configurado para el usuario.
- El campo tipo de la tabla alerta acepta los nuevos valores hipertension/hipotension
  (es varchar, no enum).
- La lógica de detección pura (evaluateBp) no tiene side effects — es testeable aislada.
- Los contextos especiales se persisten en la BD para que sobrevivan reinicios de
  app.
- Mantener compatibilidad con el motor de SpO2 existente (no romper evaluateSpo2Reading).
acceptance_criteria:
- 'evaluateBp() retorna BpDetectionResult correcto para: normal, solo sistólica alta,
  solo diastólica alta, ambas altas (combinada), solo sistólica baja, solo diastólica
  baja, ambas bajas.'
- La alerta combinada (CA-05) tiene severidad = max(sistólica, diastólica) y titulo/mensaje
  que menciona ambos valores.
- Los contextos especiales (post-medicación, reposo nocturno) aplican umbrales diferentes
  correctamente.
- evaluateBpReading() en AlertEngine genera alertas en tabla alerta con tipo hipertension
  o hipotension.
- HealthProvider llama evaluateBpReading() en cada sync cycle cuando hay datos de
  BP.
- AlertasScreen muestra las nuevas alertas de BP correctamente.
- 'Dedup funciona: no genera alerta duplicada si la lectura anterior ya generó alerta
  del mismo tipo.'
- Escalación por timeout funciona igual que para SpO2.
- Tests pasan al 100%.
- TypeScript compilation sin errores nuevos.
---

## Goal

Implementar el módulo de detección de presión arterial fuera de rango que genera alertas cuando la presión sistólica o diastólica del usuario sale de su rango seguro personalizado, con soporte para contextos especiales (post-medicación, reposo nocturno) y alerta combinada cuando ambos valores están fuera de rango.

## Requirements

- CA-01: Evaluar de forma independiente la presión sistólica y la diastólica contra el perfil del usuario (baseline_clinico) con defaults OMS.
- CA-02: Generar alertas diferenciadas: hipertensión (valores elevados) e hipotensión (valores bajos).
- CA-03: La alerta muestra: valor medido, rango esperado, diferencial y hora de medición.
- CA-04: Soportar umbrales distintos para contextos especiales (post-medicación, reposo nocturno) via configuración del perfil.
- CA-05: Si ambos valores están fuera de rango, emitir una sola alerta combinada de mayor severidad.
- Agregar tipos BP a AlertType: hipertension y hipotension.
- Crear BpThresholds con rangos sistólicos/diastólicos (normal, warning, critical) para cada contexto.
- Crear evaluateBp() función pura en detector.ts que retorne BpDetectionResult con evaluación independiente + combinada.
- Agregar evaluateBpReading() al AlertEngine como nuevo entry point.
- HealthProvider.tsx: llamar evaluateBpReading() después de syncWearableToBackend() cuando bp_sistolica/bp_diastolica estén disponibles.
- Configurar defaults OMS: sistólica normal 90-120, diastólica normal 60-80; hipertensión sistólica ≥140 o diastólica ≥90; hipotensión sistólica <90 o diastólica <60.
- Mecanismo de contexto especial: tabla nueva contexto_alerta_usuario o campo JSONB en preferencia_notificacion para guardar override de umbrales por contexto.
- Tests: cobertura ≥80% sobre evaluateBp, evaluación independiente, alerta combinada, dedup, contextos.

## Files in Scope

- `src/services/alerts/types.ts`
- `src/services/alerts/detector.ts`
- `src/services/alerts/engine.ts`
- `src/services/alerts/index.ts`
- `src/services/supabase/models.ts`
- `src/services/supabase/api.ts`
- `src/context/HealthProvider.tsx`
- `src/screens/AlertasScreen.tsx`
- `src/services/vitals.ts`
- `__tests__/alerts.test.ts`

## Constraints

- Reutilizar la infraestructura existente del AlertEngine (persistencia, escalación, cache). No crear clase separada.
- Los defaults OMS se usan cuando no hay baseline_clinico configurado para el usuario.
- El campo tipo de la tabla alerta acepta los nuevos valores hipertension/hipotension (es varchar, no enum).
- La lógica de detección pura (evaluateBp) no tiene side effects — es testeable aislada.
- Los contextos especiales se persisten en la BD para que sobrevivan reinicios de app.
- Mantener compatibilidad con el motor de SpO2 existente (no romper evaluateSpo2Reading).

## Acceptance Criteria

- [ ] evaluateBp() retorna BpDetectionResult correcto para: normal, solo sistólica alta, solo diastólica alta, ambas altas (combinada), solo sistólica baja, solo diastólica baja, ambas bajas.
- [ ] La alerta combinada (CA-05) tiene severidad = max(sistólica, diastólica) y titulo/mensaje que menciona ambos valores.
- [ ] Los contextos especiales (post-medicación, reposo nocturno) aplican umbrales diferentes correctamente.
- [ ] evaluateBpReading() en AlertEngine genera alertas en tabla alerta con tipo hipertension o hipotension.
- [ ] HealthProvider llama evaluateBpReading() en cada sync cycle cuando hay datos de BP.
- [ ] AlertasScreen muestra las nuevas alertas de BP correctamente.
- [ ] Dedup funciona: no genera alerta duplicada si la lectura anterior ya generó alerta del mismo tipo.
- [ ] Escalación por timeout funciona igual que para SpO2.
- [ ] Tests pasan al 100%.
- [ ] TypeScript compilation sin errores nuevos.

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### TypeScript compilation
```bash
npx tsc --noEmit
```

Success: exit code 0, no type errors · Timeout: 120s
### Alert tests
```bash
npx jest __tests__/alerts.test.ts --verbose
```

Success: all tests pass · Timeout: 120s
