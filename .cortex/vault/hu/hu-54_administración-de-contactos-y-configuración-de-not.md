# HU-54: Administración de contactos y configuración de notificaciones

**Release:** RELEASE 3
**Sprint:** Sprint 12 QA+Analisis (12 ago - 18 ago)
**Épica:** Épica 5: Sistema de Notificaciones
**Desarrolladores:** Flor Gonzalez, Flor Galarza

---

## Goal

Administración de contactos y configuración de notificaciones

## User Story

> **Como** usuario
> **Quiero** administrar mis contactos de confianza y definir qué eventos les notifica el sistema
> **Para** tener control total sobre mi privacidad

## Requirements

1. Administración de contactos y configuración de notificaciones.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El usuario puede agregar, editar y eliminar contactos indicando nombre, relación y número de WhatsApp o email.
- [ ] CA-02: Por cada contacto el usuario configura: qué tipos de evento lo notifican (fisiológico, medicación, estado de ánimo) y por qué canal (app interna, WhatsApp).
- [ ] CA-03: El sistema solicita confirmación al contacto antes de activarlo (opt-in), enviando un mensaje de bienvenida con opción de aceptar o rechazar.
- [ ] CA-04: Si el contacto rechaza o no confirma en 48 horas, queda en estado pendiente y no recibe notificaciones.
- [ ] CA-05: El usuario puede designar un contacto como "principal" que recibe todas las alertas, y otros como "secundarios" con configuración granular.
- [ ] CA-06: Los cambios en la configuración se aplican de forma inmediata sin efecto retroactivo.
- [ ] CA-07: El historial de notificaciones enviadas a cada contacto es visible para el usuario con estado de entrega.

## Tasks

- [ ] Implementar CRUD de contactos con validación de formato.
- [ ] Implementar configuración granular por contacto × tipo de evento × canal.
- [ ] Implementar flujo de opt-in con mensaje de bienvenida y vencimiento de 48 h.
- [ ] Implementar designación de contacto principal y secundarios.
- [ ] Implementar historial de notificaciones por contacto.

## Definition of Done

- [ ] CRUD de contactos implementado con validación de formato de número y email.
- [ ] Configuración granular por contacto × tipo de evento × canal persistida y operativa.
- [ ] Flujo de opt-in implementado: mensaje de bienvenida enviado, confirmación registrada, vencimiento de 48 h con estado pendiente.
- [ ] Designación de contacto principal funcional y con comportamiento verificado en escenarios de múltiples alertas simultáneas.
- [ ] Aplicación inmediata de cambios verificada (sin efecto retroactivo confirmado en tests).
- [ ] Historial de notificaciones por contacto visible en la interfaz del usuario y aprobado por UX.
- [ ] Pruebas de privacidad: un contacto eliminado no recibe ninguna notificación posterior al borrado.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-54, release-release-3, epic-épica-5, dev-flor-gonzalez, dev-flor-galarza
