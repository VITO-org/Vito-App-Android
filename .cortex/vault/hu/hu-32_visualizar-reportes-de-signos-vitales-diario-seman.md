# HU-32: Visualizar reportes de signos vitales diario, semanal y mensual

**Release:** R2
**Sprint:** S8
**Épica:** Épica 3: Monitoreo y Visualización (Dashboard)
**Desarrolladores:** Flor González, Cristian

---

## Goal

Visualizar reportes de signos vitales diario, semanal y mensual

## User Story

> **Como** usuario
> **Quiero** acceder al detalle de cada signo vital al seleccionarlo desde el dashboard
> **Para** analizar mi evolución durante el día, la semana o el mes

## Requirements

1. Visualizar reportes de signos vitales diario, semanal y mensual.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: Al tocar un indicador del dashboard se navega a la pantalla de detalle de ese signo vital.
- [ ] CA-02: La pantalla muestra un gráfico de línea con eje X (tiempo) y eje Y (valores), incluyendo línea de referencia del valor normal del usuario.
- [ ] CA-03: Se ofrecen 3 vistas seleccionables: Diario, Semanal y Mensual. Al cambiar la vista el gráfico se actualiza sin recargar la pantalla completa.
- [ ] CA-04: Se muestra un resumen textual con valor promedio, máximo, mínimo y cantidad de registros del período.
- [ ] CA-05: Los valores anormales en el período seleccionado se destacan visualmente en el gráfico (ej: punto rojo).
- [ ] CA-06: El usuario puede hacer zoom o desplazarse horizontalmente sobre el gráfico.

## Tasks

- [ ] Implementar componente de gráfico de línea con las 3 vistas.
- [ ] Implementar destacado visual de valores anormales.
- [ ] Implementar resumen estadístico del período.
- [ ] Habilitar zoom y desplazamiento horizontal en el gráfico.

## Definition of Done

- [ ] Las 3 vistas (diaria, semanal, mensual) funcionan correctamente para cada uno de los 4 signos vitales.
- [ ] Los valores anormales se destacan visualmente en el gráfico.
- [ ] El resumen numérico es coherente con los datos graficados.
- [ ] Zoom y desplazamiento horizontal funcionan en dispositivos táctiles.
- [ ] Pruebas validan renderizado, cálculo de estadísticas y navegación entre vistas.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-32, release-release-2, epic-épica-3, dev-cristian, dev-emma
