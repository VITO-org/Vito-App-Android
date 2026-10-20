---
schema_version: 1
doc_type: decision
title: RLS deshabilitado en staging datos_reloj solo durante QA con panel (revertir
  al terminar)
created_at: '2026-09-10T02:49:08.998013Z'
updated_at: '2026-09-10T02:49:08.998013Z'
tags:
- decision
- rls
- staging
- testing
- supabase
status: active
links:
- 2026-09-08_hu-51-completar-push-notifications-deep-link-horario-silencioso-log-de-delivery
- HU-BUG-PUSH-SERVER-01
vault_scope: local
fingerprint: eba7304647a776cb55c8c49cb279071b4e1872341de43bad0776f411f577d7ee
reversible_within_days: 0
---

## Context

El panel-admin inserta filas de prueba con la anon key, pero datos_reloj tiene RLS que bloquea inserts anónimos (error 42501/RLS). Para el QA de push HU-51 se deshabilitó RLS en staging más policies anon de lectura en alerta y perfil_usuario (script panel-admin/supabase-setup.sql de feature/admin-panel-web).

## Decision

Mantener RLS deshabilitado en datos_reloj SOLO en staging mientras dure el QA con panel. Al terminar, revertir con ALTER TABLE datos_reloj ENABLE ROW LEVEL SECURITY. Nunca aplicar en producción.

## Alternative Rejected



## Reason



