# HU-12: Inicio de sesión con Google

**Release:** R5
**Sprint:** S23
**Épica:** Épica 1: Gestión de Usuarios y Acceso
**Desarrolladores:** Flor González, Cristian

---

## Goal

Inicio de sesión con Google

## User Story

> **Como** usuario
> **Quiero** iniciar sesión con mi cuenta Google
> **Para** acceder rápidamente a la aplicación

## Requirements

1. Inicio de sesión con Google.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El usuario puede autenticarse mediante Google OAuth.
- [ ] CA-02: El sistema crea la cuenta automáticamente si no existe.
- [ ] CA-03: El sistema vincula el método OAuth al usuario.

## Tasks

- [ ] Integrar Google OAuth.
- [ ] Gestionar tokens.
- [ ] Asociar cuenta Google.

## Definition of Done

- [ ] El flujo OAuth con Google funciona end-to-end en el entorno productivo.
- [ ] Si el usuario no existe, la cuenta se crea automáticamente con los datos provistos por Google.
- [ ] El token OAuth queda correctamente vinculado al usuario en la base de datos.
- [ ] Las pruebas cubren el primer acceso, acceso recurrente y error de autenticación.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-12, release-release-4, epic-épica-1, dev-flor-gonzalez
