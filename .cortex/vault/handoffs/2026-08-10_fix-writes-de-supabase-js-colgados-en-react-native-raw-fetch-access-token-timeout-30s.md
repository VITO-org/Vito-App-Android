---
schema_version: 1
doc_type: handoff
title: 'Fix: writes de supabase-js colgados en React Native — raw fetch + access token
  (timeout 30s)'
created_at: '2026-08-10T18:30:50.586417Z'
updated_at: '2026-08-10T18:30:50.586417Z'
tags:
- fix
- fast-track
- supabase
- react-native
- raw-fetch
- timeout-30s
- handoff
status: consumed
links:
- vault/specs/2026-08-10_fix-writes-de-supabase-js-colgados-en-react-native-timeout-30s-raw-fetch-con-access-token.md
- vault/sessions/2026-08-08_hu-25-sincronizacion-de-datos-de-salud-scrum-79.md
vault_scope: local
fingerprint: a852cf2e679e587ee6a06f646a7ebc994f15eb7d98601e458d2cf5b212caff92
parent_session_id: 2026-08-10_fix-writes-de-supabase-js-colgados-en-react-native-timeout-30s-raw-fetch-con-access-token
---

## Resumen

Sesión Fast Track que corrige el bug donde los writes de `@supabase/supabase-js` con `.select()` encadenado cuelgan la promesa en React Native (issues #1620/#1693), manifestado como timeout de 30s al guardar el perfil en el teléfono. Se implementó el bypass a PostgREST con `fetch` + JWT que el código ya documentaba en comentarios pero nunca ejecutó.

## Qué se hizo (verificado por hooks)

- `client.ts`: `SUPABASE_URL` y `SUPABASE_ANON_KEY` pasan de const privadas a `export const`.
- `api.ts`: helper `rawRestFetch()` (headers apikey + Authorization Bearer + Prefer; lanza Error con `{message, status, code}` como supabase-js) y `resolveAccessToken()` (token explícito del caller, o resuelto de `supabase.auth.getSession()` desde AsyncStorage).
- 7 writes convertidos a raw fetch: `upsertProfile` (POST on_conflict=id_usuario, merge-duplicates), `insertDatosReloj`, `insertDatosRelojBatch`, `markDatosRelojReemplazado` (PATCH id=eq.X), `upsertBaseline`, `upsertFactoresRiesgoCardiaco`, `insertSintomaUsuario` + `deleteSintomaUsuario` (DELETE con recorded_at URL-encoded).
- `getProfile(userId, accessToken?)`: raw fetch si recibe token; client supabase-js si no (GETs intactos).
- Callers existentes NO requirieron cambios: el token es opcional y se resuelve interno.

**Verificación**: `npm test -- --runInBand` → 5/5 PASS (healthSync.test.ts intacto). `npx tsc --noEmit` → 13 → 11 errores; los 2 TS2554 de SupabaseProvider (52 y 192) eliminados; el resto del baseline preexistente queda igual. CRLF preservado (api.ts 505/505, client.ts 18/18 líneas con CR).

## ⚠ Por qué es HANDOFF (falta para cerrar)

1. **Prueba en dispositivo real pendiente** (criterio de aceptación #1): recargar Metro (`r`) y guardar el perfil en CompleteProfileScreen sin timeout; luego registrar un síntoma y el sync de HU-25.
2. **Cambios sin commitear** (marcados ◌ declared-only): `client.ts` + `api.ts`. Commit pendiente preservando CRLF.
3. **`signUp()`** (insert a `usuario` sin `.select()`) quedó sin convertir — puede heredar el bug en registros nuevos; evaluar en sesión aparte.
4. Código muerto preexistente en SupabaseProvider (TS2305 línea 5 `DatosClinicosConfig`, TS2339 línea 216 `upsertDatosClinicosConfig`) — fuera de scope, quedó igual que el baseline.

## Next Steps

- [ ] Commit de `src/services/supabase/client.ts` + `src/services/supabase/api.ts` (sin prettier; CRLF).
- [ ] Usuario: recargar Metro y validar en el teléfono (guardar perfil → dashboard).
- [ ] Si OK: abrir PR `scrum-79-hu-25-sincronizacion-datos-salud` → `dev` (CI `ci-pr-dev.yml`).
- [ ] Evaluar convertir `signUp()` a raw fetch.

## Parent Session

[[2026-08-10_fix-writes-de-supabase-js-colgados-en-react-native-timeout-30s-raw-fetch-con-access-token]]

## Enlaces

- Spec: `2026-08-10_fix-writes-de-supabase-js-colgados-en-react-native-timeout-30s-raw-fetch-con-access-token` (vault/specs)
- Sesión HU-25 previa: vault/sessions/2026-08-08_hu-25-...
- PR pendiente HU-25: rama `scrum-79-hu-25-sincronizacion-datos-salud` @ `84c1762` → `dev` @ `551cd2b`
