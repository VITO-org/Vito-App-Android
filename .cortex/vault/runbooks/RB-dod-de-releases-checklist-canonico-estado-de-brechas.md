---
schema_version: 1
doc_type: runbook
title: DoD de releases — checklist canonico + estado de brechas
created_at: '2026-09-11T18:24:11.631224Z'
updated_at: '2026-09-11T18:24:11.631224Z'
tags:
- release
- dod
- qa
- ci-cd
- checklist
- rollback
- changelog
status: active
links:
- 2026-09-11_dod-de-releases-checklist-canonico-brechas-avance-incremental-en-repo
vault_scope: local
fingerprint: 9ce4b96d580c13e218a4c4b05fdc361697076190b828e94f53d0a604e96a5954
runbook_kind: operational
applies_to: []
estimated_duration_minutes: 0
last_verified_at: null
---

## Description

Checklist canonico del Definition of Done de releases (calidad, integracion,
despliegue, operaciones). Cada item se mide contra el repo como
CUBIERTO / PARCIAL / PENDIENTE con evidencia. Avance incremental: no se exige
100% en una sesion; cada gap cerrado deja CI en verde.

## Kind

**operational**

## Applies To

Releases a staging y prod de Vito App Android (branch `release/vX.Y.Z`, tags `vX.Y.Z`).

## Prerequisites

- CI en verde en `dev` (lint + tsc --noEmit + jest). Builds Android solo en CI
  (DEC-2026-09-10: no compilar en local).
- QA en fisico con APK del CI (no emulador). Supabase staging verificado
  + panel-admin. RLS staging temporal con revert obligatorio antes de prod
  (DEC-2026-09-11).
- Trigger push aplicado por SQL Editor hasta reconciliar historial remoto
  divergente (DEC-2026-09-11); no usar `supabase db push` hasta entonces.

## Procedure

### Step 1

CALIDAD-1 — 100% de criterios de aceptacion validados por QA/PO. Estado: PARCIAL. Evidencia: QA fisico con APK del CI + panel-admin (ver runbook QA push staging). Gap: sin proceso formal de sign-off PO; proxima iteracion: checklist de sign-off por HU.
### Step 2

CALIDAD-2 — Pruebas de regresion ejecutadas y superadas sin errores bloqueantes o criticos. Estado: PENDIENTE. Gap: no existe suite de regresion formal; next step priorizado para siguientes sesiones.
### Step 3

CALIDAD-3 — Suite de tests automatizados (unitarios e integracion) en verde con cobertura minima aprobada. Estado: PARCIAL. Evidencia: jest configurado (__tests__/ con alerts, healthSync, syncConfig) + job en CI (npx jest --passWithNoTests). Gaps: UMBRAL TBD (propuesta: 60% lineas inicial a ratificar), sin tests de integracion; no cerrar release con tests rojos.
### Step 4

INTEGRACION-1 — Codigo compilado e integrado en main/release sin conflictos. Estado: PARCIAL. Evidencia: CI en PR (lint + tsc --noEmit + jest), builds Android solo en CI por DEC vigente (no compilar en local). Gap: verificar proteccion de ramas en GitHub.
### Step 5

INTEGRACION-2 — Todos los PRs aprobados por al menos un revisor (peer review). Estado: TBD. Gap: verificar branch protection (required reviewers) en GitHub; si falta, activarlo.
### Step 6

INTEGRACION-3 — Analisis estatico (linter/Sonar) sin advertencias criticas ni vulnerabilidades. Estado: PARCIAL. Evidencia: eslint en CI (npm run lint). Gaps: UMBRAL TBD (0 errores; warnings a ratificar), sin SonarQube/SonarCloud; evaluar incorporacion.
### Step 7

DESPLIEGUE-1 — Build validada y desplegada en staging/preproduccion. Estado: PARCIAL. Evidencia: artifact APK del CI instalado en fisico + Supabase staging + panel-admin. Notas: RLS staging temporal con revert obligatorio antes de prod; trigger push aplicado por SQL Editor hasta reconciliar historial de migraciones.
### Step 8

