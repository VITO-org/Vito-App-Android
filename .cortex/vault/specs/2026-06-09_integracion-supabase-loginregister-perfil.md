---
schema_version: 1
doc_type: spec
title: Integración Supabase + Login/Register + Perfil
created_at: '2026-06-09T22:40:37.904294Z'
updated_at: '2026-06-09T22:40:37.904294Z'
tags:
- spec
- supabase
- auth
- login
- register
- perfil
- sesion
- async-storage
- dev-pruebas
status: draft
links: []
vault_scope: local
fingerprint: bf044b732e6f17aa9771022a7a6e0e24fdb585e7bbaf69a734ab127168473aac
verification_hooks: []
goal: 'Completar la integración de Supabase en la rama dev-pruebas: backend de autenticación
  (email/password), persistencia de sesión con AsyncStorage, pantallas de Login y
  Register, gestión de perfil con nombre real y cierre de sesión, y visualización
  del nombre del usuario en el dashboard principal.'
files_in_scope:
- src/services/supabase/client.ts
- src/services/supabase/api.ts
- src/services/supabase/models.ts
- src/services/supabase/schema.sql
- src/context/SupabaseProvider.tsx
- src/screens/LoginScreen.tsx
- src/screens/RegisterScreen.tsx
- src/screens/PerfilScreen.tsx
- src/screens/InicioScreen.tsx
- src/navigation/RootNavigator.tsx
- App.tsx
- android/app/src/main/AndroidManifest.xml
- android/app/src/main/java/com/vito/healthconnect/nativeModule/VitoHealthPackage.kt
- android/app/src/main/java/com/vito/healthconnect/nativeModule/VitoHealthModule.kt
- android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt
- android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthSummary.kt
- android/app/src/main/java/com/vito/healthconnect/MainApplication.kt
- android/app/src/main/java/com/vito/healthconnect/MainActivity.kt
- package.json
constraints:
- Usar autenticación email/password sin confirmación de email (modo desarrollo)
- Persistir sesión con AsyncStorage para que el usuario no tenga que loguearse cada
  vez
- El botón de cerrar sesión debe mostrar confirmación antes de ejecutarse
- Los datos del perfil deben cargarse desde Supabase al iniciar sesión
- 'No implementar RLS todavía (prioridad: funcionalidad básica)'
acceptance_criteria:
- Usuario puede registrarse con email y contraseña y queda logueado automáticamente
- Usuario puede iniciar sesión con credenciales existentes
- Al cerrar y reabrir la app, la sesión se mantiene
- En el Home se muestra el nombre del usuario (desde perfil o email)
- En PerfilScreen se ve un botón de Cerrar Sesión que funciona
- El botón Google Sign-In está presente pero muestra error si no está configurado
---

## Goal

Completar la integración de Supabase en la rama dev-pruebas: backend de autenticación (email/password), persistencia de sesión con AsyncStorage, pantallas de Login y Register, gestión de perfil con nombre real y cierre de sesión, y visualización del nombre del usuario en el dashboard principal.

## Requirements

- Configurar cliente Supabase con AsyncStorage para persistir sesión
- Implementar pantallas de Login y Register conectadas a Supabase Auth
- Crear SupabaseProvider con estado de sesión y perfil
- Agregar botón de Cerrar Sesión en PerfilScreen con confirmación
- Mostrar nombre real del usuario (desde perfil o email) en InicioScreen
- Integrar módulo nativo Health Connect (Kotlin) para lectura de signos vitales
- Desactivar confirmación de email en Supabase para desarrollo
- Instalar dependencias npm faltantes (async-storage)

## Files in Scope

- `src/services/supabase/client.ts`
- `src/services/supabase/api.ts`
- `src/services/supabase/models.ts`
- `src/services/supabase/schema.sql`
- `src/context/SupabaseProvider.tsx`
- `src/screens/LoginScreen.tsx`
- `src/screens/RegisterScreen.tsx`
- `src/screens/PerfilScreen.tsx`
- `src/screens/InicioScreen.tsx`
- `src/navigation/RootNavigator.tsx`
- `App.tsx`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/java/com/vito/healthconnect/nativeModule/VitoHealthPackage.kt`
- `android/app/src/main/java/com/vito/healthconnect/nativeModule/VitoHealthModule.kt`
- `android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthDataProvider.kt`
- `android/app/src/main/java/com/vito/healthconnect/nativeModule/HealthSummary.kt`
- `android/app/src/main/java/com/vito/healthconnect/MainApplication.kt`
- `android/app/src/main/java/com/vito/healthconnect/MainActivity.kt`
- `package.json`

## Constraints

- Usar autenticación email/password sin confirmación de email (modo desarrollo)
- Persistir sesión con AsyncStorage para que el usuario no tenga que loguearse cada vez
- El botón de cerrar sesión debe mostrar confirmación antes de ejecutarse
- Los datos del perfil deben cargarse desde Supabase al iniciar sesión
- No implementar RLS todavía (prioridad: funcionalidad básica)

## Acceptance Criteria

- [ ] Usuario puede registrarse con email y contraseña y queda logueado automáticamente
- [ ] Usuario puede iniciar sesión con credenciales existentes
- [ ] Al cerrar y reabrir la app, la sesión se mantiene
- [ ] En el Home se muestra el nombre del usuario (desde perfil o email)
- [ ] En PerfilScreen se ve un botón de Cerrar Sesión que funciona
- [ ] El botón Google Sign-In está presente pero muestra error si no está configurado

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

*(none declared — legacy spec; finish-session will skip verification)*
