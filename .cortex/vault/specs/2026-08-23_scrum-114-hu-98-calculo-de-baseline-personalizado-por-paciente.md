---
schema_version: 1
doc_type: spec
title: 'Scrum 114 - HU-98: Cálculo de baseline personalizado por paciente'
created_at: '2026-08-23T20:45:47.459723Z'
updated_at: '2026-08-23T20:45:47.459723Z'
tags:
- spec
- scrum-114
- hu-98
- baseline
- personalizado
- estadisticas
- alertas
status: draft
links: []
vault_scope: local
fingerprint: 4bf149213fe75f955075a36f4ad2a4e60c1d0c39fd4f8660377bcc4b1675a7f8
verification_hooks:
- name: TypeScript compile
  command: npx tsc --noEmit
  required: true
  success_criteria: exit code 0
  timeout_seconds: 120
- name: Unit tests
  command: npx jest --passWithNoTests
  required: true
  success_criteria: exit code 0
  timeout_seconds: 120
- name: Android build
  command: ./gradlew assembleRelease
  required: true
  success_criteria: exit code 0
  timeout_seconds: 300
goal: Calcular los valores normales de cada paciente a partir de su historial, para
  detectar desviaciones individuales en lugar de comparar con rangos poblacionales
  genéricos. El sistema debe calcular baseline por paciente y métrica con mínimo 7
  días de historial, incluyendo media, desviación estándar y percentiles (P25, P75).
  Recálculo automático cada 7 días con fallback a rangos clínicos estándar.
files_in_scope:
- src/services/supabase/models.ts
- src/services/supabase/api.ts
- src/services/supabase/schema.sql
- src/services/alerts/detector.ts
- src/services/alerts/engine.ts
- src/context/HealthProvider.tsx
- scripts/migrations/
constraints:
- No sobrecarga el cliente — cálculo en servidor o background
- Respeta la estructura existente de baseline_clinico (HUR-21)
- Compatible con el sistema de alertas existente (HU-41, HU-42, HU-43)
- No rompe las alertas actuales que usan rangos fijos
- Mínimo 7 días de datos antes de calcular baseline personalizado
- Fallback siempre disponible como seguridad
acceptance_criteria:
- 'Algoritmo de cálculo de baseline implementado: media, desviación estándar, P25,
  P75 por métrica por paciente'
- Recálculo automático implementado con frecuencia de 7 días
- Fallback a rangos clínico estándar cuando no hay ≥7 días de historial
- Tabla baseline_personalizado creada con schema adecuado
- Tests unitarios del algoritmo de cálculo
- Tests del fallback con datos insuficientes
- Integración con HealthProvider para usar baseline personalizado en alertas
---

## Goal

Calcular los valores normales de cada paciente a partir de su historial, para detectar desviaciones individuales en lugar de comparar con rangos poblacionales genéricos. El sistema debe calcular baseline por paciente y métrica con mínimo 7 días de historial, incluyendo media, desviación estándar y percentiles (P25, P75). Recálculo automático cada 7 días con fallback a rangos clínicos estándar.

## Requirements

- El baseline se calcula por paciente y por métrica (FC, PA sistólica/diastólica, SpO2, temperatura) a partir de un mínimo de 7 días de historial
- El baseline incluye: media, desviación estándar y percentiles relevantes (P25, P75) por métrica
- El baseline se recalcula automáticamente cada 7 días cuando hay suficientes datos nuevos
- Si no hay suficiente historial (<7 días), el sistema usa el rango clínico estándar por condición como fallback
- Los datos baseline se almacenan en una tabla dedicada (baseline_personalizado) en Supabase
- El cálculo se ejecuta en el servidor (Supabase Edge Function o similar) para no sobrecarga el cliente

## Files in Scope

- `src/services/supabase/models.ts`
- `src/services/supabase/api.ts`
- `src/services/supabase/schema.sql`
- `src/services/alerts/detector.ts`
- `src/services/alerts/engine.ts`
- `src/context/HealthProvider.tsx`
- `scripts/migrations/`

## Constraints

- No sobrecarga el cliente — cálculo en servidor o background
- Respeta la estructura existente de baseline_clinico (HUR-21)
- Compatible con el sistema de alertas existente (HU-41, HU-42, HU-43)
- No rompe las alertas actuales que usan rangos fijos
- Mínimo 7 días de datos antes de calcular baseline personalizado
- Fallback siempre disponible como seguridad

## Acceptance Criteria

- [ ] Algoritmo de cálculo de baseline implementado: media, desviación estándar, P25, P75 por métrica por paciente
- [ ] Recálculo automático implementado con frecuencia de 7 días
- [ ] Fallback a rangos clínico estándar cuando no hay ≥7 días de historial
- [ ] Tabla baseline_personalizado creada con schema adecuado
- [ ] Tests unitarios del algoritmo de cálculo
- [ ] Tests del fallback con datos insuficientes
- [ ] Integración con HealthProvider para usar baseline personalizado en alertas

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### TypeScript compile
```bash
npx tsc --noEmit
```

Success: exit code 0 · Timeout: 120s
### Unit tests
```bash
npx jest --passWithNoTests
```

Success: exit code 0 · Timeout: 120s
### Android build
```bash
./gradlew assembleRelease
```

Success: exit code 0 · Timeout: 300s
