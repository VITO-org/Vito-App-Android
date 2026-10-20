---
schema_version: 1
doc_type: hu
title: "SCRUM-96: HU-52\tNotificaciones automáticas por WhatsApp a familiares"
created_at: '2026-09-14T22:24:54.860151Z'
updated_at: '2026-09-14T22:24:54.860151Z'
tags:
- hu
- jira
- story
status: backlog
links: []
vault_scope: local
fingerprint: d796c7355e1bd9529a2ce149c25a2322923fa85c7ad62a4414705a351896303f
external_id: SCRUM-96
source: jira
kind: story
assignee: Florencia González
external_url: https://vitoproyecto-1775921969007.atlassian.net/browse/SCRUM-96
synced_at: '2026-09-14T22:24:54.841174Z'
---

## Description

Como sistema, quiero enviar mensajes automáticos por WhatsApp cuando se genere un evento relevante, para poder actuar sin necesidad de instalar la aplicación.

Criterios de aceptación

- CA-01: El sistema envía mensajes a través de WhatsApp al número registrado del contacto.
- CA-02: El mensaje incluye: nombre del usuario, tipo de evento, descripción en lenguaje no técnico y timestamp.
- CA-03: El contacto puede responder "OK" o "Recibido" para confirmar lectura; la confirmación queda registrada.
- CA-04: Si el número no tiene WhatsApp, el sistema intenta entregarlo por correo electrónico como fallback automático.
- CA-05: El usuario debe haber otorgado consentimiento explícito para notificar a ese contacto sobre ese tipo de evento.
- CA-06: No se envían más de 3 mensajes por hora al mismo contacto, salvo alertas de severidad crítica.
Tareas

- Integrar WhatsApp con plantillas aprobadas por Meta.
- Implementar fallback a SMS y correo electrónico.
- Implementar flujo de consentimiento por contacto y tipo de evento.
- Implementar rate limiting de mensajes por contacto.
Definición de done

- Integración con WhatsApp aprobada por Meta y funcional en entorno productivo.
- Plantillas de mensajes aprobadas por Meta para cada tipo de evento.
- Fallback a SMS implementado y verificado con números sin WhatsApp.
- Flujo de consentimiento del paciente por contacto y tipo de evento operativo y auditado.
- Límite de frecuencia implementado y testeado con escenarios de múltiples alertas simultáneas.
- Revisión legal del flujo de consentimiento y opt-out aprobada.

## Acceptance Criteria

- [ ] CA-01: El sistema envía mensajes a través de WhatsApp al número registrado del contacto.
- [ ] CA-02: El mensaje incluye: nombre del usuario, tipo de evento, descripción en lenguaje no técnico y timestamp.
- [ ] CA-03: El contacto puede responder "OK" o "Recibido" para confirmar lectura; la confirmación queda registrada.
- [ ] CA-04: Si el número no tiene WhatsApp, el sistema intenta entregarlo por correo electrónico como fallback automático.
- [ ] CA-05: El usuario debe haber otorgado consentimiento explícito para notificar a ese contacto sobre ese tipo de evento.
- [ ] CA-06: No se envían más de 3 mensajes por hora al mismo contacto, salvo alertas de severidad crítica.
- [ ] Integrar WhatsApp con plantillas aprobadas por Meta.
- [ ] Implementar fallback a SMS y correo electrónico.
- [ ] Implementar flujo de consentimiento por contacto y tipo de evento.
- [ ] Implementar rate limiting de mensajes por contacto.
- [ ] Integración con WhatsApp aprobada por Meta y funcional en entorno productivo.
- [ ] Plantillas de mensajes aprobadas por Meta para cada tipo de evento.
- [ ] Fallback a SMS implementado y verificado con números sin WhatsApp.
- [ ] Flujo de consentimiento del paciente por contacto y tipo de evento operativo y auditado.
- [ ] Límite de frecuencia implementado y testeado con escenarios de múltiples alertas simultáneas.
- [ ] Revisión legal del flujo de consentimiento y opt-out aprobada.

## Metadata

- **External ID:** `SCRUM-96`
- **Source:** jira
- **Kind:** story
- **Assignee:** Florencia González- **External URL:** https://vitoproyecto-1775921969007.atlassian.net/browse/SCRUM-96- **Last sync:** 2026-09-14 22:24:54.841174+00:00