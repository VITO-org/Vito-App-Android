---
schema_version: 1
doc_type: spec
title: Jira CI/CD - GitHub Actions bidirectional sync
created_at: '2026-07-15T19:21:24.941210Z'
updated_at: '2026-07-15T19:21:24.941210Z'
tags:
- spec
- ci-cd
- jira
- github-actions
status: draft
links: []
vault_scope: local
fingerprint: 7015d6821f0025a9a179aec6535f0d2b361b97af884caa9c30826cf1f4270372
verification_hooks:
- name: validate-syntax
  command: python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-jira.yml'));
    yaml.safe_load(open('.github/workflows/ci-pr-dev.yml')); print('OK')"
  required: true
  success_criteria: exit code 0
  timeout_seconds: 30
goal: 'Implementar integración continua entre GitHub y Jira via GitHub Actions. Workflows
  escuchan push y PR events, verifican build Android, y transicionan HU en Jira según
  reglas: push → In Progress, PR+build OK → Done, PR+build fallido o push con errores
  → Bugs.'
files_in_scope:
- .github/workflows/ci-jira.yml
- .github/workflows/ci-pr-dev.yml
- scripts/jira-transition.sh
constraints:
- Solo archivos CI/CD, no modificar código de la app
- Usar solo curl y bash en GitHub Actions
- No instalar dependencias adicionales
acceptance_criteria:
- Push a scrum-XX ejecuta build y transiciona a In Progress
- PR a dev con build OK transiciona a Done
- PR a dev con build fallido o push con errores transiciona a Bugs
- Secrets documentados
- Regex funciona para scrum-11, scrum-12, scrum-123
---

## Goal

Implementar integración continua entre GitHub y Jira via GitHub Actions. Workflows escuchan push y PR events, verifican build Android, y transicionan HU en Jira según reglas: push → In Progress, PR+build OK → Done, PR+build fallido o push con errores → Bugs.

## Requirements

- Workflow ci-jira.yml: push a ramas scrum-*, extrae issue key, ejecuta build Android, transiciona a In Progress
- Workflow ci-pr-dev.yml: PR hacia dev, extrae issue key, ejecuta build, transiciona a Done o Bugs según resultado
- Script jira-transition.sh: encapsula llamada REST API Jira con Basic Auth
- Secrets de GitHub: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
- Manejo de errores robusto en transiciones
- IDs de transición configurables como variables

## Files in Scope

- `.github/workflows/ci-jira.yml`
- `.github/workflows/ci-pr-dev.yml`
- `scripts/jira-transition.sh`

## Constraints

- Solo archivos CI/CD, no modificar código de la app
- Usar solo curl y bash en GitHub Actions
- No instalar dependencias adicionales

## Acceptance Criteria

- [ ] Push a scrum-XX ejecuta build y transiciona a In Progress
- [ ] PR a dev con build OK transiciona a Done
- [ ] PR a dev con build fallido o push con errores transiciona a Bugs
- [ ] Secrets documentados
- [ ] Regex funciona para scrum-11, scrum-12, scrum-123

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### validate-syntax
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-jira.yml')); yaml.safe_load(open('.github/workflows/ci-pr-dev.yml')); print('OK')"
```

Success: exit code 0 · Timeout: 30s
