---
schema_version: 1
doc_type: session
title: 'DoD de releases + PR #27 SCRUM-95 a dev: merge, CI verde y Jira a Finalizada'
created_at: '2026-09-12T00:57:19.459669Z'
updated_at: '2026-09-12T00:57:19.459669Z'
tags:
- release
- scrum-95
- ci
- jira
- dod
- cierre
status: auto-draft
links:
- 2026-09-11_dod-de-releases-checklist-canonico-brechas-avance-incremental-en-repo
vault_scope: local
fingerprint: b49679c41a0466fb30cadcf6a4551c7e5e67702270a0d649eea875c882b7cda9
session_id: 2026-09-11_dod-de-releases-checklist-canonico-brechas-avance-incremental-en-repo
pr: null
branch: null
commit: null
cortex_telemetry: null
---

## Original Specification

Formalizar el Definition of Done de releases como checklist canonico versionado en el vault y avanzar incrementalmente en el repo: medir cada item del DoD contra el estado actual (brechas) e implementar los gaps de bajo costo (release notes/changelog, tag semver, verificacion de migraciones, rollback template) dejando el resto como next steps priorizados.

## Changes Made

- Docs (spec): runbook DoD canónico + matriz de brechas en
  `.cortex/vault/runbooks/RB-dod-de-releases-checklist-canonico-estado-de-brechas.md`
  (12 items CALIDAD/INTEGRACIÓN/DESPLIEGUE/OPERACIONES con evidencia; next steps
  priorizados: regresión, umbrales por ratificar, reconciliar migraciones
  `20260901*`, `release.yml`, CHANGELOG histórico). Gaps de bajo costo:
  `CHANGELOG.md` (Keep-a-Changelog), `scripts/migrations/verify-migrations.sh`,
  script `dod:check` en `package.json` — los tres sin commitear, ver Files Touched.
- Release SCRUM-95 (pedido mid-sesión, fuera del scope original): PR #27
  `scrum-95-hu-51-notificaciones-push-de-app-movil` → `dev`, MERGED (`7b1c152`).
  Camino: merge directo `73c3110` → revertido (`reset --hard c9ceb0f` +
  `force-with-lease`, `origin/dev` verificado quieto) → update-branch `1d341be`
  (5 conflictos resueltos una vez, árbol idéntico al merge validado) → PR sin
  conflictos → CI run `34647626337` todo pass (jest 36s, android-build 16m,
  jira-sync, discord-notify) → Jira SCRUM-95 a Finalizada (verificado por API).
- Tooling (pedido explícito, dura para futuros PRs): `gh` 2.100.0 portable en
  `~/.local/bin` + PAT fine-grained en `~/.config/gh/hosts.yml` (600).
  Permisos necesarios hallados a prueba y error (dos 403): crear PR = Pull
  requests write; mergear = Contents write.
- Staging confirmado al día por el usuario (Edge + trigger iguales al código
  mergeado, sin cambios post-QA): sin re-deploy. Estrategia: seguir en staging
  hasta el release; producción solo el día del release.

## Files Touched

✓ Commiteados y pusheados (verificados por git): `src/services/supabase/api.ts`
(unión contactos HU-16/54 + delivery CA-06), `src/services/supabase/schema.sql`
(`notificacion_entrega` full + baseline + `contacto_confianza`),
`src/context/NotificationsProvider.tsx`, `src/services/notifications/index.ts`,
`src/screens/ConfiguracionScreen.tsx` + resto del diff del PR (24 archivos, +2797).
`dev`: `c9ceb0f` → `7b1c152`. `scrum-95`: `512e427` → `1d341be`.
◌ Declarados sin commit — TRABAJO EN CURSO DEL USUARIO, dejar intactos a
propósito (decisión explícita al cierre, no son un pendiente de commit):
`package.json` (script `dod:check`), `CHANGELOG.md`,
`scripts/migrations/verify-migrations.sh`, 2 deletions de planificación
(`VITO_Planificacion.md/.xlsx`), outflow del vault (runbook DoD, runbook
QA-push-staging, ADR-003 + 6 DECs, HUs, sessions).

## Key Decisions

- Merge directo primero (rápido) y revertido al detectar que bypaseaba el CI de
  Jira → detalle en `DEC-2026-09-12-pr-formal-a-dev-en-lugar-de-merge-directo-para-disparar-ci-de-jira.md`.
- Reutilizar un único resultado de resolución en ambas direcciones de merge
  (diff de árbol vacío entre `73c3110` y `1d341be`); `tsc` exit 0 + jest 8/185
  en ambos.
- Sorpresas registradas para el próximo agente: `ci-pr-dev.yml` solo dispara en
  `pull_request` (push directo no mueve Jira); `dev` ya traía parte de scrum-95
  vía PR #24 (`HealthProvider.tsx` byte-idéntico, nada perdido); este entorno no
  tenía `gh` (push por SSH ≠ API); `revert -m 1` de un merge rompe el re-merge
  posterior.
- Self-review del borrador marcó `TODO`/`TBD`: vocabulario intencional del
  runbook (pendientes y umbrales por ratificar), no placeholders.

## Next Steps

1. (Explícito del usuario) NO tocar los ◌ declared-only: siguen en edición.
2. Ejecutar `bash scripts/migrations/verify-migrations.sh` antes del tag
   (esta sesión verificó existencia, no ejecución).
3. Día del release: tag semver (procedimiento en runbook DoD Step 8) + deploy
   prod (Edge + trigger + revert RLS según DECs).
4. Verificar branch protection con required reviewers en GitHub.

