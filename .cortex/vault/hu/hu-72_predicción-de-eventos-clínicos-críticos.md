# HU-72: Predicción de eventos clínicos críticos

**Release:** R5
**Sprint:** S20
**Épica:** Épica 7: Funcionalidades de la IA
**Desarrolladores:** Flor Galarza, Emma, Nico

---

## Goal

Predicción de eventos clínicos críticos

## User Story

> **Como** sistema
> **Quiero** anticipar eventos como crisis hipertensivas y arritmias
> **Para** activar intervenciones preventivas antes de que ocurran

## Requirements

1. Predicción de eventos clínicos críticos.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: Dado que el sistema analiza tendencias de signos vitales, cuando el modelo detecta un patrón predictor de crisis hipertensiva, entonces genera una alerta predictiva con al menos X minutos de anticipación (definir X).
- [ ] CA-02: Dado que se detectan patrones de arritmia, cuando la señal cardíaca presenta irregularidades clasificables, entonces se activa una alerta de arritmia.
- [ ] CA-03: Dado que el sistema predice deterioro general, cuando múltiples indicadores convergen negativamente, entonces escala la alerta al nivel correspondiente.

## Tasks

- [ ] Entrenar modelo predictivo con datos etiquetados de eventos clínicos.
- [ ] Definir métricas de performance mínimas (precisión, recall).
- [ ] Definir umbral de confianza para disparar alertas.
- [ ] Integrar con el módulo de alertas de HU-71.
- [ ] Documentar comportamiento ante datos incompletos o ruidosos.

## Definition of Done

- [ ] Modelo entrenado con datos etiquetados de eventos clínicos.
- [ ] Métricas de performance definidas y alcanzadas (precisión y recall mínimo acordado).
- [ ] Umbral de confianza definido para disparar alertas.
- [ ] Integrado con el módulo de alertas de HU-71.
- [ ] Documentar el comportamiento ante datos incompletos o ruidosos.
- [ ] Tests unitarios e integración cubren escenarios de crisis hipertensiva, arritmia y deterioro general.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-72, release-release-5, epic-épica-7, dev-emma, dev-flor-galarza
