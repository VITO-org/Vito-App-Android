# HU-21: Registro de baseline de salud

> **Estado:** 🔴 No iniciada — Infraestructura base disponible (Health Connect SDK + theme RN) pero sin pantalla de onboarding ni formulario de baseline.

**Release:** R2
**Sprint:** S6
**Épica:** Épica 2: Registro e Integración de Datos
**Desarrolladores:** Emma, Nico, Flor Galarza

---

## Goal

Registro de baseline de salud

## User Story

> **Como** usuario
> **Quiero** registrar mis datos de salud iniciales
> **Para** personalizar alertas y monitoreo

## Requirements

1. Registro de baseline de salud.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El usuario puede registrar: peso, altura, presión arterial, frecuencia cardíaca, temperatura y oxigenación.
  - *Health Connect SDK expone WeightRecord y HeightRecord, pero falta implementar su lectura en HealthDataProvider y la UI de onboarding.*
- [ ] CA-02: El sistema valida rangos fisiológicos plausibles para cada campo.
  - *Pendiente: crear validador de rangos en TypeScript.*
- [ ] CA-03: Los datos quedan asociados al perfil clínico del usuario.
  - *Pendiente: requiere Supabase o almacenamiento local persistente.*

## Tasks

- [ ] Diseñar una pantalla de baseline.
  - *Pendiente: crear componente OnboardingBaseline.tsx con formulario.*
- [ ] Implementar validaciones fisiológicas.
  - *Pendiente: crear src/utils/physiologicalValidation.ts.*
- [ ] Persistir datos clínicos iniciales.
  - *Pendiente: definir si va a Supabase o AsyncStorage.*

## Definition of Done

- [ ] El formulario muestra todos los campos especificados y permite guardarlos.
- [ ] Los valores fuera de rango fisiológico muestran error descriptivo.
- [ ] Los datos persisten vinculados al perfil del usuario.
- [ ] Las pruebas cubren valores válidos, valores límite y valores fuera de rango para cada campo.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-21, release-release-1, epic-épica-2, dev-flor-gonzalez, dev-cristian, dev-flor-galarza
