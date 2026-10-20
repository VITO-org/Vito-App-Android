---
schema_version: 1
doc_type: adr
title: Respaldo verificable antes de limpiar ramas, y las HUs versionadas en el repo
  principal
created_at: '2026-10-20T03:54:51.074451Z'
updated_at: '2026-10-20T03:54:51.074451Z'
tags:
- item
status: accepted
links:
- item
vault_scope: local
fingerprint: 60a79073ef416690181eb9babf61477a5b3b894b18e717954df9c2360ca6aa15
adr_number: 10
supersedes: []
superseded_by: null
alternatives_considered: []
acceptance_criteria_met: false
---

## Context

El 2026-10-20 se consolidation el repositorio VITO-org/Vito-App-Android: 68 ramas (17 locales + 51 remotas) reducidas a 5, tras un backup verificado. En el camino aparecieron dos hallazgos que hacen necesaria una politica: (1) `git bundle create --all` solo captura las refs `refs/heads/*` (locales); las ramas que solo existen como `refs/remotes/origin/*` quedan fuera del bundle, por lo que un `git bundle` hecho antes de limpiar NO garantiza el respaldo de las ramas remotas. Se detecto con un chequeo previo al borrado: 33 de las 46 ramas a eliminar no estaban en el bundle. (2) 63 archivos del vault (55 HUs, specs, ADRs, notas de sesion), la migracion `2026-09-14_scrum96_cola_whatsapp_sms.sql` y la Edge Function `enviar-whatsapp` vivian sin versionar: un checkout o un reset los eliminaba del disco. Se perdian de forma silenciosa.

## Decision

Regla canonica para limpiar ramas del repo: (1) **Respaldo en dos bundles**: uno con las refs locales (`--all`) y otro con las refs remotas (`git for-each-ref refs/remotes/origin/ | git bundle create --stdin`). Antes de borrar, un chequeo automatico confirma que TODAS las ramas a eliminar aparecen en el bundle de remotas; si alguna no, no se borra. (2) **Snapshot del working tree**: commit de los archivos sin versionar en una rama `backup/snapshot-AAAA-MM-DD`, publicado en origin, mas un `git archive` en el repo de backup. (3) **Parche de los cambios sin commitear** de los worktrees activos, sanitizado (las credenciales no se propagan a otros repos). (4) **Repositorio de respaldo**: `VITO-org/vito-backups` (privado), una rama por fecha, con el bundle, el snapshot, el parche y un README con los comandos de restauracion. (5) **Ramas que nunca se borran**: `main`, `dev`, `test` (publica el dashboard de alertas) y `gh-pages` (salida publicada). (6) **Las HUs se versionan en el repo principal**, no solo en el backup: si no estan en git, no estan. (7) **Borrar ramas no toca Jira**: `ci-jira.yml` tiene el guard `if: github.event.deleted != true`, verificado en la practica (0 workflows disparados al borrar 46 ramas `scrum-*`).

## Alternatives Considered

(none)

## Consequences



