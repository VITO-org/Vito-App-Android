# HU-65: Realizar check-in emocional diario

**Release:** RELEASE 5
**Sprint:** Sprint 19 QA+Analisis (30 sep - 6 oct), Sprint 20 Desarrollo (7 oct - 13 oct)
**Épica:** Épica 6: Inteligencia Artificial Aplicada
**Desarrolladores:** Flor Gonzalez, Flor Galarza

---

## Goal

Realizar check-in emocional diario

## User Story

> **Como** usuario
> **Quiero** realizar un análisis emocional diario respondiendo preguntas simples
> **Para** que la aplicación detecte mi estado emocional y lo relacione con mis hábitos de salud

## Requirements

1. Realizar check-in emocional diario.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El dashboard muestra una sección "Análisis emocional" o "Check-in diario" con la descripción "Tu bienestar también importa."
- [ ] CA-02: El sistema presenta preguntas simples como: "¿Cómo te sentís hoy?", "¿Cómo describirías tu energía?", "¿Tuviste más estrés o más calma hoy?" y "¿Dormiste bien anoche?".
- [ ] CA-03: Cada pregunta incluye: ícono o imagen representativa, título claro y breve ayuda o ejemplo de respuesta.
- [ ] CA-04: El usuario puede ingresar o seleccionar respuestas para cada pregunta y enviarlas mediante un botón "Enviar respuestas".
- [ ] CA-05: El sistema utiliza las respuestas para generar una interpretación básica del estado emocional del usuario.
- [ ] CA-06: Si el usuario no responde todas las preguntas obligatorias, se muestra el mensaje "Completá las preguntas necesarias antes de enviar."

## Tasks

- [ ] Diseñar un componente de check-in emocional con las preguntas y sus opciones de respuesta.
- [ ] Implementar validación de preguntas obligatorias.
- [ ] Implementar lógica de interpretación básica del estado emocional.
- [ ] Integrar el componente con el dashboard.

## Definition of Done

- [ ] La sección de análisis emocional se visualiza correctamente.
- [ ] Las preguntas del check-in diario se muestran de forma clara.
- [ ] El usuario puede completar las respuestas.
- [ ] El botón "Enviar respuestas" funciona correctamente.
- [ ] El sistema genera una devolución emocional básica con datos simulados o reales.
- [ ] La sección se integra visualmente con el resto del dashboard.
- [ ] Las pruebas validan envío completo, campos obligatorios vacíos e interpretación generada.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-65, release-release-5, epic-épica-6, dev-flor-gonzalez, dev-flor-galarza
