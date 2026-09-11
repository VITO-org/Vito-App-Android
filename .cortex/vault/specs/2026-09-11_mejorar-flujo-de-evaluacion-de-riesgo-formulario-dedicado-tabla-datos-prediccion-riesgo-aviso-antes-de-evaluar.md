---
schema_version: 1
doc_type: spec
title: 'Mejorar flujo de evaluación de riesgo: formulario dedicado + tabla datos_prediccion_riesgo
  + aviso antes de evaluar'
created_at: '2026-09-11T19:39:32.958313Z'
updated_at: '2026-09-11T19:39:32.958313Z'
tags:
- spec
- hu-91
- ml
- prediccion-riesgo
- forms
- vito-prediction
status: draft
links: []
vault_scope: local
fingerprint: af33377307ab236b818afea76f6ad5df0e84856931d152b2793214137464269e
verification_hooks:
- name: tsc
  command: npx tsc --noEmit
  required: true
  success_criteria: exit code 0
  timeout_seconds: 60
- name: jest
  command: npx jest --passWithNoTests
  required: true
  success_criteria: exit code 0
  timeout_seconds: 120
goal: Cambiar el flujo de evaluación de riesgo cardiovascular (HU-91) para que en
  vez de imputar valores por defecto en silencio, avise al usuario qué campos faltan
  y lo lleve a completarlos en un formulario dedicado, sin tocar el flujo de registro/login/resto
  de la app. Guardar los datos ML en una tabla nueva datos_prediccion_riesgo.
files_in_scope:
- src/screens/PrediccionRiesgoScreen.tsx
- src/screens/DatosPrediccionScreen.tsx
- src/services/prediccionRiesgo.ts
- src/services/supabase/api.ts
- src/services/supabase/models.ts
- src/navigation/RootNavigator.tsx
- src/services/supabase/schema.sql
- __tests__/prediccionRiesgo.test.ts
constraints: []
acceptance_criteria:
- 'AC-01: Pantalla de formulación aparece accesible desde PrediccionRiesgoScreen cuando
  faltan campos'
- 'AC-02: Al guardar el formulario, se crea/actualiza la fila en datos_prediccion_riesgo
  y al volver a evaluar, la evaluación se ejecuta con esos datos'
- 'AC-03: Si el usuario YA tiene todos los campos, el botón evalúa directo sin pasar
  por el formulario (sin regresión del flujo actual)'
- 'AC-04: Los campos del formulario son: peso, altura (→ BMI), presión sistólica,
  diastólica, colesterol (normal/alto/muy alto), diabetes, tabaquismo, alcohol. Sexo
  y edad NO se piden (se toman del perfil)'
- 'AC-05: buildPredictionPayload usa datos_prediccion_riesgo como fuente primaria;
  fallback a defaults SOLO si la fila no existe'
- 'AC-06: tsc --noEmit 0 errores'
- 'AC-07: jest 197+ tests (los 197 existentes pasan + los nuevos pasan)'
- 'AC-08: Cero cambios en: CompleteProfileScreen, LoginScreen, DashboardScreen, alertas,
  contactos, Health Connect'
- 'AC-09: RegisterScreen y login intactos (sin regression)'
---

## Goal

Cambiar el flujo de evaluación de riesgo cardiovascular (HU-91) para que en vez de imputar valores por defecto en silencio, avise al usuario qué campos faltan y lo lleve a completarlos en un formulario dedicado, sin tocar el flujo de registro/login/resto de la app. Guardar los datos ML en una tabla nueva datos_prediccion_riesgo.

## Requirements

