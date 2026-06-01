# HU-16: Registro de contactos de confianza

**Release:** RELEASE 3
**Sprint:** Sprint 12 QA+Analisis
**Épica:** Épica 1: Gestión de Usuarios y Acceso
**Desarrolladores:** Cristian, Nico

---

## Goal

Registro de contactos de confianza

## User Story

> **Como** usuario
> **Quiero** registrar familiares y médicos de confianza
> **Para** que puedan recibir alertas y reportes relevantes

## Requirements

1. Registro de contactos de confianza.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El usuario puede agregar contactos.
- [ ] CA-02: Cada contacto posee: nombre, rol, teléfono y email.
- [ ] CA-03: El usuario puede definir la frecuencia de notificaciones por contacto.

## Tasks

- [ ] Diseñar pantalla de contactos.
- [ ] Modelar relaciones usuario-contacto.
- [ ] Configurar preferencias de notificación.

## Definition of Done

- [ ] El usuario puede agregar, editar y eliminar contactos de confianza.
- [ ] Cada contacto almacena nombre, rol, teléfono y email correctamente.
- [ ] La frecuencia de notificaciones configurada se aplica efectivamente al envío de alertas.
- [ ] Los contactos y sus preferencias persisten entre sesiones.
- [ ] Pruebas validan alta, edición, eliminación y configuración de preferencias.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-16, release-release-3, epic-épica-1, dev-cristian, dev-nico
