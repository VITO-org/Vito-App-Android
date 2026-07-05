# HU-15: Configuración de perfil personal

> **Estado:** 🟡 En desarrollo — CompleteProfileScreen creada con campos de perfil personal (nombre, apellido, fecha de nacimiento, sexo, altura, peso). Se muestra automáticamente después del registro. Persiste vía upsertProfile a Supabase. Pendiente: editar perfil desde PerfilScreen.

**Release:** R5
**Sprint:** S23
**Épica:** Épica 1: Gestión de Usuarios y Acceso
**Desarrolladores:** Flor González, Cristian

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

- [x] CA-01: El usuario puede registrar: nombre, apellido, fecha de nacimiento, sexo biológico, altura y peso.
  - *CompleteProfileScreen implementa todos los campos post-registro.*
  - *Pendiente: DNI, género y nacionalidad (HU-15 original).*
- [x] CA-02: El sistema calcula automáticamente la edad a partir de la fecha de nacimiento.
  - *calcularEdad() en CompleteProfileScreen muestra edad en tiempo real mientras se completa la fecha.*

## Tasks

- [x] Diseñar formulario de perfil.
  - *CompleteProfileScreen.tsx con nombre, apellido, fecha de nacimiento, sexo, altura, peso.*
- [x] Persistir datos personales.
  - *Vía upsertProfile → tabla perfil_usuario en Supabase.*
- [x] Calcular la edad automáticamente.
  - *Función calcularEdad() con badge de edad dinámico.*
- [ ] Agregar campos faltantes (DNI, género, nacionalidad).
- [ ] Permitir editar perfil desde PerfilScreen.

## Definition of Done

- [ ] El formulario de perfil muestra todos los campos especificados y se guarda correctamente.
- [ ] La edad se calcula y muestra de forma automática sin intervención del usuario.
- [ ] Los datos persisten entre sesiones.
- [ ] Pruebas validan cálculo de edad con distintas fechas de nacimiento.


## Files in Scope

- `src/screens/CompleteProfileScreen.tsx` — Nuevo formulario de finalización de perfil post-registro
- `src/context/SupabaseProvider.tsx` — needsProfile state + updateProfile persistencia
- `src/navigation/RootNavigator.tsx` — Redirección a CompleteProfile cuando needsProfile=true
- `src/services/supabase/schema.sql` — Columnas altura_cm, peso_kg agregadas a perfil_usuario
- `src/services/supabase/models.ts` — PerfilUsuario extendido con altura_cm, peso_kg

## Tags

hu-hu-15, release-release-1, epic-épica-1, dev-flor-gonzalez, dev-cristian, dev-emma, dev-flor-galarza
