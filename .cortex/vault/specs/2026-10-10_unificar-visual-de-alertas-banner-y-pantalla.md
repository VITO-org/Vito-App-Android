---
schema_version: 1
doc_type: spec
title: unificar visual de alertas banner y pantalla
created_at: '2026-10-10T21:58:25.174738Z'
updated_at: '2026-10-10T21:58:25.174738Z'
tags:
- spec
- spec
- ui
- alertas
- refactor
status: draft
links: []
vault_scope: local
fingerprint: 852bced1a3dfd7e18c37a06924e284264cd701a3d90ec8c3f6a98859d5e799b4
verification_hooks:
- name: tsc
  command: npx tsc --noEmit
  required: true
  success_criteria: sin errores de tipos
  timeout_seconds: 300
goal: 'Unificar visual de alertas: extraer helpers duplicados a utils compartido,
  completar iconos por tipo, labels de severidad y conteos en tabs, sin tocar motor
  ni API.'
files_in_scope:
- src/components/ActiveAlertsBanner.tsx
- src/screens/AlertasScreen.tsx
constraints:
- Sin cambios al motor de alertas ni a la API Supabase (solo UI)
- Reglas HU-37 de descarte intactas
- Rama fix del día (fix/ui-fixes-dia) con cambios previos sin commitear
- No romper CI (tsc bloqueante)
acceptance_criteria:
- Banner y AlertasScreen usan los mismos helpers (sin código duplicado)
- Todos los tipos (hipoxia, hiper/hipotensión, taqui/bradicardia) muestran su icono
  en ambas vistas
- Severidad visible como label y tabs con conteo de no-leídas
- Reglas HU-37 intactas (críticas no descartables, resto sí) + tsc verde
---

## Goal

Unificar visual de alertas: extraer helpers duplicados a utils compartido, completar iconos por tipo, labels de severidad y conteos en tabs, sin tocar motor ni API.

## Requirements

- Nuevo src/utils/alertas.ts con severityToColorKey, alertIcon (todos los tipos), formatAlertTime y SEVERITY_COLORS compartidos
- Banner y pantalla importan del utils; eliminar duplicados locales
- AlertasScreen: iconos taquicardia/bradicardia/hipotensión iguales al banner
- Label de severidad (Crítica/Advertencia) visible en card de ambas vistas
- Tabs de AlertasScreen con conteo (ej: 'No leídas (3)')
- Mantener onAlertPress/onDismiss/onSeeAll/confirmAlert sin cambios

## Files in Scope

- `src/components/ActiveAlertsBanner.tsx`
- `src/screens/AlertasScreen.tsx`

## Constraints

- Sin cambios al motor de alertas ni a la API Supabase (solo UI)
- Reglas HU-37 de descarte intactas
- Rama fix del día (fix/ui-fixes-dia) con cambios previos sin commitear
- No romper CI (tsc bloqueante)

## Acceptance Criteria

- [ ] Banner y AlertasScreen usan los mismos helpers (sin código duplicado)
- [ ] Todos los tipos (hipoxia, hiper/hipotensión, taqui/bradicardia) muestran su icono en ambas vistas
- [ ] Severidad visible como label y tabs con conteo de no-leídas
- [ ] Reglas HU-37 intactas (críticas no descartables, resto sí) + tsc verde

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### tsc
```bash
npx tsc --noEmit
```

Success: sin errores de tipos · Timeout: 300s
