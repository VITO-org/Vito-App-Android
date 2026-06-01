# HU-45: Reducción de falsas alarmas multivariable

**Release:** RELEASE 5
**Sprint:** Sprint 19 QA+Analisis (30 sep - 6 oct)
**Épica:** Épica 4: Sistema de Alertas Inteligentes
**Desarrolladores:** Flor Galarza, Emma

---

## Goal

Reducción de falsas alarmas multivariable

## User Story

> **Como** sistema
> **Quiero** quiero evaluar múltiples señales en conjunto antes de emitir una alerta
> **Para** para notificar alertas con alta probabilidad de ser clínicamente relevantes.

## Requirements

1. Reducción de falsas alarmas multivariable.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El modelo considera al menos tres variables fisiológicas de forma simultánea antes de emitir una alerta.
- [ ] CA-02: Cada alerta incluye un score de confianza (0-100%) que refleja la certeza del modelo.
- [ ] CA-03: Alertas con score \<60% se retienen o se envían como "notificación informativa" de menor prioridad.
- [ ] CA-04: El sistema registra todas las alertas generadas (emitidas y retenidas) con su score para análisis posterior.
- [ ] CA-05: La tasa de falsas alarmas puede auditarse por período y tipo de alerta desde el panel de administración.
- [ ] CA-06: El profesional puede reportar una alerta como falso positivo, retroalimentando al modelo.

## Tasks

- [ ] Entrenar y evaluar modelo multivariable de alertas.
- [ ] Implementar score de confianza visible en cada alerta.
- [ ] Implementar lógica de retención de alertas con score \<60%.
- [ ] Implementar log completo de alertas emitidas y retenidas.
- [ ] Implementar panel de auditoría de falsas alarmas.
- [ ] Conectar flujo de feedback de falso positivo al pipeline de reentrenamiento.

## Definition of Done

- [ ] Modelo multivariable entrenado, evaluado y con métricas de precisión documentadas (precisión, recall, F1).
- [ ] Score de confianza visible en cada alerta emitida.
- [ ] Lógica de retención de alertas con score \<60% implementada y testeada.
- [ ] Log completo de alertas (emitidas \+ retenidas) persistido y consultable.
- [ ] Panel de auditoría de falsas alarmas funcional y aprobado por el área clínica.
- [ ] Flujo de feedback de falso positivo conectado al pipeline de reentrenamiento del modelo.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-45, release-release-5, epic-épica-4, dev-flor-galarza, dev-emma
