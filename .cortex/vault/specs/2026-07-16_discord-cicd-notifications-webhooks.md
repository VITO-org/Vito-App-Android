---
schema_version: 1
doc_type: spec
title: Discord CI/CD Notifications - Webhooks
created_at: '2026-07-16T19:14:42.574949Z'
updated_at: '2026-07-16T19:14:42.574949Z'
tags:
- spec
- discord
- notificaciones
- ci-cd
- github-actions
- webhook
status: draft
links: []
vault_scope: local
fingerprint: b785a46060a75bcabee7517a704eff1144450a4f6ce074d81b3248aa60047605
verification_hooks:
- name: validate-script
  command: test -x scripts/discord-notify.sh && echo 'OK' || echo 'FAIL'
  required: true
  success_criteria: exit code 0
  timeout_seconds: 10
goal: 'Agregar notificaciones automáticas de Discord a los workflows de GitHub Actions
  existentes, usando webhooks. Dos canales: #features para pushes a ramas scrum-*
  y #pull-request para PRs a dev/main.'
files_in_scope:
- scripts/discord-notify.sh
- .github/workflows/ci-jira.yml
- .github/workflows/ci-pr-dev.yml
constraints:
- No modificar la lógica existente de Jira sync ni los jobs de build/test
- Los webhooks deben ser configurados manualmente por el usuario en Discord
- Usar solo curl para enviar a Discord (sin dependencias de actions de terceros)
- Los embeds no pueden exceder 6000 caracteres
acceptance_criteria:
- 'Al hacer push a scrum-[], se envía embed a #features con autor, rama, commit,
  link, estado build y estado Jira'
- 'Al abrir PR de scrum-[] a dev o PR de dev a main, se envía embed a #pull-request con título, autor,
  branch, resultado CI y estado Jira'
- Si la build falla, el embed muestra ❌ y color rojo, y el estado Jira es Bugs
- Si la build pasa, el embed muestra ✅ y color verde, y el estado Jira es In Progress
  (push) o Done (PR)
- El step de Discord no rompe el workflow si el webhook falla
---

## Goal

Agregar notificaciones automáticas de Discord a los workflows de GitHub Actions existentes, usando webhooks. Dos canales: #features para pushes a ramas scrum-* y #pull-request para PRs a dev/main.

## Requirements

- Crear script scripts/discord-notify.sh reutilizable que envía embeds formateados a Discord via webhook URL. Parámetros: WEBHOOK_URL, TITLE, DESCRIPTION, COLOR (hex), FIELDS (JSON array). Usa curl POST con Content-Type application/json
- En ci-jira.yml: agregar job 'discord-notify' que corre después de jira-sync, js-lint-test y android-build. Notifica a #features con: autor del push, nombre de rama, último commit message, link al commit, estado de la build (éxito/fallo emoji), estado de la HU en Jira (In Progress si pasó, Bugs si falló). Color verde si todo OK, rojo si falló
- En ci-pr-dev.yml: agregar job 'discord-notify' que corre después de jira-sync. Notifica a #pull-request con: título del PR, autor, branch source → target, resultado de la CI (éxito/fallo), estado de la HU (Done si pasó, Bugs si falló). Color verde si todo OK, rojo si falló
- Los embeds deben incluir: footer con timestamp, author con avatar del committer (via GitHub API o payload), thumbnail con emoji de estado
- Secrets requeridos: DISCORD_WEBHOOK_FEATURES (webhook URL canal #features), DISCORD_WEBHOOK_PR (webhook URL canal #pull-request)
- El step de notificación debe tener continue-on-error: true para no romper el workflow si Discord falla
- Formato del embed para #features: título con emoji 🚀 o ❌, campos: Autor, Rama, Commit (con link), Build, Jira Status. Footer: VITO CI/CD
- Formato del embed para #pull-request: título con emoji ✅ o ❌, campos: PR (con link), Autor, Branch, CI Status, Jira Status. Footer: VITO CI/CD

## Files in Scope

- `scripts/discord-notify.sh`
- `.github/workflows/ci-jira.yml`
- `.github/workflows/ci-pr-dev.yml`

## Constraints

- No modificar la lógica existente de Jira sync ni los jobs de build/test
- Los webhooks deben ser configurados manualmente por el usuario en Discord
- Usar solo curl para enviar a Discord (sin dependencias de actions de terceros)
- Los embeds no pueden exceder 6000 caracteres

## Acceptance Criteria

- [ ] Al hacer push a scrum-122, se envía embed a #features con autor, rama, commit, link, estado build y estado Jira
- [ ] Al abrir PR de scrum-122 a dev, se envía embed a #pull-request con título, autor, branch, resultado CI y estado Jira
- [ ] Si la build falla, el embed muestra ❌ y color rojo, y el estado Jira es Bugs
- [ ] Si la build pasa, el embed muestra ✅ y color verde, y el estado Jira es In Progress (push) o Done (PR)
- [ ] El step de Discord no rompe el workflow si el webhook falla

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### validate-script
```bash
test -x scripts/discord-notify.sh && echo 'OK' || echo 'FAIL'
```

Success: exit code 0 · Timeout: 10s
