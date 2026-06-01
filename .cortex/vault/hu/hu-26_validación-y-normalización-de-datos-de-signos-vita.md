# HU-26: Validación y normalización de datos de signos vitales

**Release:** RELEASE 1
**Sprint:** Sprint 3 Desarrollo
**Épica:** Épica 2: Registro e Integración de Datos
**Desarrolladores:** Nico

---

## Goal

Validación y normalización de datos de signos vitales

## User Story

> **Como** sistema
> **Quiero** validar y normalizar datos de signos vitales
> **Para** garantizar consistencia e interoperabilidad

## Requirements

1. Validación y normalización de datos de signos vitales.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El sistema normaliza unidades clínicas a un estándar definido.
- [ ] CA-02: El sistema almacena todos los timestamps en UTC.
- [ ] CA-03: El sistema detecta datos fuera de rango fisiológico.
- [ ] CA-04: El sistema marca los registros sospechosos para revisión.

## Tasks

- [ ] Implementar normalización de unidades.
- [ ] Validar rangos fisiológicos.
- [ ] Implementar detección de outliers.

## Definition of Done

- [ ] Todas las unidades clínicas se normalizan correctamente al estándar definido.
- [ ] Los timestamps se almacenan en UTC sin excepción.
- [ ] Los outliers son detectados y marcados como sospechosos en la base de datos.
- [ ] Las pruebas cubren datos válidos, datos en límite y datos fuera de rango para cada signo vital.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-26, release-release-1, epic-épica-2, dev-nico
