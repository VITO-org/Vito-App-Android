---
title: "Adaptación Supabase a arquitectura React Native"
goal: "Adaptar la integración con Supabase desde la branch conexion-supabase (Android nativo) a la arquitectura React Native actual. Incluye cliente TS, modelos de datos, capa API y provider de contexto."
tags: [supabase, backend, auth, api, conexion-supabase]
status: closed
created: 2026-06-04
---

## Requirements

1. Instalar @supabase/supabase-js y react-native-url-polyfill
2. Crear cliente Supabase en TypeScript con credenciales existentes
3. Traducir los 14 modelos de datos Kotlin a TypeScript
4. Crear capa CRUD tipada (auth, perfil, signos vitales, baseline, contactos, sintomas)
5. Crear SupabaseProvider context con manejo de sesión
6. Aplicar schema SQL (11 tablas, 6 enums) en Supabase cloud
7. Verificar compilación TypeScript sin errores

## Files in scope

- src/services/supabase/client.ts
- src/services/supabase/models.ts
- src/services/supabase/api.ts
- src/services/supabase/schema.sql
- src/context/SupabaseProvider.tsx
- App.tsx
- package.json

## Constraints

- No modificar el módulo nativo de Health Connect existente
- Mantener separación: Kotlin = solo plataforma, TS = negocio + API
- Reutilizar credenciales Supabase existentes de la branch conexion-supabase

## Acceptance criteria

- TypeScript compila sin errores
- Schema SQL ejecutado sin errores en Supabase
- SupabaseProvider envuelve la app en App.tsx
- Capa API exporta funciones para auth, CRUD de signos vitales, perfil, baseline, contactos y síntomas

## Verification hooks

- name: TypeScript compilation
  command: npx tsc --noEmit
  required: true
  success_criteria: exit code 0
