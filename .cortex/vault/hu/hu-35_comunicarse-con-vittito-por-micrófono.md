# HU-35: Comunicarse con Vittito por micrófono

**Release:** RELEASE 5
**Sprint:** Sprint 19 QA+Analisis (30 sep - 6 oct), Sprint 20 Desarrollo (7 oct - 13 oct)
**Épica:** Épica 3: Monitoreo y Visualización
**Desarrolladores:** Cristian, Emma

---

## Goal

Comunicarse con Vittito por micrófono

## User Story

> **Como** usuario
> **Quiero** presionar un botón de micrófono en el inicio del teléfono para hablar con Vittito
> **Para** consultar sobre mi salud de forma rápida y sin necesidad de escribir

## Requirements

1. Comunicarse con Vittito por micrófono.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El botón de micrófono es un elemento fijo (sticky) visible en todo momento en la pantalla principal del dashboard.
- [ ] CA-02: Al mantener presionado el botón, el sistema activa la escucha y muestra un indicador visual de grabación (onda de audio animada).
- [ ] CA-03: Al soltar el botón, el audio se envía a Vittito y se muestra la respuesta en pantalla (texto y/o audio).
- [ ] CA-04: Si el usuario mantiene presionado y desliza hacia la izquierda, la grabación se cancela mostrando el mensaje "Mensaje cancelado".
- [ ] CA-05: En la primera sesión aparece el mensaje guía "Hola \[nombre\], hablá con Vittito aquí" que desaparece a los 5 segundos o al primer uso del micrófono.
- [ ] CA-06: El sistema interpreta al menos las consultas: "¿Cómo estoy hoy?", "¿Tomé mi medicación?" y "¿Cuál es mi frecuencia cardíaca?".

## Tasks

- [ ] Implementar botón sticky de micrófono con indicador de grabación animado.
- [ ] Implementar gesto de cancelación por deslizamiento.
- [ ] Implementar mensaje de bienvenida para primer uso.
- [ ] Integrar reconocimiento de voz con las consultas frecuentes definidas.

## Definition of Done

- [ ] El botón permanece visible al hacer scroll en el dashboard.
- [ ] El gesto de cancelación (deslizar a la izquierda) funciona correctamente.
- [ ] El mensaje guía aparece solo en la primera interacción y no vuelve a mostrarse.
- [ ] Las consultas frecuentes definidas devuelven respuestas coherentes.
- [ ] Pruebas validan flujo completo: activación, grabación, cancelación y respuesta.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-35, release-release-5, epic-épica-3, dev-cristian, dev-emma
