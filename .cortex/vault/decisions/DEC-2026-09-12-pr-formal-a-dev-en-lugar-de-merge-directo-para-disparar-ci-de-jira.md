---
schema_version: 1
doc_type: decision
title: PR formal a dev en lugar de merge directo (para disparar CI de Jira)
created_at: '2026-09-12T00:57:19.454331Z'
updated_at: '2026-09-12T00:57:19.454331Z'
tags:
- release
- ci
- jira
- git-workflow
- dev
status: active
links:
- 2026-09-11_dod-de-releases-checklist-canonico-brechas-avance-incremental-en-repo
vault_scope: local
fingerprint: 99937f04bada593fd1b802b003d787bb3eea172697a7b1d5185aa7599fe99e18
reversible_within_days: 0
---

## Context

El workflow `ci-pr-dev.yml` dispara SOLO en evento `pull_request` hacia `dev` (lint + tsc + jest + build + transición Jira a Done/Bugs). Un merge directo por git a `dev` bypasea ese workflow: no corre CI de PR ni mueve la tarjeta en Jira. En esta sesión se hizo primero el merge directo (`73c3110`) y hubo que deshacerlo para abrir el PR formal #27. No califica como ADR (reversible en minutos, sin trade-off arquitectónico), pero todo futuro release por esta vía debe conocerlo.

## Decision

Para llevar trabajo a `dev`, abrir siempre PR formal en lugar de merge directo, aunque el merge directo parezca más rápido. Si ya se hizo un merge directo por error: verificar que `origin/dev` siga exactamente en el commit del merge (nadie pusheó encima) y deshacerlo con `reset --hard <commit-previo> + push --force-with-lease` (el lease protege contra pushes concurrentes). NO usar `revert -m 1` en ese caso: el revert contamina el re-merge posterior del mismo branch (obligaría a revertir el revert). Luego actualizar el feature branch con `dev`, resolver conflictos una vez y abrir el PR: el CI dispara solo y la transición Jira es automática.

## Alternative Rejected



## Reason