- CA-01: Crear tabla datos_prediccion_riesgo en Supabase (1 fila por usuario, PK id_usuario, columnas: age, sex_male, bmi, bp_sistolica, bp_diastolica, cholesterol_ord, diabetes, smoking, alcohol, active, updated_at) con RLS y upsert
- CA-02: Crear pantalla DatosPrediccionScreen (formulario dedicado) con campos: peso/altura (calcular BMI), presión sistólica/diastólica, colesterol ordinal (normal/alto/muy alto), diabetes, tabaquismo, consumo de alcohol. Edita datos_prediccion_riesgo. Sexo y edad se toman del perfil existente sin pedir de nuevo
- CA-03: Modificar PrediccionRiesgoScreen: antes de evaluar, leer datos_prediccion_riesgo + perfil. Si falta algún campo crítico → NO llamar a la Edge Function; mostrar aviso con lista de campos faltantes y botón 'Completar mis datos' que navega a DatosPrediccionScreen
- CA-04: Si el usuario YA tiene todos los campos completos → evaluar normalmente. buildPredictionPayload usa datos_prediccion_riesgo como fuente de verdad (fallback a defaults SOLO si la fila no existe aún). Quitar la imputación silenciosa actual (el array imputados[]) y reemplazarlo por la validación previa
- CA-05: Actualizar api.ts con helpers CRUD para datos_prediccion_riesgo (get, upsert). Mantener factores_riesgo_cardiaco y perfil_usuario intactos (no se modifican ni borran en este cambio)
- CA-06: Registrar DatosPrediccionScreen en RootNavigator con animación slide_from_right. Agregar ruta y tipo al RootStackParamList
- CA-07: Tests: al menos 4 tests para la función de validación de campos faltantes (faltan todos, faltan algunos, todos presentes, solo colesterol faltante)
- REQ-01: Cero impacto en: CompleteProfileScreen, LoginScreen, RegisterScreen, DashboardScreen, alertas, contactos, Health Connect. No se modifican tablas existentes
- REQ-02: La tabla datos_prediccion_riesgo tiene upsert por id_usuario (un usuario tiene 1 fila máxima). Si la fila no existe, se crea al guardar el formulario
- REQ-03: Deployment: apply schema.sql de la tabla nueva a vito-db-staging + verificar con SELECT. No requiere re-deploy de la Edge Function si se actualiza solo el buildPredictionPayload del lado de la app

## Files in Scope

- `src/screens/PrediccionRiesgoScreen.tsx`
- `src/screens/DatosPrediccionScreen.tsx`
- `src/services/prediccionRiesgo.ts`
- `src/services/supabase/api.ts`
- `src/services/supabase/models.ts`
- `src/navigation/RootNavigator.tsx`
- `src/services/supabase/schema.sql`
- `__tests__/prediccionRiesgo.test.ts`

## Constraints

(none)

## Acceptance Criteria

- [ ] AC-01: Pantalla de formulación aparece accesible desde PrediccionRiesgoScreen cuando faltan campos
- [ ] AC-02: Al guardar el formulario, se crea/actualiza la fila en datos_prediccion_riesgo y al volver a evaluar, la evaluación se ejecuta con esos datos
- [ ] AC-03: Si el usuario YA tiene todos los campos, el botón evalúa directo sin pasar por el formulario (sin regresión del flujo actual)
- [ ] AC-04: Los campos del formulario son: peso, altura (→ BMI), presión sistólica, diastólica, colesterol (normal/alto/muy alto), diabetes, tabaquismo, alcohol. Sexo y edad NO se piden (se toman del perfil)
- [ ] AC-05: buildPredictionPayload usa datos_prediccion_riesgo como fuente primaria; fallback a defaults SOLO si la fila no existe
- [ ] AC-06: tsc --noEmit 0 errores
- [ ] AC-07: jest 197+ tests (los 197 existentes pasan + los nuevos pasan)
- [ ] AC-08: Cero cambios en: CompleteProfileScreen, LoginScreen, DashboardScreen, alertas, contactos, Health Connect
- [ ] AC-09: RegisterScreen y login intactos (sin regression)

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### tsc
```bash
npx tsc --noEmit
```

Success: exit code 0 · Timeout: 60s
### jest
```bash
npx jest --passWithNoTests
```

Success: exit code 0 · Timeout: 120s
