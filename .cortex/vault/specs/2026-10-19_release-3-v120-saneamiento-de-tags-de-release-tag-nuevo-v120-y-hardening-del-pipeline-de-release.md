---
schema_version: 1
doc_type: spec
title: Release 3 (v1.2.0) — saneamiento de tags de release, tag nuevo v1.2.0 y hardening
  del pipeline de release
created_at: '2026-10-19T22:46:10.723500Z'
updated_at: '2026-10-19T22:46:10.723500Z'
tags:
- spec
- release
- tags
- semver
- versioning
- github-release
- ci-cd
- dod
- changelog
status: draft
links: []
vault_scope: local
fingerprint: f793c33ea24b541b6373e21cb5133d318c7e9aeeec6a45898db357f940687173
verification_hooks:
- name: version-parity-1.2.0
  command: 'node -e "const p=require(''./package.json''),a=require(''./app.json'');if(p.version!==a.expo.version){console.error(''PARIDAD:
    ''+p.version+'' vs ''+a.expo.version);process.exit(1)}if(a.expo.android.versionCode<3){console.error(''VERSIONCODE
    NO MONOTONO: ''+a.expo.android.versionCode);process.exit(1)}console.log(''VERSION-PARITY-OK'',p.version,a.expo.android.versionCode)"'
  required: true
  success_criteria: exit code 0 e imprime VERSION-PARITY-OK 1.2.0 3
  timeout_seconds: 120
- name: changelog-secciones-completas
  command: 'node -e "const fs=require(''fs''),v=require(''./package.json'').version,c=fs.readFileSync(''CHANGELOG.md'',''utf8'');[''Unreleased'',v,''1.1.0'',''1.0.0''].forEach(s=>{if(!c.includes(''##
    [''+s+'']'')){console.error(''FALTA SECCION ## [''+s+'']'');process.exit(1)}});console.log(''CHANGELOG-SECTIONS-OK'')"'
  required: true
  success_criteria: exit code 0 e imprime CHANGELOG-SECTIONS-OK
  timeout_seconds: 120
- name: dod-check
  command: npm run dod:check
  required: true
  success_criteria: exit code 0 y termina con 'dod:check OK'
  timeout_seconds: 300
- name: tag-huerfano-eliminado-local
  command: 'node -e "const{execSync}=require(''child_process'');const out=execSync(''git
    tag --list build-test-2026-09-10'',{encoding:''utf8''}).trim();if(out){console.error(''TAG
    HUERFANO AUN PRESENTE: ''+out);process.exit(1)}console.log(''TAG-HUERFANO-OK'')"'
  required: true
  success_criteria: exit code 0 e imprime TAG-HUERFANO-OK (el tag build-test-2026-09-10
    ya no existe en local)
  timeout_seconds: 120
- name: tag-v1.2.0-presente
  command: git rev-parse --verify refs/tags/v1.2.0
  required: true
  success_criteria: exit code 0 e imprime el SHA del tag v1.2.0
  timeout_seconds: 120
- name: tag-v1.2.0-en-remoto
  command: git ls-remote --exit-code --tags origin refs/tags/v1.2.0
  required: true
  success_criteria: exit code 0 y lista refs/tags/v1.2.0 en origin
  timeout_seconds: 120
- name: release-v1.2.0-publicada-con-apk
  command: 'node -e "fetch(''https://api.github.com/repos/VITO-org/Vito-App-Android/releases/tags/v1.2.0'').then(r=>{if(!r.ok){console.error(''NO
    EXISTE RELEASE v1.2.0 (status ''+r.status+'')'');process.exit(1)}return r.json()}).then(j=>{const
    names=(j.assets||[]).map(a=>a.name);if(!names.some(n=>n.endsWith(''.apk''))){console.error(''RELEASE
    SIN APK: ''+names.join('',''));process.exit(1)}if(j.draft){console.error(''RELEASE
    EN DRAFT'');process.exit(1)}console.log(''RELEASE-OK'',j.tag_name,names.join('',''))}).catch(e=>{console.error(''ERROR:
    ''+e.message);process.exit(1)})"'
  required: true
  success_criteria: exit code 0 e imprime RELEASE-OK v1.2.0 con un asset .apk en la
    lista
  timeout_seconds: 120
