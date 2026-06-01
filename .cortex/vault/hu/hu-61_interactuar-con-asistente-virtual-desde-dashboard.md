# HU-61: Interactuar con asistente virtual desde dashboard

**Release:** RELEASE 4
**Sprint:** Sprint 16 Desarrollo
**Épica:** Épica 6: Inteligencia Artificial Aplicada
**Desarrolladores:** Cristian, Emma

---

## Goal

Interactuar con asistente virtual desde dashboard

## User Story

> **Como** usuario
> **Quiero** escribirle consultas al asistente de IA desde la pantalla principal
> **Para** recibir respuestas rápidas y personalizadas sobre mi estado de salud

## Requirements

1. Interactuar con asistente virtual desde dashboard.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El dashboard muestra una sección llamada "Chat con IA" con un campo de texto y un placeholder orientativo (ej: "Iniciá una conversación… 'me recomendás alguna dieta'").
- [ ] CA-02: El usuario puede ingresar una consulta relacionada con su salud, hábitos o datos registrados.
- [ ] CA-03: El sistema interpreta la consulta y genera una respuesta basada en los datos disponibles del usuario.
- [ ] CA-04: Si no existen datos suficientes para responder, el sistema muestra el mensaje "No tengo datos suficientes para darte una respuesta precisa."
- [ ] CA-05: El chat puede responder consultas como: "¿Cómo estoy hoy?", "¿Tuve anomalías?" y "¿Cómo viene mi tendencia semanal?".
- [ ] CA-06: La respuesta se presenta dentro de la misma pantalla o mediante una vista de conversación accesible desde el dashboard.

## Tasks

- [ ] Diseñar componente de chat en el dashboard con campo de texto y área de respuesta.
- [ ] Integrar motor de IA con acceso a datos del usuario.
- [ ] Implementar respuesta ante falta de datos suficientes.

## Definition of Done

- [ ] El campo de entrada del chat se visualiza correctamente en la pantalla principal.
- [ ] El usuario puede escribir y enviar una consulta.
- [ ] El sistema devuelve una respuesta simulada o real según los datos disponibles.
- [ ] La interfaz mantiene la estética general de Vittito.
- [ ] La sección funciona correctamente en pantalla móvil con scroll vertical.
- [ ] Pruebas validan respuestas ante datos disponibles y datos insuficientes.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-61, release-release-4, epic-épica-6, dev-cristian, dev-emma
