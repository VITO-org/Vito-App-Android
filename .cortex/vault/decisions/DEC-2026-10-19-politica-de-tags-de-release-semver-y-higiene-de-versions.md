---
schema_version: 1
doc_type: decision
title: Politica de tags de release (semver vX.Y.Z) e higiene de versiones
created_at: '2026-10-19T23:10:00.000000Z'
updated_at: '2026-10-19T23:10:00.000000Z'
tags:
- release
- tags
- semver
- versioning
- ci-cd
- dod
status: active
links:
- '[[2026-10-19_release-3-v120-saneamiento-de-tags-de-release-tag-nuevo-v120-y-hardening-del-pipeline-de-release]]'
- '[[RB-dod-de-releases-checklist-canonico-estado-de-brechas]]'
vault_scope: local
fingerprint: pending
reversible_within_days: 0
---

## Context

La auditoria del 2026-10-19 sobre los tags de release de VITO-org/Vito-App-Android
encontro tres problemas que ya romperon releases anteriores:

1. **Regresion de versiones entre ramas.** `main` estaba en `1.1.0`
   (`versionCode` 2) con su seccion `## [1.1.0]` en el CHANGELOG, pero `dev` y las
   ramas de trabajo quedaron en `1.0.0` (`versionCode` 1) sin esa seccion. El
   CHANGELOG llego a publicar la release `v1.1.0` con el texto de fallback
   ("Ver CHANGELOG.md para los cambios de esta version") en vez de sus notas
   reales, y el body de esa release quedo editado a mano.
2. **Tags huerfanos.** `build-test-2026-09-10` no es semver, no dispara
   `release.yml` (trigger `v[0-9]+.[0-9]+.[0-9]+`), no tiene GitHub Release y no
   es head de ninguna rama. Occupaba el espacio de nombres sin aportar trazabilidad.
3. **El pipeline era permisivo.** El job `dod-check` de `release.yml` solo
   avisaba (warning) cuando el CHANGELOG no tenia la seccion de la version y
   publicaba la release con notas genericas.

Ademas, `ci-pr-main.yml` bloquea el PR a `main` si el tag de la version ya existe,
por lo que la regresion de versiones dejaba la repo sin una version utilizable:
1.1.0 ya estaba publicada y 1.0.0 hacia tiempo que no.

## Decision

Regla canonica de tags de release para el repositorio:

1. **Formato unico:** `vX.Y.Z` en semver estricto, con prefijo `v` y sin sufijos
   extra. El trigger de `release.yml` es exactamente `v[0-9]+.[0-9]+.[0-9]+`;
   cualquier otro formato no produce release.
2. **Los tags publicados son inmutables.** No se borran, re-apuntan ni renombran
   los tags que ya tienen GitHub Release publicada: existen APKs descargados por
   el equipo y dependencias de trazabilidad (rollback, auditoria). Un tag
   publicado se queda aunque el commit underlying no sea el ideal.
3. **Los tags huerfanos** (no-semver, sin release, sin pipeline, no head de
   ninguna rama) se dan de baja con confirmacion explicita del usuario, en local
   y en origin, y quedan registrados en la nota de sesion. Precedente:
   `build-test-2026-09-10`, dado de baja el 2026-10-19.
4. **`android.versionCode` es monotono:** cada release incrementa en 1 el
   `versionCode` de `app.json` respecto del publicado (1 -> 2 -> 3...). Un
   `versionCode` repetido o menor invalida la instalacion del APK.
5. **El bump de version se aplica sobre la rama base** (`main` / `dev` o una
   `release/*` creada desde ellas), nunca sobre una rama de feature. Taguear
   desde una feature reintroduce la regresion de versiones documentada arriba.
6. **El tag y el bump van en el mismo commit.** `release.yml` valida
   `TAG == package.json.version` y cancela toda la cadena si difieren.
7. **La seccion `## [X.Y.Z]` del CHANGELOG es obligatoria** antes de taguear. A
   partir del 2026-10-19 `release.yml` falla (exit 1) en lugar de publicar notas
   de fallback, tanto en `dod-check` como en la extraccion de notas de
   `create-github-release`.
8. **La version nueva siempre es mayor** que el ultimo tag semver publicado.
   `scripts/tag-release.sh` lo valida antes de crear el tag.
9. **La verificacion previa se ejecuta siempre:** `npm run dod:check` (paridad
   `package.json`/`app.json`, seccion de CHANGELOG, migraciones idempotentes)
   antes de cualquier tag. `scripts/tag-release.sh` la corre y bloquea si falla.

## Alternative Rejected

- **Re-etiquetar `v1.1.0` o `v1.0.0`** para "corregir" a que commit apuntan:
  rechazado por la regla 2. Rompe la trazabilidad de releases ya publicadas y
  deja de coincidir los APKs descargados con el tag.
- **Mover `v1.1.0` a un commit con la seccion del CHANGELOG** como forma de
  "arreglar" las notas: rechazado por la misma regla y porque la release ya
  estaba publicada con su body (editado a mano, con la descripcion correcta).
- **Generar los tags automaticamente con `release-please` / `semantic-release`:**
  rechazado por ahora; el Release Gate de `ci-pr-main.yml` exige releases
  controladas y el repo tiene un CHANGELOG manual con formato Keep a Changelog.
  Queda como next step (automatizacion con `workflow_dispatch`).
- **Permitir tags `vX.Y.Z-rc.N` (pre-releases):** no implementado; el trigger
  actual no los reconoce y no hay proceso de QA defined para RC.

## Reason

El versionado del repo es la fuente de verdad de lo que el equipo instala en los
dispositivos fisicos de QA y de los usuarios. Cuando el versionado se desincroniza
entre ramas, el equipo instala APKs con una version distinta de la que cree, y
las release notes del CHANGELOG dejan de describir lo que se publico. Esta
decision convierte las reglas en verificaciones automaticas y ejecutables:
`release.yml` (pipeline), `scripts/tag-release.sh` (procedimiento manual) y
`ci-pr-main.yml` (Release Gate). El runbook DoD (DESPLIEGUE-2) referencia esta
decision como procedimiento canonico.

## Consequences

- La release `v1.2.0` (Release 3) se creo con bump en la rama `release/v1.2.0`
  derivada de `dev`, que ya trae el merge de `main` con la preparacion de
  `v1.1.0`.
- A partir de esta decision, un tag sin seccion de CHANGELOG no llega a
  publicarse: el pipeline falla antes de compilar el APK.
- El equipo debe familiarizarse con `bash scripts/tag-release.sh X.Y.Z` como
  via preferida de tagueo (valida working tree limpio, paridad de versiones,
  CHANGELOG, dod:check, existencia del tag local/remoto y monotonico de la
  version).