goal: Dejar el versionado del repo coherente con las releases ya publicadas en GitHub
  (v1.0.0 y v1.1.0), dar de baja el tag huérfano build-test-2026-09-10, corregir la
  regresión de versiones (package.json/app.json/CHANGELOG) que dejó dev y fix/ui-fixes-dia
  en 1.0.0, y crear un tag nuevo v1.2.0 con GitHub Release + APK disparado por release.yml,
  endureciendo el pipeline para que falle si el CHANGELOG no tiene la sección de la
  versión.
files_in_scope:
- package.json
- app.json
- package-lock.json
- CHANGELOG.md
- .github/workflows/release.yml
- scripts/tag-release.sh
- .cortex/vault/runbooks/RB-dod-de-releases-checklist-canonico-estado-de-brechas.md
- .cortex/vault/decisions/DEC-2026-10-19-politica-de-tags-de-release-semver-y-higiene-de-versions.md
- .cortex/vault/specs/2026-10-19_release-3-v120-saneamiento-de-tags-de-release-tag-nuevo-v120-y-hardening-del-pipeline-de-release.md
constraints:
- 'No borrar, re-apuntar ni renombrar los tags publicados v1.0.0 (9f4c851) y v1.1.0
  (f804629): hay APKs descargados y trazabilidad de release. El unico tag que se puede
  dar de baja es build-test-2026-09-10, y solo con confirmacion explicita del usuario.'
- 'No compilar Android en local (DEC-2026-09-10): los builds se validan solo en CI.'
- 'No usar ''supabase db push'' (historial remoto de migraciones divergente, DEC-2026-09-11):
  la sesion no toca migraciones SQL.'
- Los PRs hacia main solo pueden originarse en ramas 'release/*', 'chore/release*'
  o 'dev' (gate de ci-pr-main.yml).
- El bump de version se aplica sobre main/dev; nunca sobre una rama de feature, para
  no reintroducir la regresion 1.0.0.
- 'La nueva version no puede ser 1.1.0: el tag ya existe y el job ''Verify release
  version is new (tag not already taken)'' de ci-pr-main.yml bloquea el PR a main.'
- 'android.versionCode debe ser estrictamente mayor al publicado (2 -> 3): un versionCode
  repetido o menor invalida la instalacion del APK.'
- 'El tag y el bump de version deben estar en el mismo commit: release.yml valida
  TAG == package.json version y cancela toda la cadena si difieren.'
- 'Alcance limitado a versionado, tags, pipeline de release y documentacion: no se
  modifica codigo de la app (src/, android/, panel-admin/).'
- El vault es la fuente de verdad del procedimiento de release; toda desviacion queda
  documentada en la nota de sesion.
acceptance_criteria:
- git ls-remote --tags origin no devuelve build-test-2026-09-10 y 'git tag --list'
  local tampoco; v1.0.0 y v1.1.0 siguen apuntando a sus SHAs originales (9f4c851 /
  f804629).
- package.json.version == app.json.expo.version == 1.2.0 y app.json.expo.android.versionCode
  == 3.
- CHANGELOG.md contiene las secciones '## [Unreleased]', '## [1.2.0]', '## [1.1.0]'
  y '## [1.0.0]'.
- npm run dod:check termina con exit 0 (paridad de versiones, CHANGELOG y migraciones
  idempotentes).
- El job dod-check de release.yml falla con exit 1 cuando el CHANGELOG no tiene la
  seccion de la version (validado con un caso controlado), en lugar de publicar las
  notas de fallback.
- El tag v1.2.0 existe en local y en origin, apuntando al commit que contiene el bump
  de version.
- Existe una GitHub Release v1.2.0 publicada por github-actions, con el asset app-release.apk
  y con las notas extraidas de la seccion '## [1.2.0]' del CHANGELOG.
