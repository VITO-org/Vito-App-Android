# HU-82: Advertencia al guardar configuraciones peligrosas

**Release:** R5
**Sprint:** S21
**Épica:** Épica 8: Adaptar Funcionalidades al Perfil Clínico
**Desarrolladores:** Nico, Cristian

---

## Goal

Advertencia al guardar configuraciones peligrosas

## User Story

> **Como** sistema
> **Quiero** advertir cuando se intenten guardar rangos o umbrales médicamente peligrosos
> **Para** prevenir configuraciones que pongan en riesgo al usuario

## Requirements

1. Advertencia al guardar configuraciones peligrosas.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: Cuando se intenta guardar un rango o umbral fuera de los límites médicamente aceptables, el sistema muestra una advertencia clara con el rango seguro sugerido.
- [ ] CA-02: La advertencia bloquea automáticamente el guardado hasta que el usuario confirme explícitamente que desea continuar.

## Tasks

- [ ] Definir límites médicamente aceptables por condición.
- [ ] Implementar advertencia con indicación del rango seguro sugerido.
- [ ] Implementar flujo de confirmación explícita del usuario.

## Definition of Done

- [ ] Límites médicamente aceptables definidos por condición.
- [ ] Advertencia implementada con indicación del rango seguro sugerido.
- [ ] Flujo de confirmación explícita implementado y no bypassable.
- [ ] Tests con valores límite, dentro de rango y fuera de rango para cada condición.
- [ ] Revisión clínica de los límites aprobada por el equipo médico.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-82, release-release-3, epic-épica-8, dev-cristian, dev-emma
