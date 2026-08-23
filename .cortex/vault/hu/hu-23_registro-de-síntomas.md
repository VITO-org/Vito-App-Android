# HU-23: Registro de síntomas

**Release:** R1
**Sprint:** S4
**Épica:** Épica 2: Registro e Integración de Datos
**Desarrolladores:** Emma, Nico

---

## Goal

Registro de síntomas

## User Story

> **Como** usuario
> **Quiero** registrar síntomas y eventos relevantes
> **Para** complementar mi historial de sintomas

## Requirements

1. Registro de síntomas.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El usuario puede registrar síntomas desde un catálogo controlado.
- [ ] CA-02: El usuario puede indicar intensidad, descripción libre, fecha y hora.
- [ ] CA-03: El sistema clasifica el síntoma según el catálogo definido.

## Tasks

- [ ] Diseñar formularios de síntomas.
- [ ] Implementar catálogo de síntomas.
- [ ] Persistir eventos clínicos.

## Definition of Done

- [ ] El formulario de síntomas muestra el catálogo actualizado y permite selección múltiple.
- [ ] Intensidad, descripción, fecha y hora quedan guardados correctamente por cada entrada.
- [ ] Los síntomas se clasifican de forma automática según el catálogo.
- [ ] Las pruebas validan registro completo, clasificación correcta y campos opcionales vacíos.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-23, release-release-1, epic-épica-2, dev-cristian, dev-flor-galarza
