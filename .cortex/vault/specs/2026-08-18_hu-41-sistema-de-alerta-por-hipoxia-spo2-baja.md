---
schema_version: 1
doc_type: spec
title: 'HU-41: Sistema de Alerta por Hipoxia (SpO₂ baja)'
created_at: '2026-08-18T14:23:33.637267Z'
updated_at: '2026-08-18T14:23:33.637267Z'
tags:
- spec
- epica-4-alertas-inteligentes
- hu-41-hipoxia
- spo2
- thresholds
- escalation
status: draft
links: []
vault_scope: local
fingerprint: e941eced11044475f9ef0a5010691ea24ea728ba683ff80e98b6def458951114
verification_hooks:
- name: unit-tests-vitals
  command: npx jest --testPathPattern='vitals|alert|hipoxia' --coverage --coverageDirectory=coverage-hu41
  required: true
  success_criteria: All tests pass and coverage ≥80% on alert module
  timeout_seconds: 120
- name: typescript-check
  command: npx tsc --noEmit
  required: true
  success_criteria: No TypeScript errors
  timeout_seconds: 60
- name: lint-check
  command: npx eslint src/services/vitals.ts src/services/alerts/ --max-warnings=0
  required: true
  success_criteria: No lint errors in alert module
  timeout_seconds: 60
goal: Implementar el módulo de detección de hipoxia que genera alertas inmediatas
  cuando la saturación de oxígeno del usuario cae por debajo del umbral configurado,
  con clasificación de severidad y escalamiento automático por falta de confirmación.
files_in_scope:
- src/services/vitals.ts
- src/services/healthSync.ts
- src/context/HealthProvider.tsx
- src/types/health.ts
- src/screens/AlertasScreen.tsx
- src/navigation/BottomTabNavigator.tsx
- src/services/supabase/models.ts
- src/services/supabase/api.ts
- src/services/supabase/schema.sql
- android/app/src/main/java/com/vito/healthconnect/nativeModule/
constraints:
- El sistema debe evaluarse cada vez que Health Connect entrega un nuevo dato de SpO₂
- La detección debe ser local (en-device) para cumplir el SLA de ≤30 segundos
- Los umbrales por defecto son <90% (advertencia) y <85% (crítica), pero deben ser
  personalizables por usuario
- El escalamiento requiere integración con contactos de confianza (HU-16) y notificaciones
  push (HU-51)
- No duplicar alertas si la condición persiste sin recuperación
acceptance_criteria:
- Lógica de detección de hipoxia implementada y testeada con datos reales e históricos
- Pruebas unitarias con cobertura ≥80% sobre el módulo de umbral
- Notificación entregada en ≤30 s en pruebas de carga (50 usuarios simultáneos)
- Flujo de escalamiento validado end-to-end en entorno de staging
- Documentación técnica del módulo actualizada
---

## Goal

Implementar el módulo de detección de hipoxia que genera alertas inmediatas cuando la saturación de oxígeno del usuario cae por debajo del umbral configurado, con clasificación de severidad y escalamiento automático por falta de confirmación.

## Requirements

- CA-01: Detectar SpO₂ por debajo del umbral personalizado del usuario (por defecto: <90%)
- CA-02: Generar alerta en ≤30 segundos desde la lectura anómala
- CA-03: La alerta indica: valor registrado, umbral configurado, hora y dispositivo de origen
- CA-04: Clasificar con nivel de severidad (advertencia / crítica) según profundidad del descenso
- CA-05: Si no hay confirmación en 5 minutos, escalar al responsable de guardia

## Files in Scope

- `src/services/vitals.ts`
- `src/services/healthSync.ts`
- `src/context/HealthProvider.tsx`
- `src/types/health.ts`
- `src/screens/AlertasScreen.tsx`
- `src/navigation/BottomTabNavigator.tsx`
- `src/services/supabase/models.ts`
- `src/services/supabase/api.ts`
- `src/services/supabase/schema.sql`
- `android/app/src/main/java/com/vito/healthconnect/nativeModule/`

## Constraints

- El sistema debe evaluarse cada vez que Health Connect entrega un nuevo dato de SpO₂
- La detección debe ser local (en-device) para cumplir el SLA de ≤30 segundos
- Los umbrales por defecto son <90% (advertencia) y <85% (crítica), pero deben ser personalizables por usuario
- El escalamiento requiere integración con contactos de confianza (HU-16) y notificaciones push (HU-51)
- No duplicar alertas si la condición persiste sin recuperación

## Acceptance Criteria

- [ ] Lógica de detección de hipoxia implementada y testeada con datos reales e históricos
- [ ] Pruebas unitarias con cobertura ≥80% sobre el módulo de umbral
- [ ] Notificación entregada en ≤30 s en pruebas de carga (50 usuarios simultáneos)
- [ ] Flujo de escalamiento validado end-to-end en entorno de staging
- [ ] Documentación técnica del módulo actualizada

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### unit-tests-vitals
```bash
npx jest --testPathPattern='vitals|alert|hipoxia' --coverage --coverageDirectory=coverage-hu41
```

Success: All tests pass and coverage ≥80% on alert module · Timeout: 120s
### typescript-check
```bash
npx tsc --noEmit
```

Success: No TypeScript errors · Timeout: 60s
### lint-check
```bash
npx eslint src/services/vitals.ts src/services/alerts/ --max-warnings=0
```

Success: No lint errors in alert module · Timeout: 60s
