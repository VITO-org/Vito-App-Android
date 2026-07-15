# HU-41: Alerta por hipoxia

**Release:** R2
**Sprint:** S9
**Épica:** Épica 4: Sistema de Alertas Inteligentes
**Desarrolladores:** Emma, Nico

---

## Goal

Alerta por hipoxia

## User Story

> **Como** sistema
> **Quiero** generar una alerta inmediata cuando la saturación de oxígeno del usuario caiga por debajo del umbral definido
> **Para** intervenir antes de que su estado deteriore

## Requirements

1. Alerta por hipoxia.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El sistema detecta SpO₂ por debajo del umbral personalizado del usuario (por defecto: \<90%).
- [ ] CA-02: La alerta se genera en ≤30 segundos desde la lectura anómala.
- [ ] CA-03: La alerta indica: valor registrado, umbral configurado, hora y dispositivo de origen.
- [ ] CA-04: Se clasifica con nivel de severidad (advertencia / crítica) según profundidad del descenso.
- [ ] CA-05: Si no hay confirmación en 5 minutos, se escala al responsable de guardia.

## Tasks

- [ ] Implementar módulo de detección de hipoxia con umbral configurable.
- [ ] Implementar clasificación de severidad.
- [ ] Implementar lógica de escalamiento por falta de confirmación.
- [ ] Diseñar notificación con datos del evento.

## Definition of Done

- [ ] Lógica de detección de hipoxia implementada y testeada con datos reales e históricos.
- [ ] Pruebas unitarias con cobertura ≥80% sobre el módulo de umbral.
- [ ] Notificación entregada en ≤30 s en pruebas de carga (50 usuarios simultáneos).
- [ ] Flujo de escalamiento validado end-to-end en entorno de staging.
- [ ] Documentación técnica del módulo actualizada.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-41, release-release-2, epic-épica-4, dev-flor-galarza, dev-emma
