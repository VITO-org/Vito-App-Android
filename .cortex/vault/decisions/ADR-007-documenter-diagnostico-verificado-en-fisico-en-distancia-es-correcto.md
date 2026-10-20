---
schema_version: 1
doc_type: adr
title: 'documenter: diagnóstico verificado en físico. ''--'' en distancia es CORRECTO:...'
created_at: '2026-10-10T19:13:47.308053Z'
updated_at: '2026-10-10T19:13:47.308053Z'
tags:
- adr
status: proposed
links: []
vault_scope: local
fingerprint: 5783cd3e68b08d074f93a568120800e30b3a7bf13338412d7c645091c1154e2a
adr_number: 7
supersedes: []
superseded_by: null
alternatives_considered: []
acceptance_criteria_met: false
---

## Context

Checkpoint #3 note mentions decision signal(s): \bvs\.?\b

## Decision

documenter: diagnóstico verificado en físico. '--' en distancia es CORRECTO: HC solo tiene fragmentos GPS del teléfono (último 0,011 km) y nada del reloj desde 4/ago; septiembre sin ningún dato de distancia. Mi Fitness calcula 612 m internos desde pasos pero NO los escribe en HC. Zancada usuario ~0,57-0,59 m/paso consistente. 4/ago: HC 10 km vs MiFit 8,09 km = doble conteo teléfono+reloj sin dedup (clamp >2m/paso no lo captura). Propuesta general: fallback UI estimado pasos×0,8m con marca ~ (nueva spec).

## Alternatives Considered

(none)

## Consequences



