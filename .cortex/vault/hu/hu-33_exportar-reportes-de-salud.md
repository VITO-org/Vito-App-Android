# HU-33: Exportar reportes de salud

**Release:** R4
**Sprint:** S18
**Épica:** Épica 3: Monitoreo y Visualización (Dashboard)
**Desarrolladores:** Emma, Nico, Flor González

---

## Goal

Exportar reportes de salud

## User Story

> **Como** usuario
> **Quiero** poder exportar mis reportes de salud
> **Para** compartirlos con mi médico, familiares o guardarlos como respaldo

## Requirements

1. Exportar reportes de salud.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: Existe un botón "Exportar" accesible desde la pantalla de detalle de cada signo vital y desde el dashboard general.
- [ ] CA-02: Al presionar "Exportar" se despliega un panel con opciones: tipo de reporte (diario / semanal / mensual / período personalizado), selección de fecha y contenido (todos los signos o uno en particular).
- [ ] CA-03: El reporte es generado con asistencia de la IA (Vittito), incluyendo un resumen en lenguaje natural de la evolución del usuario en el período seleccionado.
- [ ] CA-04: El formato de exportación es PDF.
- [ ] CA-05: Una vez generado, el usuario puede descargarlo o compartirlo directamente por WhatsApp, email u otras apps del sistema operativo.
- [ ] CA-06: Se muestra un indicador de carga mientras el reporte se genera.
- [ ] CA-07: Si no hay datos suficientes en el período elegido, se informa al usuario antes de generar el reporte.

## Tasks

- [ ] Diseñar panel de opciones de exportación.
- [ ] Implementar generación de reporte PDF con contenido de IA.
- [ ] Integrar flujo de descarga y compartido nativo del sistema operativo.
- [ ] Implementar validación de datos suficientes antes de generar.

## Definition of Done

- [ ] El PDF se genera correctamente con datos reales o simulados.
- [ ] El flujo de compartir por WhatsApp funciona desde el dispositivo.
- [ ] El reporte incluye al menos: gráfico del período, resumen numérico y texto generado por IA.
- [ ] El indicador de carga se muestra durante la generación.
- [ ] La validación de datos insuficientes funciona y muestra mensaje previo a la generación.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-33, release-release-4, epic-épica-3, dev-flor-gonzalez, dev-nico, dev-emma
