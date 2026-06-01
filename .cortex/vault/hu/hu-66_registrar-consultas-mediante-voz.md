# HU-66: Registrar consultas mediante voz

**Release:** RELEASE 5
**Sprint:** Sprint 19 QA+Analisis
**Épica:** Épica 6: Inteligencia Artificial Aplicada
**Desarrolladores:** Flor Gonzalez, Flor Galarza

---

## Goal

Registrar consultas mediante voz

## User Story

> **Como** usuario
> **Quiero** usar entrada por voz para consultar al asistente o completar mi análisis emocional
> **Para** interactuar con la aplicación de forma más rápida y accesible

## Requirements

1. Registrar consultas mediante voz.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El dashboard muestra una sección de entrada por voz dentro del flujo de análisis emocional o consultas, con controles visibles: Iniciar voz, Detener y Convertir a texto.
- [ ] CA-02: El usuario puede iniciar la grabación de voz y detenerla manualmente.
- [ ] CA-03: Al detener la grabación, el sistema convierte el audio en texto y lo muestra en un campo editable con placeholder "Hoy me sentí ansioso y tuve menos sueño…".
- [ ] CA-04: El usuario puede revisar y editar el texto antes de enviarlo.
- [ ] CA-05: Si no se detecta voz o hay error de transcripción, se muestra el mensaje "No se pudo detectar audio. Intentá nuevamente."
- [ ] CA-06: La entrada por voz puede utilizarse para: enviar una consulta al chat IA, completar el análisis emocional o agregar una descripción libre del estado del usuario.

## Tasks

- [ ] Diseñar componentes de entrada por voz con controles de inicio, detención y conversión.
- [ ] Integrar motor de reconocimiento de voz (real o simulado en etapas iniciales).
- [ ] Implementar campo editable con el texto transcripto.
- [ ] Implementar manejo de error de transcripción.

## Definition of Done

- [ ] Los botones de voz se visualizan correctamente.
- [ ] El usuario puede iniciar y detener una grabación.
- [ ] El sistema convierte la voz en texto, aunque sea mediante una simulación inicial.
- [ ] El texto transcripto se muestra en un campo editable.
- [ ] El usuario puede enviar el texto como parte del análisis emocional o como consulta al asistente.
- [ ] La funcionalidad es accesible desde la pantalla móvil sin romper el flujo visual.
- [ ] Las pruebas validan grabación, transcripción, edición, envío y manejo de error.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-66, release-release-5, epic-épica-6, dev-flor-gonzalez, dev-flor-galarza
