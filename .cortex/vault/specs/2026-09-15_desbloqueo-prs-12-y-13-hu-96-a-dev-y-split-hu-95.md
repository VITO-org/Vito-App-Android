---
schema_version: 1
doc_type: spec
title: 'Desbloqueo PRs 12 y 13: HU-96 a dev y split HU-95'
created_at: '2026-09-15T18:25:32.500762Z'
updated_at: '2026-09-15T18:25:32.500762Z'
tags:
- spec
- prs
- hu-95
- hu-96
- triage
- gitflow
status: draft
links: []
vault_scope: local
fingerprint: 6594eb14219fec0869f2463d8f030c37bd05dd59ea0e9ddb695eed1e02fff804
verification_hooks:
- name: prs-abiertos
  command: gh pr list --state open --json number,title,baseRefName,headRefName
  required: true
  success_criteria: 'lista muestra #12 hacia dev y #13 hacia main'
  timeout_seconds: 300
- name: alcance-pr12
  command: gh api repos/VITO-org/Vito-App-Android/pulls/12/files --paginate --jq '.[].filename'
    | wc -l
  required: true
  success_criteria: 9 archivos
  timeout_seconds: 300
goal: 'Desbloquear los 2 PRs abiertos: dar via rapida a PR #12 HU-96 validacion clinica
  hacia dev y definir split quirurgico de PR #13 HU-95 historicos (god-PR 249 archivos
  hacia main) en PR chico revisable hacia dev.'
files_in_scope:
- src/services/exportPatientData.ts
- src/screens/ExportHistorialScreen.tsx
- ml-trainer/src/train.py
- src/services/validation.ts
- src/services/metricMapping.ts
- src/services/supabase/schema.sql
- src/services/supabase/api.ts
- __tests__/validation.test.ts
constraints:
- 'No mergear PR #13 directo a main sin split - diff >20000 lineas irrevisable'
- 'Respetar GitFlow: feature branches hacia dev, no hacia main'
- No perder fixes intermedios ya validados (navegacion, Health Connect, CI)
acceptance_criteria:
- 'PR #12 verificado mergeable a dev con CI verde documentado'
- Archivos HU-95 puros identificados (exportPatientData, ExportHistorialScreen, ml-trainer)
  vs acumulado
- 'Plan de split de PR #13 con base correcta dev definido y pasos gh concretos'
- Conflicto potencial en schema.sql/api.ts entre HU-95 y HU-96 relevado
---

## Goal

Desbloquear los 2 PRs abiertos: dar via rapida a PR #12 HU-96 validacion clinica hacia dev y definir split quirurgico de PR #13 HU-95 historicos (god-PR 249 archivos hacia main) en PR chico revisable hacia dev.

## Requirements

- Relevar estado actual PR #12 (base dev, 9 archivos, CI verde) y confirmar checklist de merge
- Relevar estado PR #13 (base main, 249 archivos, diff too_large) e identificar commit HU-95 puro feat(HU-95) exportacion historicos formato ML
- Contrastar local main vs ramas PR: verificar ausencia local de exportPatientData.ts, validation.ts, metricMapping.ts como prueba de scope exclusivo de PRs
- Definir orden de merge para evitar conflicto en schema.sql/api.ts/models.ts tocados por ambas HUs
- Producir plan operativo gh: merge #12, cherry-pick HU-95 a rama nueva desde dev, retarget o cierre de #13

## Files in Scope

- `src/services/exportPatientData.ts`
- `src/screens/ExportHistorialScreen.tsx`
- `ml-trainer/src/train.py`
- `src/services/validation.ts`
- `src/services/metricMapping.ts`
- `src/services/supabase/schema.sql`
- `src/services/supabase/api.ts`
- `__tests__/validation.test.ts`

## Constraints

- No mergear PR #13 directo a main sin split - diff >20000 lineas irrevisable
- Respetar GitFlow: feature branches hacia dev, no hacia main
- No perder fixes intermedios ya validados (navegacion, Health Connect, CI)

## Acceptance Criteria

- [ ] PR #12 verificado mergeable a dev con CI verde documentado
- [ ] Archivos HU-95 puros identificados (exportPatientData, ExportHistorialScreen, ml-trainer) vs acumulado
- [ ] Plan de split de PR #13 con base correcta dev definido y pasos gh concretos
- [ ] Conflicto potencial en schema.sql/api.ts entre HU-95 y HU-96 relevado

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### prs-abiertos
```bash
gh pr list --state open --json number,title,baseRefName,headRefName
```

Success: lista muestra #12 hacia dev y #13 hacia main · Timeout: 300s
### alcance-pr12
```bash
gh api repos/VITO-org/Vito-App-Android/pulls/12/files --paginate --jq '.[].filename' | wc -l
```

Success: 9 archivos · Timeout: 300s
