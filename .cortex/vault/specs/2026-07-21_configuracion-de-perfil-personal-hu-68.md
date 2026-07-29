---
schema_version: 1
doc_type: spec
title: Configuración de Perfil Personal - HU-68
created_at: '2026-07-21T20:43:08.275609Z'
updated_at: '2026-07-21T20:43:08.275609Z'
tags:
- spec
- hu-68
- perfil
- configuracion
- supabase
- react-native
status: draft
links: []
vault_scope: local
fingerprint: e8e898c77dd2bd31119270d650554cd0a030972a54104adbefe1e9968af94199
verification_hooks:
- name: TypeScript compilation
  command: npx tsc --noEmit
  required: true
  success_criteria: exit code 0, no type errors
  timeout_seconds: 300
- name: Lint check
  command: npx eslint src/screens/EditarPerfilScreen.tsx src/screens/CompleteProfileScreen.tsx
  required: true
  success_criteria: exit code 0, no lint errors
  timeout_seconds: 300
goal: 'Implementar la configuración completa del perfil personal: permitir al usuario
  editar todos sus datos personales desde PerfilScreen, incluyendo campos faltantes
  (género, nacionalidad), mejorar la validación en tiempo real y asegurar la persistencia
  correcta a Supabase.'
files_in_scope:
- src/screens/EditarPerfilScreen.tsx
- src/screens/CompleteProfileScreen.tsx
- src/screens/PerfilScreen.tsx
- src/services/supabase/models.ts
- src/services/supabase/api.ts
- src/context/SupabaseProvider.tsx
constraints:
- Compatibilidad con Android 14+ (API 34+)
- Mantener arquitectura React Native existente
- Usar theme definido (colors.ts, spacing.ts)
- No romper flujo de registro existente
- Los datos sensibles deben manejarse de forma segura
acceptance_criteria:
- El usuario puede ver y editar todos sus datos personales desde PerfilScreen
- Los campos género y nacionalidad están disponibles en EditarPerfilScreen
- La validación muestra errores en tiempo real mientras el usuario escribe
- Los datos de altura y peso persisten correctamente en datos_clinicos_config
- El formulario pre-carga correctamente los datos existentes del perfil
- El flujo de navegación PerfilScreen → EditarPerfil funciona correctamente
---

## Goal

Implementar la configuración completa del perfil personal: permitir al usuario editar todos sus datos personales desde PerfilScreen, incluyendo campos faltantes (género, nacionalidad), mejorar la validación en tiempo real y asegurar la persistencia correcta a Supabase.

## Requirements

- Agregar campos faltantes de género y nacionalidad a EditarPerfilScreen
- Mejorar la validación en tiempo real del formulario de perfil
- Asegurar persistencia correcta de altura/peso en datos_clinicos_config
- Mantener coherencia entre CompleteProfileScreen y EditarPerfilScreen
- Validar que todos los campos del schema perfil_usuario estén cubiertos en la UI

## Files in Scope

- `src/screens/EditarPerfilScreen.tsx`
- `src/screens/CompleteProfileScreen.tsx`
- `src/screens/PerfilScreen.tsx`
- `src/services/supabase/models.ts`
- `src/services/supabase/api.ts`
- `src/context/SupabaseProvider.tsx`

## Constraints

- Compatibilidad con Android 14+ (API 34+)
- Mantener arquitectura React Native existente
- Usar theme definido (colors.ts, spacing.ts)
- No romper flujo de registro existente
- Los datos sensibles deben manejarse de forma segura

## Acceptance Criteria

- [ ] El usuario puede ver y editar todos sus datos personales desde PerfilScreen
- [ ] Los campos género y nacionalidad están disponibles en EditarPerfilScreen
- [ ] La validación muestra errores en tiempo real mientras el usuario escribe
- [ ] Los datos de altura y peso persisten correctamente en datos_clinicos_config
- [ ] El formulario pre-carga correctamente los datos existentes del perfil
- [ ] El flujo de navegación PerfilScreen → EditarPerfil funciona correctamente

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### TypeScript compilation
```bash
npx tsc --noEmit
```

Success: exit code 0, no type errors · Timeout: 300s
### Lint check
```bash
npx eslint src/screens/EditarPerfilScreen.tsx src/screens/CompleteProfileScreen.tsx
```

Success: exit code 0, no lint errors · Timeout: 300s
