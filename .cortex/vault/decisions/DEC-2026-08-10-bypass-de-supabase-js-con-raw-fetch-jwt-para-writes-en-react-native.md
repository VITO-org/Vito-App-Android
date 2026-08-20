---
schema_version: 1
doc_type: decision
title: Bypass de supabase-js con raw fetch + JWT para writes en React Native
created_at: '2026-08-10T18:30:53.421621Z'
updated_at: '2026-08-10T18:30:53.421621Z'
tags:
- supabase
- react-native
- raw-fetch
- bug
- decision
status: active
links:
- vault/specs/2026-08-10_fix-writes-de-supabase-js-colgados-en-react-native-timeout-30s-raw-fetch-con-access-token.md
vault_scope: local
fingerprint: 51c475bd015dac163889b799b8379cc5ecc2d7ab67636f406ed9a53e18b9055b
reversible_within_days: 0
---

## Context

Los writes del query builder de @supabase/supabase-js con .select() encadenado cuelgan la promesa indefinidamente en React Native (issues #1620/#1693). Síntoma en dispositivo: guardar el perfil tira timeout de 30s pese a tener conectividad (login y GETs funcionan; el server responde rápido vía curl). El propio código ya documentaba en comentarios el plan de usar raw fetch pero nunca lo implementó.

## Decision

Los 7 writes de src/services/supabase/api.ts (upsertProfile, insertDatosReloj, insertDatosRelojBatch, markDatosRelojReemplazado, upsertBaseline, upsertFactoresRiesgoCardiaco, insertSintomaUsuario) + deleteSintomaUsuario ahora llaman directo al REST de PostgREST con fetch, headers apikey + Authorization: Bearer + Prefer equivalente a la del query builder. El token se recibe como parámetro opcional del caller o se resuelve vía supabase.auth.getSession() (AsyncStorage) — auth sí funciona en RN. Se mantiene el contrato de throw {message, status, code}. Alternativas rechazadas: (A) upgrade/downgrade de supabase-js — la versión 2.107.0 ya incluye el fix #1620 para browser y aún cuelga en RN (#1693 sin fix estable); (B) override de global.fetch — el bug está en la cadena del query builder de postgrest-js, antes del fetch.

## Alternative Rejected



## Reason


