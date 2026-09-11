---
schema_version: 1
doc_type: session
title: 'Mejorar flujo de evaluación de riesgo: formulario dedicado + tabla datos_prediccion_riesgo
  + aviso antes de evaluar'
created_at: '2026-09-11T21:02:18.376818Z'
updated_at: '2026-09-11T21:02:18.376818Z'
tags:
- session
- session
- with-checkpoints
- auto-draft
status: completed
links: []
vault_scope: local
fingerprint: c3237c6614019c57feae72205f16a40c05ce0d844687e8ece22500341642b66b
session_id: e46ebba8749f
pr: null
branch: null
commit: null
cortex_telemetry: null
---

## Original Specification

Cambiar el flujo de evaluación de riesgo cardiovascular (HU-91) para que en vez de imputar valores por defecto en silencio, avise al usuario qué campos faltan y lo lleve a completarlos en un formulario dedicado, sin tocar el flujo de registro/login/resto de la app. Guardar los datos ML en una tabla nueva datos_prediccion_riesgo.

## Changes Made

- added: .cortex/vault/designs/2026-09-11_mejorar-flujo-de-evaluacion-de-riesgo-formulario-dedicado-tabla-datos-prediccion-riesgo-aviso-antes-de-evaluar.md
- added: .cortex/vault/specs/2026-09-11_mejorar-flujo-de-evaluacion-de-riesgo-formulario-dedicado-tabla-datos-prediccion-riesgo-aviso-antes-de-evaluar.md
- modified: __tests__/prediccionRiesgo.test.ts
- modified: src/navigation/RootNavigator.tsx
- added: src/screens/DatosPrediccionScreen.tsx
- modified: src/screens/PrediccionRiesgoScreen.tsx
- modified: src/services/prediccionRiesgo.ts
- modified: src/services/supabase/api.ts
- modified: src/services/supabase/models.ts
- modified: src/services/supabase/schema.sql
- modified: supabase/functions/prediccion-riesgo/index.ts

## Files Touched

- `✓ .cortex/vault/designs/2026-09-11_mejorar-flujo-de-evaluacion-de-riesgo-formulario-dedicado-tabla-datos-prediccion-riesgo-aviso-antes-de-evaluar.md`
- `✓ .cortex/vault/specs/2026-09-11_mejorar-flujo-de-evaluacion-de-riesgo-formulario-dedicado-tabla-datos-prediccion-riesgo-aviso-antes-de-evaluar.md`
- `✓ __tests__/prediccionRiesgo.test.ts`
- `✓ src/navigation/RootNavigator.tsx`
- `✓ src/screens/DatosPrediccionScreen.tsx`
- `✓ src/screens/PrediccionRiesgoScreen.tsx`
- `✓ src/services/prediccionRiesgo.ts`
- `✓ src/services/supabase/api.ts`
- `✓ src/services/supabase/models.ts`
- `✓ src/services/supabase/schema.sql`
- `✓ supabase/functions/prediccion-riesgo/index.ts`
- `◌ src/screens/CompleteProfileScreen.tsx`
- `◌ Vito-app-release-test.apk`

## Key Decisions

