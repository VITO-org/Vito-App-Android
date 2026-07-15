---
schema_version: 1
doc_type: spec
title: 'Implementar migración Supabase HU-92: schema orientado a ML'
created_at: '2026-06-13T17:07:17.618214Z'
updated_at: '2026-06-13T17:07:17.618214Z'
tags:
- spec
- supabase
- migracion
- HU-92
- ml
- schema
- database
- typescript
status: draft
links: []
vault_scope: local
fingerprint: f34a306bbc4d946b763e65fd27adeb3d07daa6d48f74cd598dc8cb697e8a9bac
verification_hooks:
- name: TypeScript compilation check
  command: npx tsc --noEmit
  required: true
  success_criteria: exit code 0
  timeout_seconds: 120
- name: Verify Supabase connection
  command: npx ts-node -e "const {supabase}=require('./src/services/supabase/client');
    supabase.from('datos_reloj').select('count').limit(1).then(r=>console.log(r.status)).catch(e=>console.error(e))"
  required: true
  success_criteria: exit code 0
  timeout_seconds: 300
- name: Check no references to deleted tables
  command: 'npx ts-node -e "const fs=require(''fs'');const src=fs.readFileSync(''src/services/supabase/api.ts'',''utf8'');const
    banned=[''signo_vital'',''contacto_confianza'',''datos_clinicos_config'',''patologia_paciente'',''catalogo_sintoma''];banned.forEach(t=>{if(src.includes(`''${t}''`)||src.includes(`"${t}"`)){console.error(''ERROR:
    reference to deleted table ''+t);process.exit(1)}});console.log(''OK: no references
    to deleted tables'')"'
  required: true
  success_criteria: exit code 0
  timeout_seconds: 300
goal: Aplicar la migración SQL al proyecto Supabase para reflejar el nuevo schema
  orientado a ML (HU-92) y actualizar todo el código TypeScript (models, api, screens)
  para que sea consistente con la nueva estructura de base de datos.
files_in_scope:
- src/services/supabase/schema.sql
- src/services/supabase/models.ts
- src/services/supabase/api.ts
- src/components/HealthDashboard.tsx
- src/components/VitalSignCard.tsx
- src/screens/InicioScreen.tsx
- src/screens/DetalleSignoScreen.tsx
- src/screens/PerfilScreen.tsx
- src/screens/AlertasScreen.tsx
constraints:
- La migración SQL debe ejecutarse primero (o en paralelo con cambios de código) para
  que las referencias de Supabase no fallen
- No se deben perder datos existentes — si hay datos en tablas a eliminar (signo_vital,
  contacto_confianza), considerar backup o migración
- contacto_confianza queda postergado a Release 2, no se debe re-implementar
- sintomas_usuario es texto libre SIN catálogo — la IA categoriza en físico/emocional
- promedio_semanal_ml es solo lectura desde la app — el pipeline Python lo escribe
  semanalmente
acceptance_criteria:
- El script SQL de migración se ejecuta correctamente en el proyecto Supabase rkgbedehkfpiylaubjbo
  sin errores
- models.ts exporta los nuevos tipos (SintomasUsuario, TipoPatologia, CatSintoma,
  OrigenSintoma)
- models.ts ya no exporta tipos obsoletos (SignoVital, ContactoConfianza, Patologia,
  etc.)
- api.ts tiene funciones para insertar en datos_reloj y sintomas_usuario
- api.ts ya no tiene funciones que referencien tablas eliminadas
- Las screens compilan sin errores de tipo y no referencian tablas obsoletas
- schema.sql refleja el estado final post-migración
---

## Goal

Aplicar la migración SQL al proyecto Supabase para reflejar el nuevo schema orientado a ML (HU-92) y actualizar todo el código TypeScript (models, api, screens) para que sea consistente con la nueva estructura de base de datos.

## Requirements

