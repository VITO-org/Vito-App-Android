---
schema_version: 1
doc_type: spec
title: 'Scrum 84 - HU 21: Registro de Datos Clinicos Iniciales'
created_at: '2026-08-18T19:45:31.941949Z'
updated_at: '2026-08-18T19:45:31.941949Z'
tags:
- spec
- scrum-84
- hu-21
- baseline-clinico
- signos-vitales
- registro
- tasks-required
status: draft
links: []
vault_scope: local
fingerprint: eb6d6e4852263e40bde0d091379deb64210296962fba74e1078cea7cb398913a
verification_hooks:
- name: TypeScript compilation
  command: npx tsc --noEmit
  required: true
  success_criteria: No type errors
  timeout_seconds: 120
- name: Lint check
  command: npx eslint src/screens/CompleteProfileScreen.tsx --max-warnings 0
  required: true
  success_criteria: No lint errors
  timeout_seconds: 60
goal: Modificar la pantalla CompleteProfileScreen para agregar una seccion de registro
  de signos vitales iniciales (presion arterial sistolica/diastolica, frecuencia cardiaca,
  temperatura y oxigenacion) despues del registro, validando rangos fisiologicos y
  persistiendo los datos en la tabla baseline_clinico existente.
files_in_scope:
- src/screens/CompleteProfileScreen.tsx
- src/services/supabase/api.ts
constraints:
- La tabla baseline_clinico ya existe en Supabase - usar la estructura existente (hr_min,
  hr_max, bp_sist_min, bp_sist_max, bp_diast_min, bp_diast_max, spo2_min, temp_min,
  temp_max)
- Mantener compatibilidad con el flujo de registro existente
- Los campos de signos vitales son opcionales para no bloquear el registro
- Usar el tema de colores y componentes existentes (Card, PrimaryButton, etc.)
- 'Rangos fisiologicos: Presion arterial sistolica 60-300 mmHg, diastolica 30-200
  mmHg, Frecuencia cardiaca 30-250 bpm, Temperatura 30-45 C, Oxigenacion 50-100 %'
- Los valores individuales se persisten como min=max en baseline_clinico (el baseline
  inicial es un solo punto de medicion)
acceptance_criteria:
- El formulario muestra todos los campos de signos vitales y permite guardarlos
- Los valores fuera de rango fisiologico muestran error descriptivo
- Los datos persisten vinculados al perfil del usuario en baseline_clinico
- Las pruebas cubren valores validos, valores limite y valores fuera de rango para
  cada campo
- La pantalla mantiene la UX existente y es consistente con el diseno actual
---

## Goal

Modificar la pantalla CompleteProfileScreen para agregar una seccion de registro de signos vitales iniciales (presion arterial sistolica/diastolica, frecuencia cardiaca, temperatura y oxigenacion) despues del registro, validando rangos fisiologicos y persistiendo los datos en la tabla baseline_clinico existente.

## Requirements

- CA-01: El usuario puede registrar presion arterial (sistolica y diastolica), frecuencia cardiaca, temperatura y oxigenacion
- CA-02: El sistema valida rangos fisiologicos plausibles para cada campo
- CA-03: Los datos quedan asociados al perfil clinico del usuario en tabla baseline_clinico
- CA-04: Los campos de signos vitales son opcionales (el usuario puede omitir esta seccion y completar el perfil solo con datos personales)
- CA-05: Se muestran mensajes de error descriptivos para valores fuera de rango

## Files in Scope

- `src/screens/CompleteProfileScreen.tsx`
- `src/services/supabase/api.ts`

## Constraints

- La tabla baseline_clinico ya existe en Supabase - usar la estructura existente (hr_min, hr_max, bp_sist_min, bp_sist_max, bp_diast_min, bp_diast_max, spo2_min, temp_min, temp_max)
- Mantener compatibilidad con el flujo de registro existente
- Los campos de signos vitales son opcionales para no bloquear el registro
- Usar el tema de colores y componentes existentes (Card, PrimaryButton, etc.)
- Rangos fisiologicos: Presion arterial sistolica 60-300 mmHg, diastolica 30-200 mmHg, Frecuencia cardiaca 30-250 bpm, Temperatura 30-45 C, Oxigenacion 50-100 %
- Los valores individuales se persisten como min=max en baseline_clinico (el baseline inicial es un solo punto de medicion)

## Acceptance Criteria

- [ ] El formulario muestra todos los campos de signos vitales y permite guardarlos
- [ ] Los valores fuera de rango fisiologico muestran error descriptivo
- [ ] Los datos persisten vinculados al perfil del usuario en baseline_clinico
- [ ] Las pruebas cubren valores validos, valores limite y valores fuera de rango para cada campo
- [ ] La pantalla mantiene la UX existente y es consistente con el diseno actual

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### TypeScript compilation
```bash
npx tsc --noEmit
```

Success: No type errors · Timeout: 120s
### Lint check
```bash
npx eslint src/screens/CompleteProfileScreen.tsx --max-warnings 0
```

Success: No lint errors · Timeout: 60s
