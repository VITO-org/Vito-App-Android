# HU-64: Visualizar reportes automáticos de salud

**Release:** RELEASE 4
**Sprint:** Sprint 18 Desarrollo (23 sep - 29 sep)
**Épica:** Épica 6: Inteligencia Artificial Aplicada
**Desarrolladores:** Cristian, Flor Galarza

---

## Goal

Visualizar reportes automáticos de salud

## User Story

> **Como** usuario
> **Quiero** ver reportes automáticos generados con mis datos semanales
> **Para** comprender mi evolución de salud sin analizar manualmente cada indicador

## Requirements

1. Visualizar reportes automáticos de salud.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El dashboard muestra una sección llamada "Reportes automáticos" con indicadores resumidos semanales: ritmo cardíaco promedio, variabilidad o tendencia, oxígeno en sangre y actividad física.
- [ ] CA-02: Cada tarjeta de indicador muestra: nombre del indicador, valor principal, variación o porcentaje de cambio y tendencia visual (aumento / disminución / estabilidad).
- [ ] CA-03: El dashboard incluye una sección "Tu reporte semanal" con bloques de: Hallazgos principales, Qué mejorar y Próxima revisión.
- [ ] CA-04: Existe una acción "Ver reporte completo" para acceder al detalle.
- [ ] CA-05: Si no hay datos semanales suficientes, se muestra el mensaje "Aún no hay datos suficientes para generar el reporte semanal."

## Tasks

- [ ] Diseñar tarjetas de indicadores semanales con tendencia visual.
- [ ] Implementar sección "Tu reporte semanal" con los tres bloques.
- [ ] Implementar acceso al reporte completo.
- [ ] Implementar estado vacío por datos insuficientes.

## Definition of Done

- [ ] La sección de reportes automáticos se muestra correctamente.
- [ ] Los indicadores semanales renderizan con datos simulados o reales.
- [ ] El reporte semanal muestra hallazgos, mejoras y próxima revisión.
- [ ] El botón "Ver reporte completo" permite acceder al detalle del reporte.
- [ ] La pantalla permite visualizar esta sección mediante scroll vertical.
- [ ] El diseño se mantiene legible en formato móvil.
- [ ] Pruebas validan renderizado de indicadores y mensajes de datos insuficientes.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-64, release-release-4, epic-épica-6, dev-cristian, dev-flor-galarza
