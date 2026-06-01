# HU-36: Menú de navegación principal

**Release:** RELEASE 2
**Sprint:** Sprint 5 Desarrollo (24 jun - 30 jun), Sprint 6 Desarrollo (1 jul - 7 jul)
**Épica:** Épica 3: Monitoreo y Visualización
**Desarrolladores:** Flor Gonzalez

---

## Goal

Menú de navegación principal

## User Story

> **Como** usuario
> **Quiero** tener un menú de navegación fijo en la parte inferior de la pantalla
> **Para** acceder rápidamente a las secciones principales desde cualquier pantalla

## Requirements

1. Menú de navegación principal.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El menú está fijo en la parte inferior y es visible en todas las pantallas de la aplicación.
- [ ] CA-02: Contiene 5 botones: Alertas, Reportes, Inicio (central y visualmente destacado), Vittito y Perfil.
- [ ] CA-03: El botón activo se muestra resaltado indicando la sección actual.
- [ ] CA-04: Si hay alertas activas, el botón de Alertas muestra un badge con la cantidad de alertas sin leer.
- [ ] CA-05: El menú no se oculta al hacer scroll dentro de ninguna pantalla.

## Tasks

- [ ] Diseñar e implementar barra de navegación inferior con los 5 botones.
- [ ] Implementar estado activo visual por sección.
- [ ] Implementar badge dinámico en botón de Alertas.

## Definition of Done

- [ ] El menú es visible y funcional en todas las pantallas principales de la app.
- [ ] La navegación entre secciones no genera pérdida de datos ni estados incompletos.
- [ ] El badge de alertas se actualiza en tiempo real.
- [ ] El botón activo se diferencia visualmente del resto.
- [ ] Las pruebas validan navegación, badge y visibilidad con scroll activo.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-36, release-release-2, epic-épica-3, dev-flor-gonzalez
