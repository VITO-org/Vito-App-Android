---
schema_version: 1
doc_type: spec
title: capturas HU-31 dashboard para informe release
created_at: '2026-10-12T14:30:21.107582Z'
updated_at: '2026-10-12T14:30:21.107582Z'
tags:
- spec
- spec
- hu-31
- capturas
- release
status: draft
links: []
vault_scope: local
fingerprint: ec1d01a5321e027054db5d7b4f086684d22fa3b88101495d778cbc950dabcbf1
verification_hooks: []
goal: Capturar pantallas de la app para el informe de la release, cubriendo HU-31
  Visualizar signos vitales en el dashboard según sus criterios de aceptación (CA-01
  a CA-06).
files_in_scope:
- src/screens/InicioScreen.tsx
constraints:
- No cambiar código salvo que una captura revele un bug bloqueante
- Capturas en el Xiaomi físico con datos reales
acceptance_criteria:
- Shot list por CA lista y validada
- Capturas tomadas y nombradas para el informe
---

## Goal

Capturar pantallas de la app para el informe de la release, cubriendo HU-31 Visualizar signos vitales en el dashboard según sus criterios de aceptación (CA-01 a CA-06).

## Requirements

- Identificar pantallas y estados a capturar por cada CA (datos con valores, sin datos, detalle por tap, última actividad)
- App corriendo en físico con datos reales sincronizados
- Lista de verificación captura por captura

## Files in Scope

- `src/screens/InicioScreen.tsx`

## Constraints

- No cambiar código salvo que una captura revele un bug bloqueante
- Capturas en el Xiaomi físico con datos reales

## Acceptance Criteria

- [ ] Shot list por CA lista y validada
- [ ] Capturas tomadas y nombradas para el informe

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

*(none declared — legacy spec; finish-session will skip verification)*
