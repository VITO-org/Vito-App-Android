---
schema_version: 1
doc_type: decision
title: Trigger aplicado por SQL Editor por historial remoto divergente
created_at: '2026-09-11T15:24:37.124446Z'
updated_at: '2026-09-11T15:24:37.124446Z'
tags:
- supabase
- migraciones
- staging
status: active
links:
- 2026-09-10_fix-push-alertas-server-side-edge-notifica-via-expo-push-versionar-triggeredge-extender-panel-admin
vault_scope: local
fingerprint: 93d8e095e4c3c5a627cf4bdebdc20b1d3f239616e5a44d165e17558a212b2317
reversible_within_days: 0
---

## Context

`supabase db push` rechazó la migración (nombre fuera del patrón `<timestamp>_name.sql`) y además el historial remoto tiene migraciones 20260901* ausentes en local. Reparar el historial en caliente era riesgoso durante QA.

## Decision

Se renombró a `20260910235900_trg_datos_reloj_evaluar_evento.sql` (patrón CLI) y el trigger se aplicó por SQL Editor (idempotente: `DROP TRIGGER IF EXISTS` + `CREATE`). Queda pendiente reconciliar el historial remoto (`migration repair` / `db pull`) antes de volver a usar `db push`.

## Alternative Rejected



## Reason



