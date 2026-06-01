# HU-31: Visualizar signos vitales en un dashboard

**Release:** RELEASE 2
**Sprint:** Sprint 5 Desarrollo (24 jun - 30 jun)
**Épica:** Épica 3: Monitoreo y Visualización
**Desarrolladores:** Flor Gonzalez, Emma

---

## Goal

Visualizar signos vitales en un dashboard

## User Story

> **Como** usuario
> **Quiero** ver en la pantalla principal un resumen de mis signos vitales sincronizados
> **Para** tener un control rápido de mi estado de salud sin necesidad de navegar a otras pantallas

## Requirements

1. Visualizar signos vitales en un dashboard.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El dashboard muestra los 4 indicadores principales: frecuencia cardíaca, presión arterial, oxígeno en sangre y actividad física del día.
- [ ] CA-02: Cada indicador muestra el valor más reciente, la fecha y hora del último dato sincronizado, una etiqueta de tendencia (Estable / Elevado / Bajo) y un color de estado (verde si está dentro del rango normal, amarillo si está en límite, rojo si es anormal).
- [ ] CA-03: El indicador de actividad física se visualiza como un círculo de progreso con el porcentaje del objetivo diario cumplido.
- [ ] CA-04: Los datos se actualizan automáticamente cada vez que se sincronizan nuevos datos desde el wearable o se carga un dato manual, sin necesidad de recargar la pantalla.
- [ ] CA-05: Si un indicador no tiene datos recientes, muestra el mensaje "Sin datos recientes" con la fecha del último registro disponible.
- [ ] CA-06: Al tocar un indicador, el usuario navega a la pantalla de detalle de ese signo vital.

## Tasks

- [ ] Diseñar componentes de indicadores del dashboard.
- [ ] Implementar lógica de colores y etiquetas de tendencia.
- [ ] Conectar indicadores con datos sincronizados en tiempo real.
- [ ] Diseñar estado vacío para datos no disponibles.
- [ ] Implementar navegación al detalle desde cada indicador.

## Definition of Done

- [ ] Los 4 indicadores se renderizan correctamente en la pantalla principal con datos reales o simulados.
- [ ] El color de estado y la etiqueta de tendencia de cada indicador reflejan correctamente el rango configurado para ese usuario.
- [ ] El mensaje de datos no disponibles aparece cuando corresponde y muestra la fecha del último registro.
- [ ] La actualización automática funciona tras una sincronización o carga manual sin recargar la pantalla.
- [ ] Al tocar un indicador navega correctamente a la pantalla de detalle de ese signo vital.
- [ ] La pantalla es responsive y se visualiza correctamente en dispositivos móviles.
- [ ] Pruebas cubren los tres estados de color, el estado sin datos, la actualización automática y la navegación al detalle.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-31, release-release-2, epic-épica-3, dev-flor-gonzalez, dev-emma
