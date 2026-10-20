---
schema_version: 1
doc_type: spec
title: Motor inferencias VITO v2
created_at: '2026-09-22T19:37:32.108454Z'
updated_at: '2026-09-22T19:37:32.108454Z'
tags:
- spec
- vito
- inference
- baseline
status: draft
links: []
vault_scope: local
fingerprint: 200291275b04dc52582763ef50ba29e40bfc3f2a68919263575bd6d0b55a91ee
verification_hooks:
- name: build
  command: ./gradlew assembleDebug
  required: true
  success_criteria: exit code 0
  timeout_seconds: 300
goal: Motor de inferencias ML para VITO (SPEC-0 + SPEC-1). Baseline funcional.
files_in_scope:
- app/src/main/java/com/vito/inference/
- app/src/main/java/com/vito/models/
- app/src/main/java/com/vito/data/
constraints:
- Kotlin
- Android API 21+
- Arquitectura MVVM
acceptance_criteria:
- Motor ejecuta modelos correctamente
- Tests unitarios 100%
- Baseline operativo
---

## Goal

Motor de inferencias ML para VITO (SPEC-0 + SPEC-1). Baseline funcional.

## Requirements

- Motor de inferencias con modelos pre-entrenados
- Gestión datos signos vitales
- Baseline funcional
- API RESTful
- Logging inferencias

## Files in Scope

- `app/src/main/java/com/vito/inference/`
- `app/src/main/java/com/vito/models/`
- `app/src/main/java/com/vito/data/`

## Constraints

- Kotlin
- Android API 21+
- Arquitectura MVVM

## Acceptance Criteria

- [ ] Motor ejecuta modelos correctamente
- [ ] Tests unitarios 100%
- [ ] Baseline operativo

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### build
```bash
./gradlew assembleDebug
```

Success: exit code 0 · Timeout: 300s