- Aplicar el script de migración SQL al proyecto Supabase (proyecto rkgbedehkfpiylaubjbo) mediante SQL Editor o migración administrada
- Actualizar models.ts: agregar TipoPatologia, CatSintoma, OrigenSintoma como tipos; agregar interfaz SintomasUsuario; agregar campos patologia/patologia_descripcion a PerfilUsuario; eliminar interfaces obsoletas (SignoVital, SignoVitalInsert, DatosClinicosConfig, ContactoConfianza, Patologia, CatalogoSintoma, SintomaRecord, TipoMetrica)
- Actualizar api.ts: agregar funciones CRUD para datos_reloj (insert, batch insert, query por rango), agregar funcion para sintomas_usuario (insert, query), agregar funcion upsert para factores_riesgo_cardiaco, agregar funciones get para promedio_semanal_ml y prediccion_riesgo; eliminar funciones de tablas borradas (signo_vital, contacto_confianza, patologia, catalogo_sintoma, sintoma_records, patologia_paciente); actualizar syncHealthSummaryToSupabase para escribir en datos_reloj
- Actualizar schema.sql: sincronizar con el estado post-migracion (remover tablas eliminadas, agregar sintomas_usuario, agregar campos nuevos en perfil_usuario)
- Revisar y actualizar screens que referencian signo_vital, contacto_confianza u otras tablas eliminadas (InicioScreen, DetalleSignoScreen, HealthDashboard, PerfilScreen, AlertasScreen)
- Verificar que todos los imports en api.ts y screens apunten a los modelos correctos

## Files in Scope

- `src/services/supabase/schema.sql`
- `src/services/supabase/models.ts`
- `src/services/supabase/api.ts`
- `src/components/HealthDashboard.tsx`
- `src/components/VitalSignCard.tsx`
- `src/screens/InicioScreen.tsx`
- `src/screens/DetalleSignoScreen.tsx`
- `src/screens/PerfilScreen.tsx`
- `src/screens/AlertasScreen.tsx`

## Constraints

- La migración SQL debe ejecutarse primero (o en paralelo con cambios de código) para que las referencias de Supabase no fallen
- No se deben perder datos existentes — si hay datos en tablas a eliminar (signo_vital, contacto_confianza), considerar backup o migración
- contacto_confianza queda postergado a Release 2, no se debe re-implementar
- sintomas_usuario es texto libre SIN catálogo — la IA categoriza en físico/emocional
- promedio_semanal_ml es solo lectura desde la app — el pipeline Python lo escribe semanalmente

## Acceptance Criteria

- [ ] El script SQL de migración se ejecuta correctamente en el proyecto Supabase rkgbedehkfpiylaubjbo sin errores
- [ ] models.ts exporta los nuevos tipos (SintomasUsuario, TipoPatologia, CatSintoma, OrigenSintoma)
- [ ] models.ts ya no exporta tipos obsoletos (SignoVital, ContactoConfianza, Patologia, etc.)
- [ ] api.ts tiene funciones para insertar en datos_reloj y sintomas_usuario
- [ ] api.ts ya no tiene funciones que referencien tablas eliminadas
- [ ] Las screens compilan sin errores de tipo y no referencian tablas obsoletas
- [ ] schema.sql refleja el estado final post-migración

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### TypeScript compilation check
```bash
npx tsc --noEmit
```

Success: exit code 0 · Timeout: 120s
### Verify Supabase connection
```bash
npx ts-node -e "const {supabase}=require('./src/services/supabase/client'); supabase.from('datos_reloj').select('count').limit(1).then(r=>console.log(r.status)).catch(e=>console.error(e))"
```

Success: exit code 0 · Timeout: 300s
### Check no references to deleted tables
```bash
npx ts-node -e "const fs=require('fs');const src=fs.readFileSync('src/services/supabase/api.ts','utf8');const banned=['signo_vital','contacto_confianza','datos_clinicos_config','patologia_paciente','catalogo_sintoma'];banned.forEach(t=>{if(src.includes(`'${t}'`)||src.includes(`"${t}"`)){console.error('ERROR: reference to deleted table '+t);process.exit(1)}});console.log('OK: no references to deleted tables')"
```

Success: exit code 0 · Timeout: 300s
