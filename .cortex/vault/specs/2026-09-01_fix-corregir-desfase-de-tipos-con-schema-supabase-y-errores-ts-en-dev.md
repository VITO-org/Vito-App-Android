---
schema_version: 1
doc_type: spec
title: 'fix: Corregir desfase de tipos con schema Supabase y errores TS en dev'
created_at: '2026-09-01T21:47:28.328928Z'
updated_at: '2026-09-01T21:47:28.328928Z'
tags:
- spec
- fix
- deuda-tecnica
- typescript
- supabase
- tipos
status: draft
links: []
vault_scope: local
fingerprint: 0ac0d119fab390227b1d9a72c8080ec9cf84ce0114797faa8986d9368bef03c6
verification_hooks:
- name: tsc-zero-errors
  command: npx tsc --noEmit
  required: true
  success_criteria: 0 errores TS (grep -c 'error TS' == 0)
  timeout_seconds: 120
- name: jest-full-suite
  command: npx jest
  required: true
  success_criteria: exit code 0, 149/149 tests
  timeout_seconds: 180
goal: Llevar dev a 0 errores de compilacion TypeScript sincronizando los tipos con
  el schema real de Supabase (desfase de HU-25/HU-99) y corrigiendo los errores de
  UI/RN restantes, sin cambios de comportamiento.
files_in_scope:
- src/services/supabase/models.ts
- src/context/SupabaseProvider.tsx
- src/screens/DetalleSignoScreen.tsx
- src/screens/HistorialScreen.tsx
- src/screens/HistorialSintomasScreen.tsx
- src/screens/InicioScreen.tsx
- src/navigation/BottomTabNavigator.tsx
- src/components/PermissionButton.tsx
- src/context/HealthProvider.tsx
constraints:
- No cambiar comportamiento en runtime — solo tipos, imports y props de UI
- No tocar logica de negocio ni queries existentes en api.ts
- No crear tablas ni migraciones nuevas (DatosClinicosConfig se ELIMINA por huerfano,
  no se crea)
- Verificar con npx tsc --noEmit que dev quede en 0 errores
- 'La rama se llama: fix-Corregir desfase de tipos con schema Supabase y errores TS
  en dev'
acceptance_criteria:
- 'CA-01: models.ts sincronizado con el schema real de Supabase: DatosRelojInsert
  agrega origen?: OrigenDato | null y reemplazado_por?: string | null (simetria con
  DatosReloj, migracion HU-25); SeveridadAlerta agrega ''leve'' (HU-99, varchar(20)
  en BD lo tolera)'
- 'CA-02: Codigo muerto eliminado: DatosClinicosConfig + upsertDatosClinicosConfig
  removidos de SupabaseProvider (ni tipo, ni funcion, ni tabla existen en Supabase)'
- 'CA-03: Imports DatoReloj (singular) corregidos a DatosReloj en DetalleSignoScreen
  y HistorialScreen'
- 'CA-04: Los 5 errores de UI/RN corregidos: PermissionButton (theme accent), BottomTabNavigator
  (Pressable), InicioScreen x2, DetalleSignoScreen (LineChart props), HistorialSintomasScreen
  (id en SintomasUsuario)'
- 'CA-05: GATE: npx tsc --noEmit con 0 errores en dev'
- 'CA-06: GATE: npx jest 149/149 pasando'
---

## Goal

Llevar dev a 0 errores de compilacion TypeScript sincronizando los tipos con el schema real de Supabase (desfase de HU-25/HU-99) y corrigiendo los errores de UI/RN restantes, sin cambios de comportamiento.

## Requirements

(none)

## Files in Scope

- `src/services/supabase/models.ts`
- `src/context/SupabaseProvider.tsx`
- `src/screens/DetalleSignoScreen.tsx`
- `src/screens/HistorialScreen.tsx`
- `src/screens/HistorialSintomasScreen.tsx`
- `src/screens/InicioScreen.tsx`
- `src/navigation/BottomTabNavigator.tsx`
- `src/components/PermissionButton.tsx`
- `src/context/HealthProvider.tsx`

## Constraints

- No cambiar comportamiento en runtime — solo tipos, imports y props de UI
- No tocar logica de negocio ni queries existentes en api.ts
- No crear tablas ni migraciones nuevas (DatosClinicosConfig se ELIMINA por huerfano, no se crea)
- Verificar con npx tsc --noEmit que dev quede en 0 errores
- La rama se llama: fix-Corregir desfase de tipos con schema Supabase y errores TS en dev

## Acceptance Criteria

- [ ] CA-01: models.ts sincronizado con el schema real de Supabase: DatosRelojInsert agrega origen?: OrigenDato | null y reemplazado_por?: string | null (simetria con DatosReloj, migracion HU-25); SeveridadAlerta agrega 'leve' (HU-99, varchar(20) en BD lo tolera)
- [ ] CA-02: Codigo muerto eliminado: DatosClinicosConfig + upsertDatosClinicosConfig removidos de SupabaseProvider (ni tipo, ni funcion, ni tabla existen en Supabase)
- [ ] CA-03: Imports DatoReloj (singular) corregidos a DatosReloj en DetalleSignoScreen y HistorialScreen
- [ ] CA-04: Los 5 errores de UI/RN corregidos: PermissionButton (theme accent), BottomTabNavigator (Pressable), InicioScreen x2, DetalleSignoScreen (LineChart props), HistorialSintomasScreen (id en SintomasUsuario)
- [ ] CA-05: GATE: npx tsc --noEmit con 0 errores en dev
- [ ] CA-06: GATE: npx jest 149/149 pasando

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### tsc-zero-errors
```bash
npx tsc --noEmit
```

Success: 0 errores TS (grep -c 'error TS' == 0) · Timeout: 120s
### jest-full-suite
```bash
npx jest
```

Success: exit code 0, 149/149 tests · Timeout: 180s
