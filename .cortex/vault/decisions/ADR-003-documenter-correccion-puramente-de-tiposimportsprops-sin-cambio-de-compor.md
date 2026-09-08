---
schema_version: 1
doc_type: adr
title: 'documenter: correccion puramente de tipos/imports/props, sin cambio de compor...'
created_at: '2026-09-01T22:02:59.896261Z'
updated_at: '2026-09-01T22:02:59.896261Z'
tags:
- adr
status: proposed
links: []
vault_scope: local
fingerprint: b6ba3958e55473155301c1470e3a749e4b1c90aa1cfc2202a47a6cc1e2b3158d
adr_number: 3
supersedes: []
superseded_by: null
alternatives_considered: []
acceptance_criteria_met: false
---

## Context

Checkpoint #0 note mentions decision signal(s): \bADR\b

## Decision

documenter: correccion puramente de tipos/imports/props, sin cambio de comportamiento runtime. NO amerita ADR. Tres errores quedaron enmascarados detras del de referenceLine (pressPointIndex, onFocus tipado) y se resolvieron al limpiar la API real. Verificar en CI que android-build pasa con tsc (continue-on-error tolera, pero ahora debe pasar limpio).

## Alternatives Considered

(none)

## Consequences



