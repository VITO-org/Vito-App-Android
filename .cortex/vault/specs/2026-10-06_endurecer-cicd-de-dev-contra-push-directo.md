---
schema_version: 1
doc_type: spec
title: endurecer CI/CD de dev contra push directo
created_at: '2026-10-06T01:08:57.072019Z'
updated_at: '2026-10-06T01:08:57.072019Z'
tags:
- spec
- ci
- cd
- dev
- ruleset
- seguridad
- scrum-207
status: draft
links: []
vault_scope: local
fingerprint: 963a2ad2ae9570799efe697b6d4ae0356a56a5f1fdd89745173b7dc2da3fb874
verification_hooks:
- name: ruleset existe
  command: gh api repos/VITO-org/Vito-App-Android/rulesets --jq length
  required: true
  success_criteria: length >= 1
  timeout_seconds: 30
goal: 'Blindar dev (y main) contra push directo: ruleset que solo permite entrada
  por PR con 1 approval y checks requeridos, más endurecer ci-pr-dev.yml quitando
  continue-on-error en tsc y jest para que el gate sea real. Origen: el fix SCRUM-207
  (bac83d7) entró a dev por push directo bypasseando CI.'
files_in_scope:
- .github/workflows/ci-pr-dev.yml
constraints:
- Requiere permiso admin (florensg lo tiene)
- No tocar la lógica de transición Jira ni Discord notify
- android-build sigue condicional a cambios en android/
acceptance_criteria:
- 'Ruleset activo en dev+main: push directo rechazado por el servidor (probado con
  push de prueba o verificado vía API)'
- PR a dev exige 1 approval + checks js-lint-test y android-build en verde
- Sin bypass actors (ni admins), bloqueados force-push y borrado
- 'tsc y jest sin continue-on-error: un fallo real hace fallar el job y jira-sync
  marca Bugs'
- lint se mantiene no-bloqueante hasta limpiar los 4 errores pre-existentes
---

## Goal

Blindar dev (y main) contra push directo: ruleset que solo permite entrada por PR con 1 approval y checks requeridos, más endurecer ci-pr-dev.yml quitando continue-on-error en tsc y jest para que el gate sea real. Origen: el fix SCRUM-207 (bac83d7) entró a dev por push directo bypasseando CI.

## Requirements

- Crear ruleset proteger-dev-y-main vía API: target branch dev+main, enforcement active, regla pull_request (1 approval, dismiss stale), required_status_checks (js-lint-test, android-build, strict), non_fast_forward, deletion, bypass_actors vacío
- Editar ci-pr-dev.yml: quitar continue-on-error en Type-check y Unit tests (mantenerlo en Lint hasta limpiar deuda)
- Verificar con push de prueba rechazado y reglas listadas vía gh api rulesets
- Dejar constancia en SCRUM-207 del cierre del bug (opción A aceptada)

## Files in Scope

- `.github/workflows/ci-pr-dev.yml`

## Constraints

- Requiere permiso admin (florensg lo tiene)
- No tocar la lógica de transición Jira ni Discord notify
- android-build sigue condicional a cambios en android/

## Acceptance Criteria

- [ ] Ruleset activo en dev+main: push directo rechazado por el servidor (probado con push de prueba o verificado vía API)
- [ ] PR a dev exige 1 approval + checks js-lint-test y android-build en verde
- [ ] Sin bypass actors (ni admins), bloqueados force-push y borrado
- [ ] tsc y jest sin continue-on-error: un fallo real hace fallar el job y jira-sync marca Bugs
- [ ] lint se mantiene no-bloqueante hasta limpiar los 4 errores pre-existentes

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### ruleset existe
```bash
gh api repos/VITO-org/Vito-App-Android/rulesets --jq length
```

Success: length >= 1 · Timeout: 30s
