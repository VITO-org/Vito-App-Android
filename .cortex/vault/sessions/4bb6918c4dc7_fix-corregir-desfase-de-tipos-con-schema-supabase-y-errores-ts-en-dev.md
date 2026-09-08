---
schema_version: 1
doc_type: session
title: 'fix: Corregir desfase de tipos con schema Supabase y errores TS en dev'
created_at: '2026-09-01T22:02:59.835032Z'
updated_at: '2026-09-01T22:02:59.835032Z'
tags:
- session
- session
- with-checkpoints
- handoff
status: handoff
links: []
vault_scope: local
fingerprint: 74a34d1ec23d31670e2646c48ae55cc68e9efbd9d5688f585e000c79dc67d245
session_id: 4bb6918c4dc7
pr: null
branch: null
commit: null
cortex_telemetry: null
---

## Original Specification

Llevar dev a 0 errores de compilacion TypeScript sincronizando los tipos con el schema real de Supabase (desfase de HU-25/HU-99) y corrigiendo los errores de UI/RN restantes, sin cambios de comportamiento.

## Changes Made

- modified: src/components/Card.tsx
- modified: src/components/PermissionButton.tsx
- modified: src/context/SupabaseProvider.tsx
- modified: src/navigation/BottomTabNavigator.tsx
- modified: src/screens/CompleteProfileScreen.tsx
- modified: src/screens/DetalleSignoScreen.tsx
- modified: src/screens/EditarPerfilScreen.tsx
- modified: src/screens/HistorialScreen.tsx
- modified: src/screens/HistorialSintomasScreen.tsx
- modified: src/screens/InicioScreen.tsx
- modified: src/services/supabase/models.ts

## Files Touched

- `✓ src/components/Card.tsx`
- `✓ src/components/PermissionButton.tsx`
- `✓ src/context/SupabaseProvider.tsx`
- `✓ src/navigation/BottomTabNavigator.tsx`
- `✓ src/screens/CompleteProfileScreen.tsx`
- `✓ src/screens/DetalleSignoScreen.tsx`
- `✓ src/screens/EditarPerfilScreen.tsx`
- `✓ src/screens/HistorialScreen.tsx`
- `✓ src/screens/HistorialSintomasScreen.tsx`
- `✓ src/screens/InicioScreen.tsx`
- `✓ src/services/supabase/models.ts`

## Key Decisions

- documenter: correccion puramente de tipos/imports/props, sin cambio de comportamiento runtime. NO amerita ADR. Tres errores quedaron enmascarados detras del de referenceLine (pressPointIndex, onFocus tipado) y se resolvieron al limpiar la API real. Verificar en CI que android-build pasa con tsc (continue-on-error tolera, pero ahora debe pasar limpio).
- documenter: 3 archivos no listados en files_in_scope de la spec pero transitivamente OBLIGATORIOS para los CA declarados. EditarPerfilScreen/CompleteProfileScreen: CA-02 exige eliminar updateClinicalConfig del provider; esas pantallas lo desestructuraban, sin tocarlas tsc rompia (CA-05 inalcanzable). Card.tsx: raiz del error InicioScreen (CA-04) era style?: ViewStyle sin StyleProp; fix en el componente es la API RN estandar. NO es scope creep ni feature nueva: son dependencias mecanicas de CA-02/CA-04. Ambos gates pasan (tsc 0 errores, jest 149/149) que son los acceptance criteria finales (CA-05/CA-06). El review_checkpoint stage 1 no modela dependencias transitivas; documentar como scope explicito y cerrar.

## Next Steps

- [ ] Implement: src/context/HealthProvider.tsx
- [ ] Decide if scope drift is intentional: src/components/Card.tsx, src/screens/CompleteProfileScreen.tsx, src/screens/EditarPerfilScreen.tsx

## Verified State

- Modified 8 file(s) inside spec scope
- verification hook 'tsc-zero-errors' passed
- verification hook 'jest-full-suite' passed

## Unverified Claims

- acceptance criterion: CA-01: models.ts sincronizado con el schema real de Supabase: DatosRelojInsert agrega origen?: OrigenDato | null y reemplazado_por?: string | null (simetria con DatosReloj, migracion HU-25); SeveridadAlerta agrega 'leve' (HU-99, varchar(20) en BD lo tolera)
- acceptance criterion: CA-02: Codigo muerto eliminado: DatosClinicosConfig + upsertDatosClinicosConfig removidos de SupabaseProvider (ni tipo, ni funcion, ni tabla existen en Supabase)
- acceptance criterion: CA-03: Imports DatoReloj (singular) corregidos a DatosReloj en DetalleSignoScreen y HistorialScreen
- acceptance criterion: CA-04: Los 5 errores de UI/RN corregidos: PermissionButton (theme accent), BottomTabNavigator (Pressable), InicioScreen x2, DetalleSignoScreen (LineChart props), HistorialSintomasScreen (id en SintomasUsuario)
- acceptance criterion: CA-05: GATE: npx tsc --noEmit con 0 errores en dev
- acceptance criterion: CA-06: GATE: npx jest 149/149 pasando