- 'dev y fix/ui-fixes-dia quedan con la misma version que main tras el merge: nunca
  1.0.0.'
- El runbook DoD (DESPLIEGUE-2) refleja el estado real de tags/releases y el ADR de
  politica de tags queda creado en .cortex/vault/decisions/.
- El pipeline release.yml completa sus 4 jobs en verde y la notificacion de Discord
  se dispara.
---

## Goal

Dejar el versionado del repo coherente con las releases ya publicadas en GitHub (v1.0.0 y v1.1.0), dar de baja el tag huérfano build-test-2026-09-10, corregir la regresión de versiones (package.json/app.json/CHANGELOG) que dejó dev y fix/ui-fixes-dia en 1.0.0, y crear un tag nuevo v1.2.0 con GitHub Release + APK disparado por release.yml, endureciendo el pipeline para que falle si el CHANGELOG no tiene la sección de la versión.

## Requirements

- R1 — Auditar y documentar el estado real de tags y releases: inventario verificado = 3 tags (v1.0.0 -> 157c19d, v1.1.0 -> d7e5e3d = HEAD de main, build-test-2026-09-10 -> adeb746) y 2 GitHub Releases publicadas por github-actions (v1.0.0 el 15-sep-2026 18:04, v1.1.0 el 16-sep-2026 01:27 marcada como Latest, ambas con 3 assets: APK + source code zip/tar.gz). Persistir el inventario en el vault como parte de la nota de sesion.
- R2 — Dar de baja el tag huerfano build-test-2026-09-10: no es semver, no dispara release.yml (trigger 'v[0-9]+.[0-9]+.[0-9]+'), no tiene GitHub Release y no es head de ninguna rama. Eliminarlo en local y en origin (git tag -d + git push origin :refs/tags/build-test-2026-09-10) SOLO con confirmacion explicita del usuario en el momento de ejecutarlo. No tocar v1.0.0 ni v1.1.0 bajo ningun concepto: son releases publicadas con APKs descargados y trazabilidad de release.
- R3 — Corregir la regresion de versiones: main (d7e5e3d) tiene package.json 1.1.0, app.json expo.version 1.1.0, expo.android.versionCode 2 y CHANGELOG con seccion '## [1.1.0]', pero dev y fix/ui-fixes-dia quedaron con 1.0.0 / 1.0.0 / versionCode 1 y CHANGELOG sin seccion '## [1.1.0]'. Sincronizar dev y fix/ui-fixes-dia con la version de main (traer el commit de bump de 1.1.0 / la seccion '## [1.1.0]' del CHANGELOG) de modo que ningun merge posterior pueda volver a dejar el repo en 1.0.0.
- R4 — Crear el tag nuevo v1.2.0 end-to-end: bump de package.json a 1.2.0, app.json expo.version a 1.2.0 y expo.android.versionCode a 3 (monotono: el 2 ya esta publicado en v1.1.0), nueva seccion '## [1.2.0]' en CHANGELOG.md con el contenido de la release 3, commit con mensaje 'chore(release): v1.2.0', tag anotado 'git tag -a v1.2.0 -m "Release 1.2.0 - ver CHANGELOG.md"' y push del tag desde la rama base de la release para que dispare release.yml. Actualizar tambien el campo version de package-lock.json para que no quede desfasado.
- R5 — Endurecer .github/workflows/release.yml: hoy el job dod-check solo avisa (⚠️) cuando el CHANGELOG no tiene seccion para la version y cae al texto de fallback 'Ver CHANGELOG.md para los cambios de esta version'. Convertirlo en fallo explicito (exit 1 con mensaje accionable) cuando falte la seccion '## [VERSION]' del CHANGELOG, de modo que no se publiquen releases con notas genericas.
- R6 — Ajustar scripts/tag-release.sh: sincronizar tags remotos antes de verificar existencia (git fetch --tags) para no colisionar con un tag remoto no conocido, documentar en la cabecera que el bump de version/versionCode es previo y manual, y que el tag se crea desde main/dev (nunca desde una rama de feature) para que la regresion de versiones no reaparezca.
- R7 — Actualizar el runbook DoD RB-dod-de-releases-checklist-canonico-estado-de-brechas.md, seccion DESPLIEGUE-2, que hoy afirma 'git tag --list vacio': reflecting el estado real (2 releases publicadas, tag huerfano dado de baja, version > ultimo tag published, versionCode monotono, orden de operaciones, rollback con re-tag).
- R8 — Crear un ADR de politica de tags en .cortex/vault/decisions/ con las reglas canonicas: semver vX.Y.Z sin prefijo extra, no borrar ni re-apuntar tags ya publicados, tags huerfanos no-semver se dan de baja con OK explicito, versionCode monotono, el bump de version se hace sobre main/dev, y el CHANGELOG debe tener la seccion de la version antes de taguear.
- R9 — Verificar el resultado en GitHub: release.yml completo en verde (4 jobs: dod-check, build-release-apk, create-github-release, notify-discord), GitHub Release v1.2.0 publicada con el asset app-release.apk y las notas extraidas de la seccion '## [1.2.0]' del CHANGELOG, y confirmacion en Discord.

