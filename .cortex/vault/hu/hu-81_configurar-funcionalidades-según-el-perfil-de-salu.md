# HU-81: Configurar funcionalidades según el perfil de salud del usuario

**Release:** R5
**Sprint:** S21
**Épica:** Épica 8: Adaptar Funcionalidades al Perfil Clínico
**Desarrolladores:** Emma, Flor González

---

## Goal

Configurar funcionalidades según el perfil de salud del usuario

## User Story

> **Como** usuario
> **Quiero** configurar y personalizar las funcionalidades
> **Para** que el seguimiento sea relevante y ajustado a mi caso particular

## Requirements

1. Configurar funcionalidades según el perfil de salud del usuario.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: Al acceder a "Configuración perfil clínico", el sistema presenta únicamente las opciones de adaptación correspondientes a la condición registrada del usuario.
- [ ] CA-02: Si es el primer acceso, el sistema precarga valores predeterminados basados en la condición registrada (baseline clínico por patología) y permite modificarlos.
- [ ] CA-03: Las dimensiones configurables son: parámetros de monitoreo (rangos personalizados de frecuencia cardíaca, saturación de oxígeno, actividad física, estrés y presión arterial), alertas y umbrales, signos vitales mostrados en el dashboard y contactos de emergencia.
- [ ] CA-04: Toda configuración guardada persiste entre sesiones sin necesidad de repetirse.
- [ ] CA-05: Cualquier cambio en la configuración clínica se refleja en el panel de estado de salud (dashboard) en la próxima carga o actualización.

## Tasks

- [ ] Implementar pantalla de configuración filtrada por condición del usuario.
- [ ] Definir baseline clínico predeterminado por condición con validación del equipo clínico.
- [ ] Implementar las cinco dimensiones configurables.
- [ ] Validar persistencia de configuración post logout/login.
- [ ] Integrar cambios de configuración con el dashboard.

## Definition of Done

- [ ] Pantalla de configuración implementada y filtrada por condición registrada.
- [ ] Baseline clínico predeterminado definido para cada condición (con validación del equipo clínico).
- [ ] Las 5 dimensiones configurables están implementadas.
- [ ] Persistencia de configuración validada post logout/login.
- [ ] Integración con dashboard validada: los cambios se reflejan en el panel.
- [ ] Revisado por QA.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-81, release-release-3, epic-épica-8, dev-flor-gonzalez, dev-nico
