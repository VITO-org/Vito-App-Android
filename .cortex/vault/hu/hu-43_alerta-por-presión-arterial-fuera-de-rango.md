# HU-43: Alerta por presión arterial fuera de rango

**Release:** RELEASE 2
**Sprint:** Sprint 5 Desarrollo
**Épica:** Épica 4: Sistema de Alertas Inteligentes
**Desarrolladores:** Flor Galarza, Nico

---

## Goal

Alerta por presión arterial fuera de rango

## User Story

> **Como** sistema
> **Quiero** generar alertas cuando la presión arterial sistólica o diastólixa del usuario salga de su rango seguro personalizado
> **Para** prevenir eventos hipertensivos o hipotensivos

## Requirements

1. Alerta por presión arterial fuera de rango.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El sistema evalúa de forma independiente la presión sistólica y la diastólica contra el perfil del usuario.
- [ ] CA-02: Se generan alertas diferenciadas: hipertensión (valores elevados) e hipotensión (valores bajos).
- [ ] CA-03: La alerta muestra: valor medido, rango esperado, diferencial y hora de medición.
- [ ] CA-04: Soporta umbrales distintos para contextos especiales (post-medicación, reposo nocturno).
- [ ] CA-05: Si ambos valores están fuera de rango, se emite una sola alerta combinada de mayor severidad.

## Tasks

- [ ] Implementar evaluación independiente de presión sistólica y diastólica.
- [ ] Implementar lógica de alerta combinada para ambos valores fuera de rango.
- [ ] Habilitar configuración de contextos especiales desde el perfil del paciente.
- [ ] Integrar con historial de presión arterial del paciente.

## Definition of Done

- [ ] Evaluación independiente de sistólica y diastólica implementada y testeada.
- [ ] Lógica de alerta combinada verificada con casos de prueba extrema.
- [ ] Configuración de contextos especiales accesible desde el perfil del paciente.
- [ ] Integración con el historial de presión arterial del paciente validada.
- [ ] Revisión clínica aprobada sobre rangos de hipertensión e hipotensión.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-43, release-release-2, epic-épica-4, dev-flor-galarza, dev-nico
