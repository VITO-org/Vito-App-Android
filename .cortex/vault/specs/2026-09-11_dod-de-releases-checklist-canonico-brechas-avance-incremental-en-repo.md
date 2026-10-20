---
schema_version: 1
doc_type: spec
title: 'DoD de releases: checklist canonico + brechas + avance incremental en repo'
created_at: '2026-09-11T18:21:28.385901Z'
updated_at: '2026-09-11T18:21:28.385901Z'
tags:
- spec
- spec
- release
- dod
- qa
- ci-cd
- incremental
- docs
status: draft
links: []
vault_scope: local
fingerprint: 7cb5aa38a174864aa523652519d39cd9818fbd17c4a0bc8b6860428b3265de3f
verification_hooks:
- name: Runbook DoD existe
  command: ls .cortex/vault/runbooks/ | grep -i -E 'dod|definition-of-done' && echo
    DOD-RUNBOOK-OK
  required: true
  success_criteria: DOD-RUNBOOK-OK
  timeout_seconds: 30
- name: Workflows CI presentes
  command: ls .github/workflows/*.yml && echo WORKFLOWS-OK
  required: true
  success_criteria: WORKFLOWS-OK
  timeout_seconds: 30
goal: 'Formalizar el Definition of Done de releases como checklist canonico versionado
  en el vault y avanzar incrementalmente en el repo: medir cada item del DoD contra
  el estado actual (brechas) e implementar los gaps de bajo costo (release notes/changelog,
  tag semver, verificacion de migraciones, rollback template) dejando el resto como
  next steps priorizados.'
files_in_scope:
- .cortex/vault/runbooks/RB-dod-release-*.md
- .github/workflows/build-android-dev.yml
- .github/workflows/ci-pr-dev.yml
- CHANGELOG.md
- scripts/migrations/
- supabase/migrations/
- app.json
- package.json
constraints:
- 'Avance incremental: no se exige 100% del DoD en esta sesion; cada gap cerrado debe
  dejar CI en verde'
- 'No compilar Android en local (DEC vigente: builds validados en CI)'
- No tocar RLS/prod ni secrets; solo staging y repo
- Respetar convenciones del vault (runbook canonico via write_doc)
acceptance_criteria:
- Runbook canonico 'DoD Release' creado en vault con las 4 secciones del borrador
  (calidad, integracion, despliegue, operaciones) + notas de practica del repo (staging,
  fisico-vs-emulador, RLS revert, builds en CI)
- 'Matriz de brechas documentada: cada item del DoD marcado como cubierto/parcial/pendiente
  con evidencia (archivo, workflow o DEC que lo respalda)'
- Gaps de bajo costo implementados en el repo (ej. template de release notes/changelog,
  verificacion de migraciones, job de tag semver) sin romper CI existente
- Gaps no cubiertos quedan listados como next steps priorizados; no bloquean el cierre
  de esta sesion (avance incremental)
---

## Goal

Formalizar el Definition of Done de releases como checklist canonico versionado en el vault y avanzar incrementalmente en el repo: medir cada item del DoD contra el estado actual (brechas) e implementar los gaps de bajo costo (release notes/changelog, tag semver, verificacion de migraciones, rollback template) dejando el resto como next steps priorizados.

## Requirements

- Trasladar el borrador del usuario (4 secciones: calidad, integracion, despliegue, operaciones) a runbook canonico con items verificables y umbrales TBD donde falten numeros (cobertura minima, Sonar)
- Agregar notas de practica del repo: QA en fisico con APK del CI (no emulador), RLS staging temporal con revert antes de prod, trigger aplicado por SQL Editor, builds solo en CI
- Auditar cada item DoD contra el repo y documentar matriz cubierto/parcial/pendiente con evidencia
- Implementar gaps de bajo costo sin romper CI: template/generacion de changelog-release notes, job o doc de tag semver vX.Y.Z, script o checklist de verificacion de migraciones, template de plan de rollback
- Dejar gaps costosos (suite tests con cobertura, Sonar, regresion formal) como next steps priorizados para siguientes sesiones

## Files in Scope

- `.cortex/vault/runbooks/RB-dod-release-*.md`
- `.github/workflows/build-android-dev.yml`
- `.github/workflows/ci-pr-dev.yml`
- `CHANGELOG.md`
- `scripts/migrations/`
- `supabase/migrations/`
- `app.json`
- `package.json`

## Constraints

- Avance incremental: no se exige 100% del DoD en esta sesion; cada gap cerrado debe dejar CI en verde
- No compilar Android en local (DEC vigente: builds validados en CI)
- No tocar RLS/prod ni secrets; solo staging y repo
- Respetar convenciones del vault (runbook canonico via write_doc)

## Acceptance Criteria

- [ ] Runbook canonico 'DoD Release' creado en vault con las 4 secciones del borrador (calidad, integracion, despliegue, operaciones) + notas de practica del repo (staging, fisico-vs-emulador, RLS revert, builds en CI)
- [ ] Matriz de brechas documentada: cada item del DoD marcado como cubierto/parcial/pendiente con evidencia (archivo, workflow o DEC que lo respalda)
- [ ] Gaps de bajo costo implementados en el repo (ej. template de release notes/changelog, verificacion de migraciones, job de tag semver) sin romper CI existente
- [ ] Gaps no cubiertos quedan listados como next steps priorizados; no bloquean el cierre de esta sesion (avance incremental)

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### Runbook DoD existe
```bash
ls .cortex/vault/runbooks/ | grep -i -E 'dod|definition-of-done' && echo DOD-RUNBOOK-OK
```

Success: DOD-RUNBOOK-OK · Timeout: 30s
### Workflows CI presentes
```bash
ls .github/workflows/*.yml && echo WORKFLOWS-OK
```

Success: WORKFLOWS-OK · Timeout: 30s
