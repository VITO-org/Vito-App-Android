---
schema_version: 1
doc_type: spec
title: gráficos detalle con buckets 30min y tooltip
created_at: '2026-10-13T00:28:03.874574Z'
updated_at: '2026-10-13T00:28:03.874574Z'
tags:
- spec
- spec
- ui
- graficos
- detalle
status: draft
links: []
vault_scope: local
fingerprint: 96892db27d508c645b61c30cdba933935fc0f18f98e877f343820341f8ee8903
verification_hooks:
- name: tsc
  command: npx tsc --noEmit
  required: true
  success_criteria: sin errores de tipos
  timeout_seconds: 300
goal: 'Gráficos de DetalleSigno estilo Xiaomi en vista Diaria: buckets de 30 minutos,
  eje X en 5 divisiones, tooltip con medición del rango al tocar.'
files_in_scope:
- src/screens/DetalleSignoScreen.tsx
constraints:
- 'DetalleSignoScreen tiene cambios sin commitear del compañero: no pisarlos (coordinar/commit
  primero si es necesario)'
- Sin tocar código nativo ni motor de alertas; solo DetalleSigno + helpers
- 'No inventar datos: buckets vacíos no se grafican; tsc bloqueante'
acceptance_criteria:
- 'Vista Diaria: 48 buckets de 30 min con min-max-promedio y eje X en 5 divisiones'
- Tap en dato muestra tooltip con la medición del bucket; semanal/mensual intactos
- Sin tocar nativo; tema claro actual; tsc verde + verificado en físico
---

## Goal

Gráficos de DetalleSigno estilo Xiaomi en vista Diaria: buckets de 30 minutos, eje X en 5 divisiones, tooltip con medición del rango al tocar.

## Requirements

- Agregación en JS: 48 buckets/día con min, max y promedio desde los samples del día
- Eje X con 5 labels (00:00, 06:00, 12:00, 18:00, 00:00) en vista Diaria
- Tooltip nativo de gifted-charts al tocar: valor del bucket (y rango si aplica)
- Semanal/mensual sin cambios; tema claro; reglas HU-37 y navegación intactas

## Files in Scope

- `src/screens/DetalleSignoScreen.tsx`

## Constraints

- DetalleSignoScreen tiene cambios sin commitear del compañero: no pisarlos (coordinar/commit primero si es necesario)
- Sin tocar código nativo ni motor de alertas; solo DetalleSigno + helpers
- No inventar datos: buckets vacíos no se grafican; tsc bloqueante

## Acceptance Criteria

- [ ] Vista Diaria: 48 buckets de 30 min con min-max-promedio y eje X en 5 divisiones
- [ ] Tap en dato muestra tooltip con la medición del bucket; semanal/mensual intactos
- [ ] Sin tocar nativo; tema claro actual; tsc verde + verificado en físico

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### tsc
```bash
npx tsc --noEmit
```

Success: sin errores de tipos · Timeout: 300s
