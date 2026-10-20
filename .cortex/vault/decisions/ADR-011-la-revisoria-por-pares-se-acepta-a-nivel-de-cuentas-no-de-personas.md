---
schema_version: 1
doc_type: adr
title: La revisoria por pares se acepta a nivel de cuentas, no de personas
created_at: '2026-10-20T04:11:46.841040Z'
updated_at: '2026-10-20T04:11:46.841040Z'
tags:
- item
status: accepted
links:
- item
vault_scope: local
fingerprint: af99f9d25a6d0834040726ee3710e41eb432990f3c67701dcebe8bcdc3d62011
adr_number: 11
supersedes: []
superseded_by: null
alternatives_considered: []
acceptance_criteria_met: false
---

## Context

En la ruleset `proteger-main` / `proteger-dev` del repo VITO-org/Vito-App-Android, GitHub evalua la revision por CUENTA, no por persona. La organizacion tiene dos cuentas de la misma persona: `florensg` (la que usa la CLI y abre los PRs, con email `flor.gonzalez@example.com`, sin verificar en GitHub) y `Florenstt` (Florencia Gonzalez, creada en 2024, tipo User, miembro de la org). Consecuencias observadas: (1) `florensg` no puede aprobar los PRs que crea, porque GitHub bloquea el auto-aprobacion del autor; (2) `Florenstt` si puede, porque no es el autor, aunque sea la misma persona; (3) como los commits usan un email sin verificar, GitHub los marca como *unattributed*, por lo que la regla `require_extra_approval_for_unattributed_changes` (que estaba en `true` y exigia 2 aprobaciones) fue bajada a `false` el 2026-10-19 para desbloquear el flujo de releases. Con esa regla en `false` alcanza 1 aprobacion, y en los PRs #41 y #42 la aprobacion fue de `Florenstt`: es decir, la revisoria por pares no ocurrio, aunque GitHub la cuente como valida. `require_last_push_approval` ya venia en `false` de la ruleset original del equipo (2026-10-05).

## Decision

Se acepta la revisoria por cuentas como suficiente para este repositorio: no se restablece `require_extra_approval_for_unattributed_changes` a `true` y no se exige una segunda cuenta. Se asume explicitamente que un PR abierto con `florensg` puede ser aprobado con `Florenstt` (misma persona, otra cuenta) y que eso cumple el requisito de la ruleset. Decision del equipo el 2026-10-20, con la sesion de release v1.2.0 como contexto.

## Alternatives Considered

(none)

## Consequences



