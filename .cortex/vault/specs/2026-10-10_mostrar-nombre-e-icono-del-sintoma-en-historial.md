---
schema_version: 1
doc_type: spec
title: mostrar nombre e icono del sintoma en historial
created_at: '2026-10-10T21:16:57.944605Z'
updated_at: '2026-10-10T21:16:57.944605Z'
tags:
- spec
- spec
- ui
- sintomas
- historial
status: draft
links: []
vault_scope: local
fingerprint: 68542487a72e146831bf984877623f18f929d9fc827d7e5181bf3e5da13f41cf
verification_hooks:
- name: tsc
  command: npx tsc --noEmit
  required: true
  success_criteria: sin errores de tipos
  timeout_seconds: 300
goal: Mostrar nombre+icono del síntoma en cada card del historial mediante join en
  cliente con el catálogo (Supabase + fallback local), rediseñando la card con el
  nombre como título.
files_in_scope:
- src/screens/HistorialSintomasScreen.tsx
constraints:
- Sin cambios de schema de BD ni de API Supabase (solo lectura de catálogo existente)
- Rama fix del día (fix/ui-fixes-dia) con cambios previos sin commitear
- No romper CI (tsc bloqueante)
- 'Alcance: solo HistorialSintomasScreen; no tocar RegistrarSintomaScreen'
acceptance_criteria:
- Cada card del historial muestra icono + nombre del síntoma como título cuando hay
  id_sintomas resoluble
- Registros sin id (fallback local / chat IA) muestran nombre genérico legible, nunca
  card vacía
- Intensidad, fecha/hora, categoría, descripción y eliminar funcionan como antes
- tsc en verde
---

## Goal

Mostrar nombre+icono del síntoma en cada card del historial mediante join en cliente con el catálogo (Supabase + fallback local), rediseñando la card con el nombre como título.

## Requirements

- Cargar catálogo con getSintomasCatalogo (reusar fallback local si vacío, igual que Registrar)
- Mapa id_sintomas→{nombre, icono}; resolver por registro con genérico si id null o desconocido
- Card: fila icono + nombre (título), badge intensidad N/5, fecha/hora, tag categoría, descripción si hay, origen y botón eliminar
- Cachear el mapa en memoria para no releer el catálogo en cada refresh

## Files in Scope

- `src/screens/HistorialSintomasScreen.tsx`

## Constraints

- Sin cambios de schema de BD ni de API Supabase (solo lectura de catálogo existente)
- Rama fix del día (fix/ui-fixes-dia) con cambios previos sin commitear
- No romper CI (tsc bloqueante)
- Alcance: solo HistorialSintomasScreen; no tocar RegistrarSintomaScreen

## Acceptance Criteria

- [ ] Cada card del historial muestra icono + nombre del síntoma como título cuando hay id_sintomas resoluble
- [ ] Registros sin id (fallback local / chat IA) muestran nombre genérico legible, nunca card vacía
- [ ] Intensidad, fecha/hora, categoría, descripción y eliminar funcionan como antes
- [ ] tsc en verde

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### tsc
```bash
npx tsc --noEmit
```

Success: sin errores de tipos · Timeout: 300s
