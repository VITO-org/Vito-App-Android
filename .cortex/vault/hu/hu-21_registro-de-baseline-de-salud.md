# HU-21: Registro de baseline de salud

> **Estado:** 🟡 En desarrollo — CompleteProfileScreen incluye altura y peso (datos de baseline mínimos). Pendiente: presión arterial, frecuencia cardíaca, temperatura y oxigenación como baseline inicial. Validación fisiológica implementada para altura (50-280 cm) y peso (10-500 kg).

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

- [x] CA-01: El usuario puede registrar: peso, altura.
  - *CompleteProfileScreen incluye altura_cm y peso_kg, persistidos en perfil_usuario.*
  - *Pendiente: presión arterial, frecuencia cardíaca, temperatura y oxigenación como parte del baseline (tabla datos_clinicos_config).*
- [x] CA-02: El sistema valida rangos fisiológicos plausibles para cada campo.
  - *Validación inline: altura (50-280 cm), peso (10-500 kg), edad (0-120 años), fecha válida.*
- [x] CA-03: Los datos quedan asociados al perfil clínico del usuario.
  - *Persistido en perfil_usuario (tabla Supabase) con upsert por user_id.*

## Tasks

- [x] Diseñar una pantalla de baseline.
  - *CompleteProfileScreen.tsx con formulario de datos personales + altura + peso.*
- [x] Implementar validaciones fisiológicas.
  - *Validación inline en completeProfileScreen con rangos fisiológicos.*
- [x] Persistir datos clínicos iniciales.
  - *Via upsertProfile a Supabase (tabla perfil_usuario).*
- [ ] Agregar presión arterial, frecuencia cardíaca, temperatura y oxigenación al formulario de baseline.

## Definition of Done

- [ ] El formulario muestra todos los campos especificados y permite guardarlos.
- [ ] Los valores fuera de rango fisiológico muestran error descriptivo.
- [ ] Los datos persisten vinculados al perfil del usuario.
- [ ] Las pruebas cubren valores válidos, valores límite y valores fuera de rango para cada campo.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-21, release-release-1, epic-épica-2, dev-flor-gonzalez, dev-cristian, dev-flor-galarza
