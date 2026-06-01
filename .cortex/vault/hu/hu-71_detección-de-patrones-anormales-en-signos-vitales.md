# HU-71: Detección de patrones anormales en signos vitales

**Release:** RELEASE 5
**Sprint:** Sprint 19 QA+Analisis (30 sep - 6 oct)
**Épica:** Épica 7: Funcionalidades de la IA
**Desarrolladores:** Emma, Flor Galarza

---

## Goal

Detección de patrones anormales en signos vitales

## User Story

> **Como** sistema
> **Quiero** identificar patrones anormales en los signos vitales del usuario
> **Para** alertar ante situaciones de riesgo antes de que escalen

## Requirements

1. Detección de patrones anormales en signos vitales.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: Dado que el sistema recibe signos vitales en tiempo real, cuando un valor supera el umbral definido por rango clínico o desvío histórico del usuario, entonces genera una alerta clasificada por severidad (leve / moderada / crítica).
- [ ] CA-02: Dado que existe un historial del usuario, cuando un signo vital se desvía más de N% de su baseline personal, entonces se registra como anomalía aunque esté dentro de rangos poblacionales normales.
- [ ] CA-03: Dado que se detecta una anomalía, cuando ocurre, entonces queda registrada con timestamp, tipo, valor y contexto.

## Tasks

- [ ] Implementar algoritmo de detección de anomalías con umbrales configurables.
- [ ] Implementar cálculo del baseline personal a partir del historial.
- [ ] Implementar persistencia de anomalías con timestamp, tipo, valor y contexto.
- [ ] Implementar clasificación de alertas por severidad.

## Definition of Done

- [ ] Algoritmo de detección implementado y testeado con datos reales o sintéticos.
- [ ] Umbrales configurables por tipo de signo vital.
- [ ] Baseline personal calculado a partir del historial.
- [ ] Alertas persistentes en base de datos.
- [ ] Tests unitarios con casos normales, límite y anómalos.
- [ ] Sin falsos negativos en casos críticos en el set de prueba.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-71, release-release-5, epic-épica-7, dev-emma, dev-flor-galarza
