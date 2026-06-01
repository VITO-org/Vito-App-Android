# HU-11: Inicio de sesión

> **Estado:** 🔴 No iniciada — Requiere Supabase (`@supabase/supabase-js`) para backend de auth. Proyecto RN listo para agregar la pantalla de login.

**Release:** RELEASE 1
**Sprint:** Sprint 1 QA+Analisis (26 may - 2 jun), Sprint 2 Desarrollo (3 jun - 9 jun)
**Épica:** Épica 1: Gestión de Usuarios y Acceso
**Desarrolladores:** Flor Gonzalez, Emma, Cristian

---

## Goal

Inicio de sesión

## User Story

> **Como** usuario
> **Quiero** iniciar sesión con mail y contraseña
> **Para** acceder de forma segura a mi cuenta

## Requirements

1. Inicio de sesión.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El usuario puede ingresar email y contraseña.
- [ ] CA-02: El sistema valida credenciales incorrectas.
- [ ] CA-03: El sistema redirige al dashboard luego del login exitoso.
- [ ] CA-04: La contraseña debe ocultarse visualmente.

## Tasks

- [ ] Diseñar pantalla login.
- [ ] Implementar validaciones.
- [ ] Integrar autenticación backend.

## Definition of Done

- [ ] La pantalla de login se visualiza correctamente en dispositivos móviles y web.
- [ ] Las credenciales incorrectas muestran mensaje de error claro sin revelar cuál campo es incorrecto.
- [ ] El login exitoso redirige al dashboard sin errores.
- [ ] La contraseña permanece oculta durante la escritura.
- [ ] Pruebas unitarias e integración cubren flujos exitosos y de error.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-11, release-release-1, epic-épica-1, dev-flor-gonzalez, dev-emma, dev-cristian