## Files in Scope

- `package.json`
- `app.json`
- `package-lock.json`
- `CHANGELOG.md`
- `.github/workflows/release.yml`
- `scripts/tag-release.sh`
- `.cortex/vault/runbooks/RB-dod-de-releases-checklist-canonico-estado-de-brechas.md`
- `.cortex/vault/decisions/DEC-2026-10-19-politica-de-tags-de-release-semver-y-higiene-de-versions.md`
- `.cortex/vault/specs/2026-10-19_release-3-v120-saneamiento-de-tags-de-release-tag-nuevo-v120-y-hardening-del-pipeline-de-release.md`

## Constraints

- No borrar, re-apuntar ni renombrar los tags publicados v1.0.0 (9f4c851) y v1.1.0 (f804629): hay APKs descargados y trazabilidad de release. El unico tag que se puede dar de baja es build-test-2026-09-10, y solo con confirmacion explicita del usuario.
- No compilar Android en local (DEC-2026-09-10): los builds se validan solo en CI.
- No usar 'supabase db push' (historial remoto de migraciones divergente, DEC-2026-09-11): la sesion no toca migraciones SQL.
- Los PRs hacia main solo pueden originarse en ramas 'release/*', 'chore/release*' o 'dev' (gate de ci-pr-main.yml).
- El bump de version se aplica sobre main/dev; nunca sobre una rama de feature, para no reintroducir la regresion 1.0.0.
- La nueva version no puede ser 1.1.0: el tag ya existe y el job 'Verify release version is new (tag not already taken)' de ci-pr-main.yml bloquea el PR a main.
- android.versionCode debe ser estrictamente mayor al publicado (2 -> 3): un versionCode repetido o menor invalida la instalacion del APK.
- El tag y el bump de version deben estar en el mismo commit: release.yml valida TAG == package.json version y cancela toda la cadena si difieren.
- Alcance limitado a versionado, tags, pipeline de release y documentacion: no se modifica codigo de la app (src/, android/, panel-admin/).
- El vault es la fuente de verdad del procedimiento de release; toda desviacion queda documentada en la nota de sesion.

## Acceptance Criteria

