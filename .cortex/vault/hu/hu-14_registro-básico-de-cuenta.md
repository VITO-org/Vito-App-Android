# HU-14: Registro básico de cuenta

> **Estado:** 🔴 No iniciada — Depende de HU-11 (Login). Requiere Supabase para backend de auth. Proyecto RN listo para agregar pantalla de registro.

**Release:** RELEASE 1
**Sprint:** Sprint 1 QA+Analisis (26 may - 2 jun), Sprint 2 Desarrollo (3 jun - 9 jun)
**Épica:** Épica 1: Gestión de Usuarios y Acceso
**Desarrolladores:** Flor Gonzalez, Cristian, Flor Galarza

---

## Goal

Registro básico de cuenta

## User Story

> **Como** usuario
> **Quiero** crear una cuenta nueva
> **Para** comenzar a utilizar VITO

## Requirements

1. Registro básico de cuenta.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El usuario puede registrar: nombre, email y contraseña.
- [ ] CA-02: El sistema valida campos obligatorios.
- [ ] CA-03: El sistema evita emails duplicados.

## Tasks

- [ ] Diseñar pantalla de registro.
- [ ] Implementar validaciones.
- [ ] Crear entidad usuario.

## Definition of Done

- [ ] El formulario de registro se muestra correctamente y es accesible.
- [ ] Los campos obligatorios vacíos muestran error descriptivo.
- [ ] El intento de registro con un email ya existente muestra mensajes informativos sin crear duplicados.
- [ ] El usuario registrado puede iniciar sesión de inmediato.
- [ ] Las pruebas cubren registro exitoso, campos vacíos y email duplicado.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-14, release-release-1, epic-épica-1, dev-flor-gonzalez, dev-cristian, dev-flor-galarza
