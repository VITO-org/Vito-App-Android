---
schema_version: 1
doc_type: spec
title: Jira CI/CD GitHub Actions
created_at: '2026-07-15T19:22:42.859185Z'
updated_at: '2026-07-15T19:22:42.859185Z'
tags:
- spec
- ci-cd
- jira
status: draft
links: []
vault_scope: local
fingerprint: 9a1f7832c8cbe18e5d46389fa7e623998a6099b3e65a457730ddde861d3e0986
verification_hooks: []
goal: Integrar GitHub con Jira via Actions. Push a scrum-XX → In Progress. PR a dev
  con build OK → Done. PR a dev con build fallido → Bugs.
files_in_scope:
- .github/workflows/ci-jira.yml
- .github/workflows/ci-pr-dev.yml
- scripts/jira-transition.sh
constraints:
- Solo archivos CI/CD
acceptance_criteria:
- Push a scrum-XX → In Progress
- PR a dev build OK → Done
- PR a dev build fallido → Bugs
---

## Goal

Integrar GitHub con Jira via Actions. Push a scrum-XX → In Progress. PR a dev con build OK → Done. PR a dev con build fallido → Bugs.

## Requirements

- Workflow ci-jira.yml para push events
- Workflow ci-pr-dev.yml para PR events
- Script jira-transition.sh para API Jira
- Secrets: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN

## Files in Scope

- `.github/workflows/ci-jira.yml`
- `.github/workflows/ci-pr-dev.yml`
- `scripts/jira-transition.sh`

## Constraints

- Solo archivos CI/CD

## Acceptance Criteria

- [ ] Push a scrum-XX → In Progress
- [ ] PR a dev build OK → Done
- [ ] PR a dev build fallido → Bugs

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

*(none declared — legacy spec; finish-session will skip verification)*
