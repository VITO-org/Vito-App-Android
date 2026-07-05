# HU-62: Acceder rapidamente a respuestas sugeridas sobre estado diario

**Release:** R4
**Sprint:** S15
**Épica:** Épica 6: Inteligencia Artificial Aplicada
**Desarrolladores:** Flor Galarza, Nico, Flor González

---

## Goal

Acceder rapidamente a respuestas sugeridas sobre estado diario

## User Story

> **Como** usuario
> **Quiero** ver consultas sugeridas en la pantalla principal como '¿Cómo estoy hoy?'
> **Para** acceder rápidamente a un resumen de mi estado de salud sin escribir una pregunta manualmente

## Requirements

1. Acceder rapidamente a respuestas sugeridas sobre estado diario.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El dashboard muestra una sección llamada "Respuestas sugeridas" con al menos tres consultas: "¿Cómo estoy hoy?", "¿Tuve anomalías?" y "¿Cómo viene mi tendencia semanal?".
- [ ] CA-02: Cada consulta sugerida muestra un ícono representativo, un título claro, una breve descripción y un botón o acción para abrirla.
- [ ] CA-03: Al seleccionar "¿Cómo estoy hoy?", el sistema muestra un resumen diario con: nivel general de actividad, signos vitales relevantes, alertas o anomalías detectadas y una recomendación breve para el día.
- [ ] CA-04: Si no hay datos suficientes, se muestra el mensaje "Aún no hay información suficiente para generar tu resumen diario."

## Tasks

- [ ] Diseñar el componente de consultas sugeridas en el dashboard.
- [ ] Implementar lógica de resumen diario personalizado.
- [ ] Implementar estado vacío por datos insuficientes.

## Definition of Done

- [ ] Las consultas sugeridas se visualizan correctamente en la pantalla principal.
- [ ] La opción "¿Cómo estoy hoy?" puede seleccionarse desde la interfaz.
- [ ] El sistema genera una respuesta resumida con datos reales o simulados.
- [ ] La consulta se puede abrir sin afectar el resto de las secciones del dashboard.
- [ ] El diseño se adapta correctamente a dispositivos móviles.
- [ ] Pruebas validan resumen con datos disponibles y mensaje de datos insuficientes.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-62, release-release-4, epic-épica-6, dev-flor-gonzalez, dev-flor-galarza
