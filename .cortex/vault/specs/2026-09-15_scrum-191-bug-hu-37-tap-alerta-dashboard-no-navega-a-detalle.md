---
schema_version: 1
doc_type: spec
title: SCRUM-191 BUG HU-37 tap alerta dashboard no navega a detalle
created_at: '2026-09-15T03:23:38.835967Z'
updated_at: '2026-09-15T03:23:38.835967Z'
tags:
- spec
- bug
- SCRUM-191
- HU-37
- SCRUM-89
- dashboard
- navegacion
- fast-code
status: draft
links: []
vault_scope: local
fingerprint: 37f81bf460754ee7aff4d34af6adba160f241a17863d8f7026a13404dde95432
verification_hooks:
- name: jest alertas
  command: npm test -- __tests__/alerts.test.ts __tests__/badge-alertas.test.ts 2>&1
    | tail -n 30
  required: true
  success_criteria: tests OK, 0 failures
  timeout_seconds: 120
goal: 'Corregir SCRUM-191 (BUG HU-37 extraída de SCRUM-89): el tap sobre una notificación
  de alerta en el dashboard no navega al menú/detalle de alerta. Causa raíz: InicioScreen
  monta ActiveAlertsBanner sin pasar onAlertPress, por lo que TouchableOpacity queda
  disabled (!onAlertPress). El fix cablea onAlertPress reutilizando destinoPorTipoAlerta.'
files_in_scope:
- src/screens/InicioScreen.tsx
- src/components/ActiveAlertsBanner.tsx
- src/context/NotificationsProvider.tsx
- src/navigation/RootNavigator.tsx
- src/navigation/BottomTabNavigator.tsx
- src/screens/AlertasScreen.tsx
constraints:
- No cambiar modelo Alerta ni API Supabase
- 'Respetar navegación existente: BottomTab Alertas + Stack DetalleSigno'
- Android 14+ / RN + Native Modules
acceptance_criteria:
- Al tocar una alerta en ActiveAlertsBanner del dashboard se navega al menú Alertas
  / detalle (CA-03 HU-37 deja de fallar)
- El tap lleva alertId + alertType + severity y resuelve destino vía destinoPorTipoAlerta
  (hipoxia→saturacion_oxigeno, hiper/hipotension→presion_sistolica, taqui/bradicardia→frecuencia_cardiaca)
- onSeeAll (Ver todas → tab Alertas) y onDismiss (descartar no-críticas, críticas
  no descartables) siguen funcionando
- Sin alertas activas la sección no ocupa espacio (CA-06)
- 'Test Jest cubre: banner con onAlertPress navega con params correctos y sin onAlertPress
  queda deshabilitado (documenta bug)'
---

## Goal

Corregir SCRUM-191 (BUG HU-37 extraída de SCRUM-89): el tap sobre una notificación de alerta en el dashboard no navega al menú/detalle de alerta. Causa raíz: InicioScreen monta ActiveAlertsBanner sin pasar onAlertPress, por lo que TouchableOpacity queda disabled (!onAlertPress). El fix cablea onAlertPress reutilizando destinoPorTipoAlerta.

## Requirements

- Pasar onAlertPress a ActiveAlertsBanner en InicioScreen.tsx con navigation a Alertas o DetalleSigno llevando {alertId, alertType, severity + destinoPorTipoAlerta}
- Reutilizar helper destinoPorTipoAlerta de NotificationsProvider (o extraer a utils) para mapear tipo→tipoSigno/label/unit/icon
- Mantener onSeeAll → navigate('Alertas') y onDismiss=confirmAlert sin regresiones
- Agregar/actualizar test Jest del banner + navegación con alertId

## Files in Scope

- `src/screens/InicioScreen.tsx`
- `src/components/ActiveAlertsBanner.tsx`
- `src/context/NotificationsProvider.tsx`
- `src/navigation/RootNavigator.tsx`
- `src/navigation/BottomTabNavigator.tsx`
- `src/screens/AlertasScreen.tsx`

## Constraints

- No cambiar modelo Alerta ni API Supabase
- Respetar navegación existente: BottomTab Alertas + Stack DetalleSigno
- Android 14+ / RN + Native Modules

## Acceptance Criteria

- [ ] Al tocar una alerta en ActiveAlertsBanner del dashboard se navega al menú Alertas / detalle (CA-03 HU-37 deja de fallar)
- [ ] El tap lleva alertId + alertType + severity y resuelve destino vía destinoPorTipoAlerta (hipoxia→saturacion_oxigeno, hiper/hipotension→presion_sistolica, taqui/bradicardia→frecuencia_cardiaca)
- [ ] onSeeAll (Ver todas → tab Alertas) y onDismiss (descartar no-críticas, críticas no descartables) siguen funcionando
- [ ] Sin alertas activas la sección no ocupa espacio (CA-06)
- [ ] Test Jest cubre: banner con onAlertPress navega con params correctos y sin onAlertPress queda deshabilitado (documenta bug)

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### jest alertas
```bash
npm test -- __tests__/alerts.test.ts __tests__/badge-alertas.test.ts 2>&1 | tail -n 30
```

Success: tests OK, 0 failures · Timeout: 120s
