---
schema_version: 1
doc_type: spec
title: 'Fix: writes de supabase-js colgados en React Native (timeout 30s) — raw fetch
  con access token'
created_at: '2026-08-10T17:36:33.616758Z'
updated_at: '2026-08-10T17:36:33.616758Z'
tags:
- spec
- fix
- fast-track
- supabase
- react-native
- raw-fetch
- bug
- timeout
status: draft
links: []
vault_scope: local
fingerprint: f0a53e79578c879eee07b00bf591316f6145ddf6d0804e83511804c081e00e91
verification_hooks:
- name: jest suite
  command: npm test -- --runInBand
  required: true
  success_criteria: exit code 0 (todos los tests pasan)
  timeout_seconds: 300
- name: tsc typecheck
  command: npx tsc --noEmit
  required: true
  success_criteria: los 4 errores de SupabaseProvider.tsx desaparecen (los TS2554
    y, si es de bajo riesgo, TS2305/TS2339); el resto del baseline se mantiene
  timeout_seconds: 180
goal: 'Corregir el bug donde las operaciones de escritura de @supabase/supabase-js
  (upsert/insert con .select() encadenado) cuelgan la promesa indefinidamente en React
  Native (issues conocidos #1620/#1693 de supabase-js). Síntoma en el teléfono: guardar
  el perfil en CompleteProfileScreen lanza "La conexión está tardando demasiado. ¿Tenés
  internet? (30s)" pese a tener conectividad (login y GETs funcionan). Solución: implementar
  el raw fetch + access token que el propio código ya documenta en comentarios pero
  nunca implementó, para TODOS los writes de api.ts (upsertProfile, insertDatosReloj,
  insertDatosRelojBatch, markDatosRelojReemplazado, upsertBaseline, upsertFactoresRiesgoCardiaco,
  insertSintomaUsuario). Esto desbloquea el flujo de completar perfil, el registro
  de síntomas y el sync de HU-25 (escribir datos_reloj) en el dispositivo.'
files_in_scope:
- src/services/supabase/client.ts
- src/services/supabase/api.ts
- src/context/SupabaseProvider.tsx
- src/context/HealthProvider.tsx
- src/services/healthSync.ts
constraints:
- 'Fast Track: máximo 2-3 archivos editados en serio (client.ts + api.ts); los demás
  son ajustes de firma si TS lo exige.'
- El raw fetch debe incluir SIEMPRE apikey + Authorization Bearer, o PostgREST devuelve
  401.
- 'Mantener el contrato de throw actual: los callers esperan excepciones con .message,
  .status y .code (CompleteProfileScreen los muestra en el catch).'
- 'No cambiar el comportamiento semántico de ninguna operación: mismos headers Prefer
  que hoy genera el query builder.'
- npx tsc --noEmit debe eliminar los 4 errores de SupabaseProvider.tsx (TS2554 x2,
  TS2305 DatosClinicosConfig, TS2339 upsertDatosClinicosConfig) — o al menos los TS2554;
  el resto son preexistentes y fuera de alcance.
- Los tests de healthSync.test.ts usan deps mockeadas (SyncDeps) y NO deben romperse
  (healthSync no se toca).
- No correr prettier -w sobre archivos CRLF tocados (política repo).
- 'Metro ya está corriendo: el cambio debe ser testeable en el teléfono con recarga
  de JS (r en Metro) sin rebuild del APK.'
acceptance_criteria:
- Guardar el perfil desde CompleteProfileScreen en el teléfono ya NO tira timeout
  de 30s; se guarda y navega al dashboard (getProfile devuelve el perfil recién creado).
- 'tsc --noEmit: desaparecen los TS2554 de SupabaseProvider.tsx (52 y 192); el resto
  de errores preexistentes queda igual que antes (baseline).'
- 'npm test: los tests existentes pasan (jest, incluido healthSync.test.ts).'
- El registro de síntomas (insertSintomaUsuario) y el sync de HU-25 (insertDatosRelojBatch
  vía syncWearableToBackend) ya no cuelgan la promesa.
- Los GETs (getProfile, getBaseline, getDatosReloj, getSintomasCatalogo, etc.) siguen
  funcionando sin cambios.
- CRLF preservado en los archivos tocados (git diff no muestra conversión de fin de
  línea).
---

## Goal

Corregir el bug donde las operaciones de escritura de @supabase/supabase-js (upsert/insert con .select() encadenado) cuelgan la promesa indefinidamente en React Native (issues conocidos #1620/#1693 de supabase-js). Síntoma en el teléfono: guardar el perfil en CompleteProfileScreen lanza "La conexión está tardando demasiado. ¿Tenés internet? (30s)" pese a tener conectividad (login y GETs funcionan). Solución: implementar el raw fetch + access token que el propio código ya documenta en comentarios pero nunca implementó, para TODOS los writes de api.ts (upsertProfile, insertDatosReloj, insertDatosRelojBatch, markDatosRelojReemplazado, upsertBaseline, upsertFactoresRiesgoCardiaco, insertSintomaUsuario). Esto desbloquea el flujo de completar perfil, el registro de síntomas y el sync de HU-25 (escribir datos_reloj) en el dispositivo.

## Requirements

- Implementar en src/services/supabase/client.ts la exportación de SUPABASE_URL y SUPABASE_ANON_KEY (hoy son const privadas del módulo).
- Crear un helper privado en api.ts (ej: rawRestFetch(path, {method, body, accessToken, prefer})) que haga fetch a `${SUPABASE_URL}/rest/v1/...` con headers: apikey: SUPABASE_ANON_KEY, Authorization: Bearer <accessToken>, Content-Type: application/json y Prefer configurable. Debe lanzar error con el mensaje del body si !res.ok (mantener contrato actual de throw).
- Reescribir upsertProfile(profile, accessToken) para usar el helper con Prefer: 'resolution=merge-duplicates,return=representation' y devolver la primera fila (equivalente a .select().single()).
- Reescribir insertDatosReloj(dato, accessToken) y insertDatosRelojBatch(datos, accessToken) con Prefer: 'return=representation' (equivalente a .insert().select().single() / .insert().select()).
- Reescribir markDatosRelojReemplazado(id, reemplazadoPor, accessToken) como PATCH a /rest/v1/datos_reloj?id=eq.<id> (o POST con Prefer resolution=merge-duplicates NO — debe ser PATCH para update puntual).
- Reescribir upsertBaseline(baseline, accessToken) y upsertFactoresRiesgoCardiaco(factores, accessToken) con Prefer merge-duplicates + return=representation.
- Reescribir insertSintomaUsuario(sintoma, accessToken) con Prefer return=representation.
- Actualizar getProfile(userId, accessToken?) para aceptar (y usar) el accessToken — hoy el provider ya lo pasa pero la firma lo descarta (error TS2554 en SupabaseProvider.tsx:52).
- Ajustar los callers que ya pasan el token (SupabaseProvider updateProfile pasa (data, token)) para que las firmas coincidan — NO romper el contrato existente; idealmente los callers ya pasan el token y solo falta que las firmas lo acepten.
- NO tocar healthSync.ts (ya inyecta deps mockeables), NO tocar el flujo de lectura (GETs funcionan), NO tocar esquema/RLS.
- Preservar CRLF de los archivos tocados (política del repo: DEC-2026-08-08-politica-crlf — no correr prettier -w; usar sed 's/\r*$/\r/' si se normaliza).

## Files in Scope

- `src/services/supabase/client.ts`
- `src/services/supabase/api.ts`
- `src/context/SupabaseProvider.tsx`
- `src/context/HealthProvider.tsx`
- `src/services/healthSync.ts`

## Constraints

- Fast Track: máximo 2-3 archivos editados en serio (client.ts + api.ts); los demás son ajustes de firma si TS lo exige.
- El raw fetch debe incluir SIEMPRE apikey + Authorization Bearer, o PostgREST devuelve 401.
- Mantener el contrato de throw actual: los callers esperan excepciones con .message, .status y .code (CompleteProfileScreen los muestra en el catch).
- No cambiar el comportamiento semántico de ninguna operación: mismos headers Prefer que hoy genera el query builder.
- npx tsc --noEmit debe eliminar los 4 errores de SupabaseProvider.tsx (TS2554 x2, TS2305 DatosClinicosConfig, TS2339 upsertDatosClinicosConfig) — o al menos los TS2554; el resto son preexistentes y fuera de alcance.
- Los tests de healthSync.test.ts usan deps mockeadas (SyncDeps) y NO deben romperse (healthSync no se toca).
- No correr prettier -w sobre archivos CRLF tocados (política repo).
- Metro ya está corriendo: el cambio debe ser testeable en el teléfono con recarga de JS (r en Metro) sin rebuild del APK.

## Acceptance Criteria

- [ ] Guardar el perfil desde CompleteProfileScreen en el teléfono ya NO tira timeout de 30s; se guarda y navega al dashboard (getProfile devuelve el perfil recién creado).
- [ ] tsc --noEmit: desaparecen los TS2554 de SupabaseProvider.tsx (52 y 192); el resto de errores preexistentes queda igual que antes (baseline).
- [ ] npm test: los tests existentes pasan (jest, incluido healthSync.test.ts).
- [ ] El registro de síntomas (insertSintomaUsuario) y el sync de HU-25 (insertDatosRelojBatch vía syncWearableToBackend) ya no cuelgan la promesa.
- [ ] Los GETs (getProfile, getBaseline, getDatosReloj, getSintomasCatalogo, etc.) siguen funcionando sin cambios.
- [ ] CRLF preservado en los archivos tocados (git diff no muestra conversión de fin de línea).

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### jest suite
```bash
npm test -- --runInBand
```

Success: exit code 0 (todos los tests pasan) · Timeout: 300s
### tsc typecheck
```bash
npx tsc --noEmit
```

Success: los 4 errores de SupabaseProvider.tsx desaparecen (los TS2554 y, si es de bajo riesgo, TS2305/TS2339); el resto del baseline se mantiene · Timeout: 180s
