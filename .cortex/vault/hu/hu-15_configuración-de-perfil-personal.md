# HU-15: Configuración de perfil personal

**Release:** RELEASE 1
**Sprint:** Sprint 1 QA+Analisis, Sprint 3 Desarrollo
**Épica:** Épica 1: Gestión de Usuarios y Acceso
**Desarrolladores:** Flor Gonzalez, Cristian, Emma, Flor Galarza

---

## Goal

Configuración de perfil personal

## User Story

> **Como** usuario
> **Quiero** registrar mis datos personales
> **Para** personalizar mis datos de salud

## Requirements

1. Configuración de perfil personal.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El usuario puede registrar: nombre, apellido, DNI, fecha de nacimiento, sexo biológico, género y nacionalidad.
- [ ] CA-02: El sistema calcula automáticamente la edad a partir de la fecha de nacimiento.

## Tasks

- [ ] Diseñar formulario de perfil.
- [ ] Persistir datos personales.
- [ ] Calcular la edad automáticamente.

## Definition of Done

- [ ] El formulario de perfil muestra todos los campos especificados y se guarda correctamente.
- [ ] La edad se calcula y muestra de forma automática sin intervención del usuario.
- [ ] Los datos persisten entre sesiones.
- [ ] Pruebas validan cálculo de edad con distintas fechas de nacimiento.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-15, release-release-1, epic-épica-1, dev-flor-gonzalez, dev-cristian, dev-emma, dev-flor-galarza
