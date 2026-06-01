# HU-13: Recuperación de contraseña

**Release:** RELEASE 4
**Sprint:** Sprint 18 Desarrollo
**Épica:** Épica 1: Gestión de Usuarios y Acceso
**Desarrolladores:** Cristian, Flor Galarza

---

## Goal

Recuperación de contraseña

## User Story

> **Como** usuario
> **Quiero** recuperar mi contraseña mediante email
> **Para** volver a acceder a mi cuenta si olvidé mis credenciales

## Requirements

1. Recuperación de contraseña.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El usuario puede ingresar su email.
- [ ] CA-02: El sistema envía un enlace de recuperación.
- [ ] CA-03: El usuario puede definir una nueva contraseña.

## Tasks

- [ ] Diseñar flujo de recovery.
- [ ] Integrar envío de email.
- [ ] Actualizar contraseña.

## Definition of Done

- [ ] El mail de recuperación se envía en menos de 60 segundos desde la solicitud.
- [ ] El enlace de recuperación expira después de un tiempo definido (ej: 30 minutos).
- [ ] El usuario puede establecer una nueva contraseña válida mediante el enlace.
- [ ] Un enlace utilizado no puede reutilizarse.
- [ ] Las pruebas cubren enlace válido, enlace expirado y mail no registrado.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-13, release-release-4, epic-épica-1, dev-cristian, dev-flor-galarza
