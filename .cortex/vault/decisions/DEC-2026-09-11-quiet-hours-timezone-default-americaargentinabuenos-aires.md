---
schema_version: 1
doc_type: decision
title: 'Quiet-hours: timezone default America/Argentina/Buenos_Aires'
created_at: '2026-09-11T15:24:37.114691Z'
updated_at: '2026-09-11T15:24:37.114691Z'
tags:
- quiet-hours
- timezone
- edge-function
status: active
links:
- 2026-09-10_fix-push-alertas-server-side-edge-notifica-via-expo-push-versionar-triggeredge-extender-panel-admin
vault_scope: local
fingerprint: 45a68d9ea67fd74a80d09b7d715a2ce326b99a0533d945edb534533d485b5f1a
reversible_within_days: 0
---

## Context

La edge corre en UTC y `preferencia_notificacion` guarda `horario_silencioso_inicio/fin` como TIME sin zona. Sin criterio, la ventana se desplaza según dónde corra el cómputo.

## Decision

La edge convierte `now` UTC a `America/Argentina/Buenos_Aires` antes de comparar la ventana (wrap de medianoche incluido). Columna `timezone` por usuario diferida a fase 2: si un usuario viaja, su ventana se desplaza hasta entonces.

## Alternative Rejected



## Reason