- [ ] git ls-remote --tags origin no devuelve build-test-2026-09-10 y 'git tag --list' local tampoco; v1.0.0 y v1.1.0 siguen apuntando a sus SHAs originales (9f4c851 / f804629).
- [ ] package.json.version == app.json.expo.version == 1.2.0 y app.json.expo.android.versionCode == 3.
- [ ] CHANGELOG.md contiene las secciones '## [Unreleased]', '## [1.2.0]', '## [1.1.0]' y '## [1.0.0]'.
- [ ] npm run dod:check termina con exit 0 (paridad de versiones, CHANGELOG y migraciones idempotentes).
- [ ] El job dod-check de release.yml falla con exit 1 cuando el CHANGELOG no tiene la seccion de la version (validado con un caso controlado), en lugar de publicar las notas de fallback.
- [ ] El tag v1.2.0 existe en local y en origin, apuntando al commit que contiene el bump de version.
- [ ] Existe una GitHub Release v1.2.0 publicada por github-actions, con el asset app-release.apk y con las notas extraidas de la seccion '## [1.2.0]' del CHANGELOG.
- [ ] dev y fix/ui-fixes-dia quedan con la misma version que main tras el merge: nunca 1.0.0.
- [ ] El runbook DoD (DESPLIEGUE-2) refleja el estado real de tags/releases y el ADR de politica de tags queda creado en .cortex/vault/decisions/.
- [ ] El pipeline release.yml completa sus 4 jobs en verde y la notificacion de Discord se dispara.

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### version-parity-1.2.0
```bash
node -e "const p=require('./package.json'),a=require('./app.json');if(p.version!==a.expo.version){console.error('PARIDAD: '+p.version+' vs '+a.expo.version);process.exit(1)}if(a.expo.android.versionCode<3){console.error('VERSIONCODE NO MONOTONO: '+a.expo.android.versionCode);process.exit(1)}console.log('VERSION-PARITY-OK',p.version,a.expo.android.versionCode)"
```

Success: exit code 0 e imprime VERSION-PARITY-OK 1.2.0 3 · Timeout: 120s
### changelog-secciones-completas
```bash
node -e "const fs=require('fs'),v=require('./package.json').version,c=fs.readFileSync('CHANGELOG.md','utf8');['Unreleased',v,'1.1.0','1.0.0'].forEach(s=>{if(!c.includes('## ['+s+']')){console.error('FALTA SECCION ## ['+s+']');process.exit(1)}});console.log('CHANGELOG-SECTIONS-OK')"
```

Success: exit code 0 e imprime CHANGELOG-SECTIONS-OK · Timeout: 120s
### dod-check
```bash
npm run dod:check
```

Success: exit code 0 y termina con 'dod:check OK' · Timeout: 300s
### tag-huerfano-eliminado-local
```bash
node -e "const{execSync}=require('child_process');const out=execSync('git tag --list build-test-2026-09-10',{encoding:'utf8'}).trim();if(out){console.error('TAG HUERFANO AUN PRESENTE: '+out);process.exit(1)}console.log('TAG-HUERFANO-OK')"
```

Success: exit code 0 e imprime TAG-HUERFANO-OK (el tag build-test-2026-09-10 ya no existe en local) · Timeout: 120s
### tag-v1.2.0-presente
```bash
git rev-parse --verify refs/tags/v1.2.0
```

Success: exit code 0 e imprime el SHA del tag v1.2.0 · Timeout: 120s
### tag-v1.2.0-en-remoto
```bash
git ls-remote --exit-code --tags origin refs/tags/v1.2.0
```

Success: exit code 0 y lista refs/tags/v1.2.0 en origin · Timeout: 120s
### release-v1.2.0-publicada-con-apk
```bash
node -e "fetch('https://api.github.com/repos/VITO-org/Vito-App-Android/releases/tags/v1.2.0').then(r=>{if(!r.ok){console.error('NO EXISTE RELEASE v1.2.0 (status '+r.status+')');process.exit(1)}return r.json()}).then(j=>{const names=(j.assets||[]).map(a=>a.name);if(!names.some(n=>n.endsWith('.apk'))){console.error('RELEASE SIN APK: '+names.join(','));process.exit(1)}if(j.draft){console.error('RELEASE EN DRAFT');process.exit(1)}console.log('RELEASE-OK',j.tag_name,names.join(','))}).catch(e=>{console.error('ERROR: '+e.message);process.exit(1)})"
```

Success: exit code 0 e imprime RELEASE-OK v1.2.0 con un asset .apk en la lista · Timeout: 120s
