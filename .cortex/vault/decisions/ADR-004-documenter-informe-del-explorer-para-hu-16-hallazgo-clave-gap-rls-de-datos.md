---
schema_version: 1
doc_type: adr
title: 'documenter: informe del explorer para HU-16. Hallazgo clave: gap RLS de datos...'
created_at: '2026-09-08T23:09:40.879328Z'
updated_at: '2026-09-08T23:09:40.879328Z'
tags:
- adr
status: proposed
links: []
vault_scope: local
fingerprint: 78091215f6e3153c1b9132efb3f43cc9ece473ee41cad00d0d5a99484758bfdd
adr_number: 4
supersedes: []
superseded_by: null
alternatives_considered: []
acceptance_criteria_met: false
---

## Context

Checkpoint #0 note mentions decision signal(s): \bvs\.?\b

## Decision

documenter: informe del explorer para HU-16. Hallazgo clave: gap RLS de datos_reloj confirma que NUNCA se habilito RLS en esa tabla (leccion: nueva tabla contacto_confianza DEBE nacer con RLS desde el alta). Writes de api.ts usan rawRestFetch (bug query builder RN). Decision react-hook-form+zod vs validacion manual queda para design doc.

## Alternatives Considered

(none)

## Consequences



