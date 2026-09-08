---
schema_version: 1
doc_type: spec
title: Registro contacto confianza
created_at: '2026-09-08T21:20:55.072856Z'
updated_at: '2026-09-08T21:20:55.072856Z'
tags:
- spec
- hu-16
- contactos
- confianza
- supabase
- release-r3
- epica-1
status: draft
links: []
vault_scope: local
fingerprint: 79c5295340eee7cebe3b6812e5cb4fa92851ab0d674cc5a78aba48317f220933
verification_hooks:
- name: tsc-zero-errors
  command: npx tsc --noEmit
  required: true
  success_criteria: 0 errores TS
  timeout_seconds: 120
- name: jest-full-suite
  command: npx jest
  required: true
  success_criteria: exit code 0, 149/149 tests
  timeout_seconds: 180
goal: 'Implementar el registro de contactos de confianza (HU-16): el usuario autenticado
  puede agregar, editar y eliminar familiares y médicos de confianza (nombre, rol,
  teléfono, email) que recibirán alertas y reportes relevantes, con preferencia de
  frecuencia de notificaciones por contacto.'
files_in_scope:
- src/services/supabase/schema.sql
- src/services/supabase/models.ts
- src/services/supabase/api.ts
- src/screens/ContactosConfianzaScreen.tsx
- src/screens/PerfilScreen.tsx
- src/navigation/RootNavigator.tsx
- scripts/migrations/2026-09-08_hu16_contacto_confianza.sql
constraints:
- No cambiar comportamiento de modulos existentes fuera del scope declarado
- Los datos sensibles (telefono/email) se manejan via RLS en Supabase, solo el dueno
  puede leer/escribir sus contactos
- Android 14+ (API 34+), arquitectura React Native existente
- Los contactos nuevos no pueden ser el propio usuario (validacion email/telefono
  distinto)
acceptance_criteria:
- 'CA-01: El usuario puede agregar contactos'
- 'CA-02: Cada contacto posee: nombre, rol, teléfono y email'
- 'CA-03: El usuario puede definir la frecuencia de notificaciones por contacto'
- 'CA-04: Tabla contacto_confianza creada con RLS (select/insert/update/delete own):
  columnas id, id_usuario, nombre, relacion, telefono, email, frecuencia_notificacion'
- 'CA-05: API supabase (api.ts) con getContactos, insertContacto, updateContacto,
  deleteContacto'
- 'CA-06: GATE: npx tsc --noEmit con 0 errores'
- 'CA-07: GATE: npx jest 149/149 pasando'
---

## Goal

Implementar el registro de contactos de confianza (HU-16): el usuario autenticado puede agregar, editar y eliminar familiares y médicos de confianza (nombre, rol, teléfono, email) que recibirán alertas y reportes relevantes, con preferencia de frecuencia de notificaciones por contacto.

## User Story

> **Como** usuario
> **Quiero** registrar familiares y médicos de confianza
> **Para** que puedan recibir alertas y reportes relevantes

## Requirements

- El usuario autenticado puede agregar contactos de confianza (familiares/médicos)
- Cada contacto posee: nombre, rol, teléfono y email
- El usuario puede configurar la frecuencia de notificaciones por contacto
- Los contactos se persisten en Supabase (nueva tabla contacto_confianza) y sobreviven entre sesiones
- La UI sigue el theme de VITO (colores, spacing, Card, PrimaryButton)
- Disponible para usuarios autenticados; acceso desde PerfilScreen

## Files in Scope

- `src/services/supabase/schema.sql`
- `src/services/supabase/models.ts`
- `src/services/supabase/api.ts`
- `src/screens/ContactosConfianzaScreen.tsx`
- `src/screens/PerfilScreen.tsx`
- `src/navigation/RootNavigator.tsx`
- `scripts/migrations/2026-09-08_hu16_contacto_confianza.sql`

## Constraints

- No cambiar comportamiento de modulos existentes fuera del scope declarado
- Los datos sensibles (telefono/email) se manejan via RLS en Supabase, solo el dueno puede leer/escribir sus contactos
- Android 14+ (API 34+), arquitectura React Native existente
- Los contactos nuevos no pueden ser el propio usuario (validacion email/telefono distinto)
- El script SQL de la migración lo ejecuta el usuario manualmente en Supabase (no hay push de migraciones automatizado)

## Acceptance Criteria

- [ ] CA-01: El usuario puede agregar contactos
- [ ] CA-02: Cada contacto posee: nombre, rol, teléfono y email
- [ ] CA-03: El usuario puede definir la frecuencia de notificaciones por contacto
- [ ] CA-04: Tabla contacto_confianza creada con RLS (select/insert/update/delete own) — columnas: id, id_usuario, nombre, relacion, telefono, email, frecuencia_notificacion
- [ ] CA-05: API supabase (api.ts) con getContactos, insertContacto, updateContacto, deleteContacto
- [ ] CA-06: GATE: npx tsc --noEmit con 0 errores
- [ ] CA-07: GATE: npx jest 149/149 pasando

## Definition of Done

- [ ] El usuario puede agregar, editar y eliminar contactos de confianza
- [ ] Cada contacto almacena nombre, rol, teléfono y email correctamente
- [ ] La frecuencia de notificaciones configurada se aplica efectivamente al envío de alertas
- [ ] Los contactos y sus preferencias persisten entre sesiones
- [ ] Pruebas validan alta, edición, eliminación y configuración de preferencias

## Tasks

### Backend
- [ ] Crear tabla contacto_confianza con RLS (select/insert/update/delete own): columna id UUID PK, id_usuario UUID REFERENCES usuario(id) ON DELETE CASCADE, nombre, relacion, telefono, email. Policies select_own/insert_own/update_own/delete_own siguiendo el patrón de baseline_clinico/perfil_usuario (NO repetir el gap de RLS que tuvo datos_reloj)
- [ ] Funciones api.ts: getContactos, insertContacto, updateContacto, deleteContacto

### Frontend
- [ ] Pantalla de contactos de confianza (lista + alta/edición/borrado)
- [ ] Formulario de contacto con validación de teléfono/email: EVALUAR sumar react-hook-form + zod como dependencias (hoy no están en package.json) o seguir el patrón de validación manual existente

### QA
- [ ] Tests: RLS cross-user denegado + CRUD de contacto

## Nota de ejecución

- El script SQL de migración se genera para que el USUARIO lo corra manualmente en Supabase (no se aplica desde el repo)
- Decisión pendiente de definición: react-hook-form + zod vs validación manual (evaluar en el design doc antes de implementar)

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### tsc-zero-errors
```bash
npx tsc --noEmit
```

Success: 0 errores TS · Timeout: 120s
### jest-full-suite
```bash
npx jest
```

Success: exit code 0, 149/149 tests · Timeout: 180s
