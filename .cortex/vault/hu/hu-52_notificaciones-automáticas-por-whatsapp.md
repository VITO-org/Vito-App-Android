# HU-52: Notificaciones automáticas por WhatsApp

**Release:** RELEASE 3
**Sprint:** Sprint 12 QA+Analisis (12 ago - 18 ago)
**Épica:** Épica 5: Sistema de Notificaciones
**Desarrolladores:** Emma

---

## Goal

Notificaciones automáticas por WhatsApp

## User Story

> **Como** sistema
> **Quiero** enviar mensajes automáticos por WhatsApp cuando se genere un evento relevante
> **Para** poder actuar sin necesidad de instalar la aplicación

## Requirements

1. Notificaciones automáticas por WhatsApp.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El sistema envía mensajes a través de WhatsApp Business API al número registrado del contacto.
- [ ] CA-02: El mensaje incluye: nombre del paciente, tipo de evento, descripción en lenguaje no técnico y timestamp.
- [ ] CA-03: El contacto puede responder "OK" o "Recibido" para confirmar lectura; la confirmación queda registrada.
- [ ] CA-04: Si el número no tiene WhatsApp, el sistema intenta entrega por SMS o correo electrónico como fallback automático.
- [ ] CA-05: El paciente debe haber otorgado consentimiento explícito para notificar a ese contacto sobre ese tipo de evento.
- [ ] CA-06: No se envían más de 3 mensajes por hora al mismo contacto, salvo alertas de severidad crítica.

## Tasks

- [ ] Integrar WhatsApp Business API con plantillas aprobadas por Meta.
- [ ] Implementar fallback a SMS y correo electrónico.
- [ ] Implementar flujo de consentimiento por contacto y tipo de evento.
- [ ] Implementar rate limiting de mensajes por contacto.

## Definition of Done

- [ ] Integración con WhatsApp Business API aprobada por Meta y funcional en entorno productivo.
- [ ] Plantillas de mensajes aprobadas por Meta para cada tipo de evento.
- [ ] Fallback a SMS implementado y verificado con números sin WhatsApp.
- [ ] Flujo de consentimiento del paciente por contacto y tipo de evento operativo y auditado.
- [ ] Límite de frecuencia implementado y testeado con escenarios de múltiples alertas simultáneas.
- [ ] Revisión legal del flujo de consentimiento y opt-out aprobada.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-52, release-release-3, epic-épica-5, dev-emma
