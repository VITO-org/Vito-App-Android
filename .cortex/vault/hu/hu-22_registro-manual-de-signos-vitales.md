# HU-22: Registro manual de signos vitales

**Release:** R1
**Sprint:** S3
**Épica:** Épica 2: Registro e Integración de Datos
**Desarrolladores:** Emma, Nico

---

## Goal

Registro manual de signos vitales

## User Story

> **Como** sistema
> **Quiero** recibir los signos vitales
> **Para** mantener actualizado el monitoreo de salud

## Requirements

1. Registro manual de signos vitales.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El sistema puede registrar: presión arterial, frecuencia cardíaca, temperatura y oxigenación.
- [ ] CA-02: Cada registro almacena fecha y hora del momento de carga.
- [ ] CA-03: El sistema valida formato y consistencia temporal de los registros.

## Tasks

- [ ] Diseñar formulario manual de ingreso.
- [ ] Registrar timestamps automáticos.
- [ ] Validar coherencia temporal entre registros.

## Definition of Done

- [ ] El formulario permite ingresar los cuatro signos vitales con fecha y hora.
- [ ] Cada registro guarda el timestamp correcto en UTC.
- [ ] Registros con inconsistencias temporales son marcados o rechazados.
- [ ] Las pruebas cubren registro completo, campos faltantes y duplicados temporales.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-22, release-release-1, epic-épica-2, dev-flor-gonzalez, dev-emma
