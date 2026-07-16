---
schema_version: 1
doc_type: spec
title: 'Migración HU-92: aplicar schema ML en Supabase + actualizar TypeScript'
created_at: '2026-06-13T17:08:33.413756Z'
updated_at: '2026-06-13T17:08:33.413756Z'
tags:
- spec
- supabase
- migracion
- HU-92
- ml
status: draft
links: []
vault_scope: local
fingerprint: fbbb3f119e4def40346fbb879d326223bffdec63776f3f366d1391fa23061050
verification_hooks: []
goal: Aplicar la migración SQL al proyecto Supabase (rkgbedehkfpiylaubjbo) para implementar
  el schema orientado a ML de HU-92, actualizar models.ts, api.ts y screens para consistencia
  total.
files_in_scope:
- src/services/supabase/schema.sql
- src/services/supabase/models.ts
- src/services/supabase/api.ts
- src/screens/InicioScreen.tsx
- src/screens/DetalleSignoScreen.tsx
- src/components/HealthDashboard.tsx
- src/components/VitalSignCard.tsx
constraints:
- Backup de BD antes de DROP TABLE si hay datos
- contacto_confianza postergado a Release 2
- promedio_semanal_ml solo lectura desde la app
- sintomas_usuario texto libre sin catalogo
acceptance_criteria:
- Migracion SQL ejecutada sin errores
- models.ts sin tipos obsoletos, con nuevos tipos ML
- api.ts sin funciones de tablas eliminadas, con nuevas funciones ML
- App compila sin errores (npx tsc --noEmit)
---

## Goal

Aplicar la migración SQL al proyecto Supabase (rkgbedehkfpiylaubjbo) para implementar el schema orientado a ML de HU-92, actualizar models.ts, api.ts y screens para consistencia total.

## Requirements

- Aplicar migración SQL (enums, alter perfil_usuario, drop tablas obsoletas, reset datos_reloj, sintomas_usuario, factores_riesgo_cardiaco) al proyecto Supabase
- Actualizar models.ts: nuevos tipos (SintomasUsuario, TipoPatologia, CatSintoma, OrigenSintoma), patologia en PerfilUsuario, eliminar SignoVital/ContactoConfianza/Patologia/etc
- Actualizar api.ts: nuevas funciones (datos_reloj CRUD, sintomas_usuario, factores_riesgo_cardiaco upsert, prediccion_riesgo, promedio_semanal_ml), eliminar funciones de tablas borradas, migrar syncHealthSummaryToSupabase a datos_reloj
- Actualizar schema.sql para reflejar estado post-migracion
- Actualizar screens que referencian signo_vital u otras tablas eliminadas

## Files in Scope

- `src/services/supabase/schema.sql`
- `src/services/supabase/models.ts`
- `src/services/supabase/api.ts`
- `src/screens/InicioScreen.tsx`
- `src/screens/DetalleSignoScreen.tsx`
- `src/components/HealthDashboard.tsx`
- `src/components/VitalSignCard.tsx`

## Constraints

- Backup de BD antes de DROP TABLE si hay datos
- contacto_confianza postergado a Release 2
- promedio_semanal_ml solo lectura desde la app
- sintomas_usuario texto libre sin catalogo

## Acceptance Criteria

- [ ] Migracion SQL ejecutada sin errores
- [ ] models.ts sin tipos obsoletos, con nuevos tipos ML
- [ ] api.ts sin funciones de tablas eliminadas, con nuevas funciones ML
- [ ] App compila sin errores (npx tsc --noEmit)

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

*(none declared — legacy spec; finish-session will skip verification)*
