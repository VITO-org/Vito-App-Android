# HU-44: Ajuste automático de umbrales según baseline

**Release:** RELEASE 5
**Sprint:** Sprint 19 QA+Analisis (30 sep - 6 oct), Sprint 21 Desarrollo (14 oct - 20 oct)
**Épica:** Épica 4: Sistema de Alertas Inteligentes
**Desarrolladores:** Flor Galarza, Emma

---

## Goal

Ajuste automático de umbrales según baseline

## User Story

> **Como** usuario
> **Quiero** que el sistema calcule y ajuste automáticamente los umbrales de alerta en base al historial basal
> **Para** evitar falsas alarmas por variaciones fisiológicas normales

## Requirements

1. Ajuste automático de umbrales según baseline.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El sistema calcula el baseline individual con al menos 7 días de lecturas validadas.
- [ ] CA-02: Los umbrales se recalculan automáticamente cada 24 horas o ante cambios clínicos significativos.
- [ ] CA-03: El profesional puede visualizar el baseline actual y su historial de variaciones.
- [ ] CA-04: Es posible sobrescribir manualmente los umbrales calculados, con registro de auditoría del cambio.
- [ ] CA-05: Si los datos son insuficientes para calcular el baseline, se aplican valores por defecto clínicos y se notifica al profesional.

## Tasks

- [ ] Implementar algoritmo de cálculo de baseline individual.
- [ ] Implementar recalculación automática cada 24 horas.
- [ ] Implementar pantalla de visualización del baseline y su historial.
- [ ] Implementar log de auditoría para sobrescrituras manuales.
- [ ] Gestionar comportamiento con datos insuficientes.

## Definition of Done

- [ ] Algoritmo de cálculo de baseline implementado, documentado y revisado por el equipo de data science.
- [ ] Recalculación automática cada 24 h verificada en pruebas de integración.
- [ ] Pantalla de visualización del baseline aprobada por UX y por el equipo clínico.
- [ ] Log de auditoría de sobrescritura manual persistente en base de datos.
- [ ] Comportamiento con datos insuficientes testeado con pacientes nuevos (0-6 días de historial).


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-44, release-release-5, epic-épica-4, dev-flor-galarza, dev-emma
