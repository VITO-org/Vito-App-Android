---
schema_version: 1
doc_type: spec
title: Discord CI/CD Notifications
created_at: '2026-07-16T19:16:08.130540Z'
updated_at: '2026-07-16T19:16:08.130540Z'
tags:
- spec
status: draft
links: []
vault_scope: local
fingerprint: eb3567337634020711f18de030d6e016fa1333bfea3b2f7fc7b489a128db081e
verification_hooks: []
goal: 'Notificaciones Discord via webhooks en CI/CD: #features para pushes, #pull-request
  para PRs'
files_in_scope: []
constraints: []
acceptance_criteria: []
---

## Goal

Notificaciones Discord via webhooks en CI/CD: #features para pushes, #pull-request para PRs

## Requirements

- Script discord-notify.sh con curl para embeds
- Job discord-notify en ci-jira.yml para canal #features
- Job discord-notify en ci-pr-dev.yml para canal #pull-request
- Secrets: DISCORD_WEBHOOK_FEATURES, DISCORD_WEBHOOK_PR
- continue-on-error en notificaciones

## Files in Scope

(none)

## Constraints

(none)

## Acceptance Criteria

(none)

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

*(none declared — legacy spec; finish-session will skip verification)*
