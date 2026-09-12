---
schema_version: 1
doc_type: adr
title: 'documenter: Fast Track de calibración Platt COMPLETO y verificado punta a
  pun...'
created_at: '2026-09-12T00:35:16.572279Z'
updated_at: '2026-09-12T00:35:16.572279Z'
tags:
- adr
status: proposed
links: []
vault_scope: local
fingerprint: b6039e31f05bbd0783c5337a9850fbb7772a038eaff0cf4148a74b3cc1240d05
adr_number: 7
supersedes: []
superseded_by: null
alternatives_considered: []
acceptance_criteria_met: false
---

## Context

Checkpoint #0 note mentions decision signal(s): \bADR\b

## Decision

documenter: Fast Track de calibración Platt COMPLETO y verificado punta a punta. Score 0-100 ahora = probabilidad calibrada (RF idéntico, hash f0d2f67... intacto). Curva en JSON estático importada en la Edge Function (mismo patrón trees.json), interpolación lineal exacta (paridad 0.0). AC-01..AC-07 cubiertos, con AC-07 parcial: APK instalado y app arranca, falta confirmación visual del usuario. Hallazgo de infra: el gateway de staging ya rechaza JWTs legacy HS256 mintados manualmente (UNAUTHORIZED_LEGACY_JWT) — el smoke test se hizo con JWT real ES256 de Supabase Auth (usuario smoke-test-calibracion@vito.app creado ad-hoc; contraseña VitoSmoke2026!, no rotada. Considerar eliminarlo). No requiere ADR. El usuario cierra con /cortex-documenter o cortex finish-session.

## Alternatives Considered

(none)

## Consequences



