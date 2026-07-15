---
schema_version: 1
doc_type: spec
title: Jira CI/CD Integration - GitHub Actions + Jira REST API
created_at: '2026-07-15T19:19:53.425494Z'
updated_at: '2026-07-15T19:19:53.425494Z'
tags:
- spec
- ci-cd
- jira
- github-actions
- integracion-continua
- devops
status: draft
links: []
vault_scope: local
fingerprint: c9bbe6b6c120e1ec802427166231011606f19f8925793de5abe8d3e5e80cc5d8
verification_hooks:
- name: validate-workflow-syntax
  command: cd .github/workflows && for f in ci-jira.yml ci-pr-dev.yml; do echo "===
    Validating $f ==="; python3 -c "import yaml; yaml.safe_load(open('$f')); print('OK')";
    done
  required: true
  success_criteria: exit code 0
  timeout_seconds: 30
- name: validate-script-executable
  command: test -x scripts/jira-transition.sh && echo 'Script is executable' || echo
    'Script needs chmod +x'
  required: true
  success_criteria: exit code 0
  timeout_seconds: 10
- name: validate-regex
  command: echo 'scrum-11' | grep -oP 'scrum-(\d+)' && echo 'scrum-123' | grep -oP
    'scrum-(\d+)' && echo 'Regex works'
  required: true
  success_criteria: exit code 0
  timeout_seconds: 10
goal: Implementar integración continua entre el repo GitHub Vito-App-Android y el
  tablero Jira, usando GitHub Actions que escuchan eventos de push y PR, verifican
  el build de Android (React Native), y transicionan automáticamente el estado de
  las HU en Jira según reglas definidas.
files_in_scope:
- .github/workflows/ci-jira.yml
- .github/workflows/ci-pr-dev.yml
- scripts/jira-transition.sh
- README.md
constraints:
- NO modificar archivos de código fuente de la app (src/, app/, android/)
- La implementación solo afecta archivos de CI/CD (.github/, scripts/)
- Usar solo herramientas nativas de GitHub Actions (curl para Jira API, bash para
  scripts)
- No instalar dependencias externas adicionales en el proyecto
- El build debe funcionar tanto en Ubuntu (GitHub Actions runner) como localmente
acceptance_criteria:
- Al hacer push a una rama scrum-XX, se ejecuta el workflow ci-jira.yml que hace build
  y transiciona la HU a In Progress en Jira
- Al crear un PR de scrum-XX hacia dev con build exitoso, la HU pasa a Done en Jira
- Al crear un PR de scrum-XX hacia dev con build fallido, la HU pasa a Bugs en Jira
- Al hacer push a una rama scrum-XX con errores de build, la HU pasa a Bugs en Jira
- El script jira-transition.sh maneja correctamente errores de API (issue no existe,
  transición inválida)
- Los secrets de GitHub están documentados en README
- La regex extrae correctamente el issue key de branch names como scrum-11, scrum-12,
  scrum-123
---

## Goal

Implementar integración continua entre el repo GitHub Vito-App-Android y el tablero Jira, usando GitHub Actions que escuchan eventos de push y PR, verifican el build de Android (React Native), y transicionan automáticamente el estado de las HU en Jira según reglas definidas.

## Requirements

- Crear workflow 'ci-jira.yml' que se ejecuta en push a ramas scrum-*: regex extrae el issue key (scrum-{id} → HU-{id} o PROJ-{id}), ejecuta build Android (npm ci && cd android && ./gradlew assembleDebug), y si el push es exitoso transiciona la HU a 'In Progress' via Jira REST API
- Crear workflow 'ci-pr-dev.yml' que se ejecuta en PR hacia dev: regex extrae issue key del branch source, ejecuta build Android, y al cerrar el PR transiciona la HU a 'Done' si el build pasó o a 'Bugs' si falló
- Crear script reutilizable (scripts/jira-transition.sh) que encapsula la lógica de transición via Jira REST API: recibe issue_key, transition_name y ejecuta POST al endpoint /rest/api/3/issue/{key}/transitions
- Usar secrets de GitHub: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN para autenticación Basic Auth contra la API de Jira
- La convención de branch debe ser estrictamente scrum-{issue_number} para que la regex funcione. Documentar en README de CI
- Incluir manejo de errores: si la transición falla (issue no encontrado, transición no válida), logear warning pero no fallar el workflow
- Incluir verificación de que el issue existe y está en un estado válido antes de intentar la transición
- Los IDs de transición de Jira se configurarán como variables en el workflow (IN_PROGRESS_TRANSITION_ID, DONE_TRANSITION_ID, BUGS_TRANSITION_ID) para facilitar ajustes sin modificar código

## Files in Scope

- `.github/workflows/ci-jira.yml`
- `.github/workflows/ci-pr-dev.yml`
- `scripts/jira-transition.sh`
- `README.md`

## Constraints

- NO modificar archivos de código fuente de la app (src/, app/, android/)
- La implementación solo afecta archivos de CI/CD (.github/, scripts/)
- Usar solo herramientas nativas de GitHub Actions (curl para Jira API, bash para scripts)
- No instalar dependencias externas adicionales en el proyecto
- El build debe funcionar tanto en Ubuntu (GitHub Actions runner) como localmente

## Acceptance Criteria

- [ ] Al hacer push a una rama scrum-XX, se ejecuta el workflow ci-jira.yml que hace build y transiciona la HU a In Progress en Jira
- [ ] Al crear un PR de scrum-XX hacia dev con build exitoso, la HU pasa a Done en Jira
- [ ] Al crear un PR de scrum-XX hacia dev con build fallido, la HU pasa a Bugs en Jira
- [ ] Al hacer push a una rama scrum-XX con errores de build, la HU pasa a Bugs en Jira
- [ ] El script jira-transition.sh maneja correctamente errores de API (issue no existe, transición inválida)
- [ ] Los secrets de GitHub están documentados en README
- [ ] La regex extrae correctamente el issue key de branch names como scrum-11, scrum-12, scrum-123

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### validate-workflow-syntax
```bash
cd .github/workflows && for f in ci-jira.yml ci-pr-dev.yml; do echo "=== Validating $f ==="; python3 -c "import yaml; yaml.safe_load(open('$f')); print('OK')"; done
```

Success: exit code 0 · Timeout: 30s
### validate-script-executable
```bash
test -x scripts/jira-transition.sh && echo 'Script is executable' || echo 'Script needs chmod +x'
```

Success: exit code 0 · Timeout: 10s
### validate-regex
```bash
echo 'scrum-11' | grep -oP 'scrum-(\d+)' && echo 'scrum-123' | grep -oP 'scrum-(\d+)' && echo 'Regex works'
```

Success: exit code 0 · Timeout: 10s
