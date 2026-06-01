# HU-53: Notificación por variación del estado de ánimo

**Release:** RELEASE 5
**Sprint:** Sprint 19 QA+Analisis
**Épica:** Épica 5: Sistema de Notificaciones
**Desarrolladores:** Flor Galarza, Emma

---

## Goal

Notificación por variación del estado de ánimo

## User Story

> **Como** sistema
> **Quiero** enviar un mensaje automático cuando el sistema detecte variación significativa en el estado de ánimo del usuario
> **Para** que el contacto de confianza pueda contactarse o actuar de forma oportuna

## Requirements

1. Notificación por variación del estado de ánimo.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El sistema detecta variaciones del estado de ánimo basándose en señales configurables: autorregistro, patrones de actividad, variaciones en signos vitales o combinación de estas.
- [ ] CA-02: Se definen al menos tres estados de ánimo accionables: estable, bajo y crítico, con umbrales configurables por el equipo clínico.
- [ ] CA-03: El mensaje al contacto está redactado en lenguaje empático y no técnico, diferenciado por estado (ej. "Tu familiar está teniendo un momento difícil hoy").
- [ ] CA-04: El usuario puede activar o pausar temporalmente este tipo de notificaciones sin eliminar los contactos configurados.
- [ ] CA-05: No se envía notificación si el mismo estado se reportó en las últimas 4 horas para el mismo contacto (deduplicación por ventana temporal).
- [ ] CA-06: El sistema no revela al contacto información clínica específica; solo comunica el estado general.

## Tasks

- [ ] Implementar modelo de detección de estado de ánimo con sus tres niveles.
- [ ] Implementar plantillas de mensajes empáticos por nivel de estado.
- [ ] Implementar flujo de pausa temporal por parte del usuario.
- [ ] Implementar deduplicación por ventana de 4 horas.

## Definition of Done

- [ ] Modelo de detección de estado de ánimo definido, documentado y aprobado por el equipo clínico.
- [ ] Los tres estados (estable, bajo, crítico) con umbrales configurables implementados y verificados.
- [ ] Plantillas de mensajes redactadas, revisadas por el área clínica y aprobadas por el área legal.
- [ ] Flujo de preaprobación de plantillas por el usuario funcional en la app.
- [ ] Control de pausa temporal implementado y verificado (no notifica durante la pausa, retoma al vencimiento).
- [ ] Deduplicación por ventana de 4 horas verificada con tests de estado persistente.
- [ ] Validación de privacidad: confirmado que ningún mensaje expone datos clínicos crudos.
- [ ] Evaluación de riesgo clínico aprobada por el equipo médico.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-53, release-release-5, epic-épica-5, dev-flor-galarza, dev-emma
