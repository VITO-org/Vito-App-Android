---
schema_version: 1
doc_type: decision
title: RLS deshabilitado + policies anon solo en staging (revertir antes de prod)
created_at: '2026-09-11T15:24:37.127433Z'
updated_at: '2026-09-11T15:24:37.127433Z'
tags:
- rls
- staging
- panel-admin
- revertir-antes-de-prod
status: active
links:
- 2026-09-10_fix-push-alertas-server-side-edge-notifica-via-expo-push-versionar-triggeredge-extender-panel-admin
vault_scope: local
fingerprint: 4b5e9e278eb0ac042a502330ce1f1babb4f04e0a0c598788df8e7debbcf2f65a
reversible_within_days: 0
---

## Context

El panel QA opera con anon key sin usuario autenticado y la app registraba tokens con RLS habilitado sin policy de INSERT con `WITH CHECK`. Sin cambios, ni el panel lee/escribe ni la app registra `dispositivo_usuario`.

## Decision

Solo staging: RLS deshabilitado en `datos_reloj` y `dispositivo_usuario` + policies anon (`anon_select_*`, upsert/update de `preferencia_notificacion`, `anon_select_notificacion_entrega`). Revertir todo antes de prod (policies finas por `auth.uid()`). Ver DEC de RLS staging del 2026-09-10.

## Alternative Rejected



## Reason