- documenter: mapa completo del flujo de evaluacion actual. La imputacion silenciosa esta en buildPredictionPayload (DEFAULTS). Para la propuesta A: crear tabla datos_prediccion_riesgo (1 fila/usuario), pantalla DatosPrediccionScreen, validacion previa en PrediccionRiesgoScreen que reemplaza el aviso post-hoc de imputados. Factores_riesgo_cardiaco y perfil_usuario se mantienen intactos.
- documenter: checkpoint corregido — CompleteProfileScreen.tsx NO es parte del scope (solo se uso como referencia read-only del patron de formulario; NO se modifica). Mapa completo del flujo de evaluacion actual: imputacion silenciosa en buildPredictionPayload (DEFAULTS). Para la propuesta A: tabla nueva datos_prediccion_riesgo + pantalla DatosPrediccionScreen + validacion previa en PrediccionRiesgoScreen.
- documenter: design note aprobado (vault/designs/<session_id>.md). Arquitectura: tabla nueva datos_prediccion_riesgo (1 fila/usuario, PK id_usuario, 10 features declaradas), pantalla DatosPrediccionScreen con upsert, validacion previa en PrediccionRiesgoScreen (lista de faltantes + navegacion), buildPredictionPayload con prioridad a la fila declarada y DEFAULTS solo como red de seguridad. Sexo/edad vienen del perfil. Edge Function intacta.
- documenter: design aprobado y persistido en vault/designs/<session_id>.md (arte facto de proceso SDDwork, no archivo de codigo). Arquitectura: tabla nueva datos_prediccion_riesgo (1 fila/usuario, PK id_usuario), pantalla DatosPrediccionScreen con upsert, validacion previa en PrediccionRiesgoScreen (lista de faltantes + navegacion), buildPredictionPayload con prioridad a la fila declarada y DEFAULTS solo como red de seguridad. Sexo/edad desde perfil. Edge Function intacta.
- documenter: implementacion completa de la propuesta A. Schema: tabla datos_prediccion_riesgo (PK id_usuario, RLS own + service_role, inline en schema.sql seccion 16). Service: camposFaltantesPrediccion() nueva — valida age/sex_male (perfil), bmi (datos>perfil), bp/chol/diabetes/smoking/alcohol (solo datos); buildPredictionPayload con precedencia datos > perfil/promedio/factores > DEFAULTS, sin imputacion silenciosa de cholesterol. UI: DatosPrediccionScreen (formulario dedicado con chips, upsert on_conflict=id_usuario, precarga de fila existente o peso/altura del perfil), PrediccionRiesgoScreen con aviso de faltantes + boton 'Completar mis datos' (navegacion a DatosPrediccion) antes de evaluar, re-check en focus. Registrado en RootNavigator con slide_from_right. Verificado: tsc 0 errores, jest 209 passing (12 tests nuevos). Falta: aplicar schema a staging
- documenter: Deep Track completo. Propuesta A implementada y verificada: tabla datos_prediccion_riesgo (schema.sql seccion 16, con RLS), service prediccionRiesgo.ts (camposFaltantesPrediccion + precedencia datos>perfil>promedio>factores>defaults), pantalla nueva DatosPrediccionScreen (upsert on_conflict), PrediccionRiesgoScreen con aviso previo y navegacion, ruta registrada. tsc 0 errores, jest 209/209. APK release construido (33MB, b8241c5e...). PENDIENTE usuario: aplicar seccion 16 del schema en SQL Editor de staging (token no tiene permiso de query API). Vault: design note persistido en vault/designs/. IGUAL que el usuario cierre con /cortex-documenter cuando confirme staging.
- documenter: schema aplicado y verificado en vito-db-staging. pg_policies confirma las 5 policies de datos_prediccion_riesgo (select/insert/update/delete own + service_role_all). Queda lista la app para test con el APK local: aviso de faltantes -> formulario -> upsert -> evaluacion con datos reales.
- documenter: Fast Track — factores influyentes interpretables para el usuario. La Edge Function ya devolvia deltas (deploy previo); esta build hace que la UI los presente como badges Bueno/Malo/Muy malo con color semaforo y el valor en pp entre parentesis, + hint. Umbral arbitrario 5pp para 'muy malo', ajustable. APK nuevo instalado: SHA256 349474a7... Pendiente: que el usuario pruebe y cierre con cortex finish-session.

## Next Steps

- [ ] Decide if scope drift is intentional: .cortex/vault/designs/2026-09-11_mejorar-flujo-de-evaluacion-de-riesgo-formulario-dedicado-tabla-datos-prediccion-riesgo-aviso-antes-de-evaluar.md, .cortex/vault/specs/2026-09-11_mejorar-flujo-de-evaluacion-de-riesgo-formulario-dedicado-tabla-datos-prediccion-riesgo-aviso-antes-de-evaluar.md, supabase/functions/prediccion-riesgo/index.ts, src/screens/CompleteProfileScreen.tsx, Vito-app-release-test.apk
- [ ] Commit (or revert) declared-only files: src/screens/CompleteProfileScreen.tsx, Vito-app-release-test.apk
- [ ] [self-review] Placeholders detected in draft: ['todo']

## Verified State

- Modified 8 file(s) inside spec scope
- verification hook 'tsc' passed
- verification hook 'jest' passed

## Unverified Claims

- acceptance criterion: AC-01: Pantalla de formulación aparece accesible desde PrediccionRiesgoScreen cuando faltan campos
- acceptance criterion: AC-02: Al guardar el formulario, se crea/actualiza la fila en datos_prediccion_riesgo y al volver a evaluar, la evaluación se ejecuta con esos datos
- acceptance criterion: AC-03: Si el usuario YA tiene todos los campos, el botón evalúa directo sin pasar por el formulario (sin regresión del flujo actual)
- acceptance criterion: AC-04: Los campos del formulario son: peso, altura (→ BMI), presión sistólica, diastólica, colesterol (normal/alto/muy alto), diabetes, tabaquismo, alcohol. Sexo y edad NO se piden (se toman del perfil)
- acceptance criterion: AC-05: buildPredictionPayload usa datos_prediccion_riesgo como fuente primaria; fallback a defaults SOLO si la fila no existe
- acceptance criterion: AC-06: tsc --noEmit 0 errores
- acceptance criterion: AC-07: jest 197+ tests (los 197 existentes pasan + los nuevos pasan)
- acceptance criterion: AC-08: Cero cambios en: CompleteProfileScreen, LoginScreen, DashboardScreen, alertas, contactos, Health Connect
- acceptance criterion: AC-09: RegisterScreen y login intactos (sin regression)
