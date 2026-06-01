# HU-34: Visualizar sugerencias de Vittito

**Release:** RELEASE 4
**Sprint:** Sprint 17 Desarrollo (16 sep - 22 sep)
**Épica:** Épica 3: Monitoreo y Visualización
**Desarrolladores:** Flor Gonzalez, Emma

---

## Goal

Visualizar sugerencias de Vittito

## User Story

> **Como** usuario
> **Quiero** ver sugerencias de salud personalizadas en mi dashboard
> **Para** saber qué acciones puedo tomar para mejorar mi estado de salud

## Requirements

1. Visualizar sugerencias de Vittito.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: Las sugerencias se muestran en el dashboard debajo de la sección de signos vitales.
- [ ] CA-02: Se presentan ordenadas por nivel de importancia, priorizando las relacionadas con signos vitales fuera de rango.
- [ ] CA-03: Cada sugerencia muestra un ícono representativo, un título corto y una etiqueta de prioridad (Alta / Media / Baja).
- [ ] CA-04: Al tocar una sugerencia se muestra su descripción detallada, el motivo y acciones concretas recomendadas.
- [ ] CA-05: El usuario puede marcar una sugerencia como "Vista" o "Hecha".
- [ ] CA-06: Las sugerencias se actualizan al menos una vez por día o ante cambios relevantes en los datos del usuario.
- [ ] CA-07: Si no hay sugerencias activas se muestra el mensaje "Todo en orden, seguí así".

## Tasks

- [ ] Diseñar componentes de tarjetas de sugerencias con ordenamiento por prioridad.
- [ ] Implementar modal o pantalla de detalle de sugerencia.
- [ ] Implementar acciones "Vista" y "Hecha".
- [ ] Implementar lógica de actualización diaria de sugerencias.

## Definition of Done

- [ ] Las sugerencias se muestran siempre después de los signos vitales.
- [ ] El ordenamiento por prioridad es correcto y coherente con los datos del usuario.
- [ ] El detalle de cada sugerencia es accesible y comprensible.
- [ ] Las acciones "Vista" y "Hecha" actualizan el estado correctamente.
- [ ] El mensaje de estado positivo se muestra cuando no hay sugerencias activas.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-34, release-release-4, epic-épica-3, dev-flor-gonzalez, dev-emma
