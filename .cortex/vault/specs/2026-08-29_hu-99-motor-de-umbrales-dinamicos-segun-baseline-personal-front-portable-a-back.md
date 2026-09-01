---
schema_version: 1
doc_type: spec
title: 'HU-99: Motor de umbrales dinámicos según baseline personal (front, portable
  a back)'
created_at: '2026-08-29T23:33:19.717205Z'
updated_at: '2026-08-29T23:33:19.717205Z'
tags:
- spec
- HU-99
- umbrales-dinamicos
- baseline
- severidad
- front
status: draft
links: []
vault_scope: local
fingerprint: e12c2a1841d77e96b4982b323b98b5a6ecb1c329dbb0290478425903f69dcc32
verification_hooks:
- name: jest-dynamic-thresholds
  command: npx jest __tests__/dynamicThresholds.test.ts
  required: true
  success_criteria: all tests pass
  timeout_seconds: 120
- name: jest-full-suite
  command: npx jest
  required: true
  success_criteria: exit code 0, all suites pass
  timeout_seconds: 180
goal: Ajustar los umbrales de alerta según el comportamiento histórico (baseline HU-98)
  para reducir falsas alarmas sin perder sensibilidad. Implementado en front con funciones
  puras portables a back (Edge Function) en el futuro.
files_in_scope:
- src/services/alerts/types.ts
- src/services/alerts/detector.ts
- src/services/alerts/engine.ts
- src/services/alerts/personalized.ts
- __tests__/dynamicThresholds.test.ts
- __tests__/alerts.test.ts
- __tests__/personalized.test.ts
constraints:
- Implementacion 100% front (React Native + TS puro) para permitir migracion futura
  a Edge Function sin reescribir logica
- Las funciones de derivacion y clasificacion deben ser puras (sin I/O) para ser portables
  al back
- Mantener guardarriles HU-98 (jamás mas sensible que OMS)
- 'CAREFUL: CA-02 severidad leve/moderada/critica requiere diseno de banda leve —
  propuesta: banda pre-warning relativa al umbral efectivo (que ya deriva del baseline)'
acceptance_criteria:
- 'CA-01: Los umbrales de alerta se calculan a partir del baseline personal (HU-98)
  en lugar de valores fijos.'
- 'CA-02: El sistema diferencia entre desviacion leve, moderada y critica segun la
  distancia al baseline personal.'
- 'CA-03 (removido por usuario): Un medico puede sobrescribir los umbrales - NO SE
  IMPLEMENTA.'
- 'CA-04: Si el baseline no esta disponible o no es valido, los umbrales vuelven a
  los valores estandar OMS por condicion.'
---

## Goal

Ajustar los umbrales de alerta según el comportamiento histórico (baseline HU-98) para reducir falsas alarmas sin perder sensibilidad. Implementado en front con funciones puras portables a back (Edge Function) en el futuro.

## Requirements

- CA-01: usar resolveEffectiveThresholds (ya existente HU-98) como fuente unica de umbrales por paciente — verificar cobertura en engine para SpO2, BP y HR
- CA-02: agregar nivel 'leve' a AlertSeverity (INFO | leve | advertencia | critica) con banda pre-warning relativa al umbral de advertencia efectivo; mantener dedup por rango (nuevo alerta solo si rango estrictamente peor)
- CA-02: la banda leve debe ser configurable por metrica (Spo2: %2, HR: 5 lpm, PA: 5 mmHg) y parte de los tipos para ser portable a back
- CA-04: fallback a OMS ya existe en resolveEffectiveThresholds — validar con tests que sin baseline o con baseline invalido se usan los estandares
- DoD: tests comparativos dinámicos vs estáticos con datos simulados que demuestren reduccion de falsas alarmas
- DoD: mantener 136+ tests existentes pasando

## Files in Scope

- `src/services/alerts/types.ts`
- `src/services/alerts/detector.ts`
- `src/services/alerts/engine.ts`
- `src/services/alerts/personalized.ts`
- `__tests__/dynamicThresholds.test.ts`
- `__tests__/alerts.test.ts` (actualiza franja antigua: nivel 'leve' nuevo)
- `__tests__/personalized.test.ts` (actualiza toEqual: bandas leve en derivación)

## Constraints

- Implementacion 100% front (React Native + TS puro) para permitir migracion futura a Edge Function sin reescribir logica
- Las funciones de derivacion y clasificacion deben ser puras (sin I/O) para ser portables al back
- Mantener guardarriles HU-98 (jamás mas sensible que OMS)
- CAREFUL: CA-02 severidad leve/moderada/critica requiere diseno de banda leve — propuesta: banda pre-warning relativa al umbral efectivo (que ya deriva del baseline)

## Acceptance Criteria

- [ ] CA-01: Los umbrales de alerta se calculan a partir del baseline personal (HU-98) en lugar de valores fijos.
- [ ] CA-02: El sistema diferencia entre desviacion leve, moderada y critica segun la distancia al baseline personal.
- [ ] CA-03 (removido por usuario): Un medico puede sobrescribir los umbrales - NO SE IMPLEMENTA.
- [ ] CA-04: Si el baseline no esta disponible o no es valido, los umbrales vuelven a los valores estandar OMS por condicion.

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### jest-dynamic-thresholds
```bash
npx jest __tests__/dynamicThresholds.test.ts
```

Success: all tests pass · Timeout: 120s
### jest-full-suite
```bash
npx jest
```

Success: exit code 0, all suites pass · Timeout: 180s
