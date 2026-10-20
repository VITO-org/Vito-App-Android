---
schema_version: 1
doc_type: spec
title: rediseño pantalla inicio según mockups
created_at: '2026-10-11T14:26:27.175485Z'
updated_at: '2026-10-11T14:26:27.175485Z'
tags:
- spec
- spec
- ui
- inicio
- rediseño
- deep
status: draft
links: []
vault_scope: local
fingerprint: e1aa9f1533f9dd7c5fcd5a8f44a02c315161cc83326ab188da30161e1697bc6c
verification_hooks:
- name: tsc
  command: npx tsc --noEmit
  required: true
  success_criteria: sin errores de tipos
  timeout_seconds: 300
goal: 'Rediseño de Inicio en código real según 4 mockups (normal, críticas, advertencia,
  sin datos): header compacto, alertas condicionales, Estado general permanente/dinámico
  con reglas reales, resumen, síntomas, misma navegación. Fase 1 visual + Fase 2 lógica.'
files_in_scope:
- src/screens/InicioScreen.tsx
- src/components/ActiveAlertsBanner.tsx
- src/components/Card.tsx
- src/utils/alertas.ts
constraints:
- 'Sin nuevas dependencias; dentro de colores establecidos + #C62828/#D97706 nuevos'
- No inventar alertas, mediciones, umbrales ni tendencias; sin datos → estado explícito
- Reglas HU-37 intactas; no cambiar comportamiento de navegación
- Rama fix/ui-fixes-dia; no romper CI (tsc bloqueante)
acceptance_criteria:
- Inicio reordenado (header compacto, alertas condicional, estado permanente, resumen,
  síntomas) con datos reales y tsc verde
- Alertas solo si hay activas; Estado general siempre visible y coherente (nunca 'Bien'
  con críticas)
- Filas con valor en rojo + umbral solo si el dato existe; sin tendencias inventadas
- Métricas, síntomas y navegación funcionando; verificado en físico
---

## Goal

Rediseño de Inicio en código real según 4 mockups (normal, críticas, advertencia, sin datos): header compacto, alertas condicionales, Estado general permanente/dinámico con reglas reales, resumen, síntomas, misma navegación. Fase 1 visual + Fase 2 lógica.

## Requirements

- Fase 1 visual: header compacto con badge, alertas entre header y estado solo si hay activas, estilos mockup, filas con valor en rojo + línea umbral si existe en alert.datos/reglas
- Fase 2 lógica: Estado general dinámico (Bien/Requiere atención/Revisar/Sin datos) desde reglas reales; si no alcanzan, identificar faltante antes de implementar
- Reutilizar navegación, datos y reglas existentes; separar presentación de lógica
- Omitir tendencias del mockup; tokens al theme existente

## Files in Scope

- `src/screens/InicioScreen.tsx`
- `src/components/ActiveAlertsBanner.tsx`
- `src/components/Card.tsx`
- `src/utils/alertas.ts`

## Constraints

- Sin nuevas dependencias; dentro de colores establecidos + #C62828/#D97706 nuevos
- No inventar alertas, mediciones, umbrales ni tendencias; sin datos → estado explícito
- Reglas HU-37 intactas; no cambiar comportamiento de navegación
- Rama fix/ui-fixes-dia; no romper CI (tsc bloqueante)

## Acceptance Criteria

- [ ] Inicio reordenado (header compacto, alertas condicional, estado permanente, resumen, síntomas) con datos reales y tsc verde
- [ ] Alertas solo si hay activas; Estado general siempre visible y coherente (nunca 'Bien' con críticas)
- [ ] Filas con valor en rojo + umbral solo si el dato existe; sin tendencias inventadas
- [ ] Métricas, síntomas y navegación funcionando; verificado en físico

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### tsc
```bash
npx tsc --noEmit
```

Success: sin errores de tipos · Timeout: 300s