DESPLIEGUE-2 — Release tageada en GitHub con versionado semantico (vX.Y.Z). Estado: CUBIERTO (actualizado 2026-10-19). Evidencia: 2 GitHub Releases publicadas por `github-actions` — `v1.0.0` (15-sep-2026, commit 157c19d) y `v1.1.0` (16-sep-2026, commit d7e5e3d, marcada "Latest"), ambas con `app-release.apk` adjunto; pipeline `release.yml` con 4 jobs (dod-check -> build APK -> create release -> notify Discord). Tag huerfano `build-test-2026-09-10` (no-semver, sin release) dado de baja el 2026-10-19. Politica de tags: `DEC-2026-10-19-politica-de-tags-de-release-semver-y-higiene-de-versions`.
Procedimiento canonico (orden estricto):
1) Partir de `main`/`dev` (nunca de una rama de feature) y crear la rama `release/vX.Y.Z`.
2) Actualizar `version` en package.json + `expo.version` y `android.versionCode+1` en app.json (mismo numero; versionCode MONOTONICO).
3) Agregar la seccion `## [X.Y.Z]` en CHANGELOG.md con las release notes (obligatoria: `release.yml` falla si no existe).
4) Commit: `git commit -m "chore(release): vX.Y.Z"`.
5) Tag: `git tag -a vX.Y.Z -m 'Release X.Y.Z — ver CHANGELOG.md' && git push origin vX.Y.Z` (o `bash scripts/tag-release.sh X.Y.Z`, que valida los pasos 2-4).
6) GitHub Release: la genera `release.yml` con las notas extraidas de la seccion `## [X.Y.Z]` del CHANGELOG + APK adjunto.
7) Verificar: `npm run dod:check` (chequea paridad package.json/app.json + CHANGELOG + migraciones).
Gaps (no bloqueantes): la regresion de versiones (ramas de trabajo en 1.0.0 mientras main ya iba en 1.1.0) se cerro en 2026-10-19 sincronizando main -> dev; vigilar que el bump se aplique siempre sobre la rama base.
### Step 9

DESPLIEGUE-3 — Pipeline CI/CD en verde de punta a punta. Estado: CUBIERTO para el ciclo de release (actualizado 2026-10-19). Evidencia: workflows `build-android-dev`, `build-dev-client`, `ci-pr-dev`, `ci-pr-main` (Release Gate), `ci-jira`, `sast` y `release.yml` (4 jobs encadenados: dod-check -> build-release-apk -> create-github-release -> notify-discord). Hardening 2026-10-19: `release.yml` ahora **falla** (exit 1) si el CHANGELOG no tiene la seccion de la version, en vez de publicar una release con notas genericas. Gap: el pipeline de release no genera el tag automaticamente (hoy es manual via `scripts/tag-release.sh`); automatizacion con `workflow_dispatch` = next step.
### Step 10

OPERACIONES-1 — Changelog/Release Notes actualizado. Estado: CUBIERTO para las releases publicadas. Evidencia: `CHANGELOG.md` con secciones `## [1.0.0]`, `## [1.1.0]` y `## [1.2.0]` (Release 3) + `## [Unreleased]`; `release.yml` extrae las notas de la seccion de la version y ya no cae al texto de fallback. Regla: cada PR agrega su linea en `Unreleased`; la seccion de la version se completa al preparar el tag.
### Step 11

OPERACIONES-2 — Migraciones de BD ejecutadas y verificadas. Estado: PARCIAL. Evidencia: scripts/migrations/ + supabase/migrations/ con marcadores idempotentes. Gap: historial remoto divergente (migraciones 20260901* solo remoto) pendiente de reconciliacion; no usar db push hasta entonces.
### Step 12

OPERACIONES-3 — Plan de rollback definido y documentado. Estado: CUBIERTO (template canonico en esta sesion; cada release lo completa antes del deploy a prod). Ejecutar `scripts/migrations/verify-migrations.sh` antes de decidir rollback de BD.
Template minimo por release (copiar y completar en la Release de GitHub):
1) APP: revert al artifact/tag anterior (APK previo del CI + `git revert` o re-tag). Responsable + hora.
2) BD: solo si la release traia migracion — migraciones reversibles (down script o snapshot previo del SQL Editor). Jamas `db push` con historial divergente; revert via SQL Editor con script inverso versionado en `scripts/migrations/*_rollback.sql`.
3) CONFIG: RLS/policies y Vault/Edge a estado anterior (re-aplicar policies de prod, revertir secrets).
4) COMUNICADO: canal (Discord/Jira), usuarios afectados, version sana a instalar.
5) VERIFICACION post-rollback: `npm run dod:check`, smoke en fisico con APK previo, alerta de prueba.

## Next steps priorizados (no bloquean cierre incremental)

1. Suite de regresion formal (CALIDAD-2 PENDIENTE) — sesion dedicada.
2. Umbrales TBD a ratificar: cobertura minima (propuesta 60% lineas), Sonar (0 errores criticos), branch protection con required reviewers.
3. Reconciliar historial remoto de migraciones 20260901* y habilitar `supabase db push`.
4. Workflow `release.yml` (tag -> build -> artifact -> notes).
5. Completar entradas historicas del CHANGELOG desde `git log --oneline`.

## Verification

- `ls .cortex/vault/runbooks/ | grep -i -E 'dod|definition-of-done' && echo DOD-RUNBOOK-OK`
- `ls .github/workflows/*.yml && echo WORKFLOWS-OK`
- `bash scripts/migrations/verify-migrations.sh` (0 = OK; !=0 indica gap a corregir antes del tag)


