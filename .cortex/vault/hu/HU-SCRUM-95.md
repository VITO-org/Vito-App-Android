---
schema_version: 1
doc_type: hu
title: "SCRUM-95: HU-51\tNotificaciones push de app móvil"
created_at: '2026-09-08T00:30:00.658707Z'
updated_at: '2026-09-08T00:30:00.658707Z'
tags:
- hu
- jira
- story
status: backlog
links: []
vault_scope: local
fingerprint: 0ad363a92da2231b0e2a96f5c8e5041b5f138d1ab5093a268bc3dbe6166bf393
external_id: SCRUM-95
source: jira
kind: story
assignee: Florencia González
external_url: https://vitoproyecto-1775921969007.atlassian.net/browse/SCRUM-95
synced_at: '2026-09-08T00:30:00.502322Z'
---

## Description

Como usuario, quiero recibir notificaciones push de la aplicación móvil cuando se genere un evento relevante para mi salud, para estar informado en tiempo real sin necesidad de estar dentro de la app.

Criterios de aceptación

- CA-01: El sistema entrega notificaciones push en Android en ≤15 segundos desde que el evento es disparado.
- CA-02: La notificación muestra: tipo de evento, descripción breve, timestamp y nivel de severidad visual (color / ícono).
- CA-03: Al abrir la notificación, el usuario llega directamente al detalle del evento dentro de la app (deep link).
- CA-04: Las notificaciones se entregan aunque la app esté en segundo plano o cerrada.
- CA-05: El usuario puede configurar horario silencioso (ej. no molestar de 23:00 a 07:00), con excepción de alertas de severidad crítica que siempre se entregan.
- CA-06: Se registra el estado de entrega de cada notificación (enviada, recibida, leída).
Tareas

- Integrar Firebase Cloud Messaging (FCM) para Android.
- Implementar deep link al detalle del evento.
- Implementar configuración de horario silencioso.
- Implementar log de estado de entrega de notificaciones.
Definición de done

- Integración con FCM implementada y validada en dispositivos reales.
- Entrega en ≤15 s verificada bajo pruebas de carga con 200 usuarios simultáneos.
- Deep link al detalle del evento funcional en Android.
- Comportamiento en segundo plano y app cerrada testeado en las últimas dos versiones de Android.
- Log de estado de entrega persistente y consultable desde el panel de administración.

## Acceptance Criteria

- [ ] CA-01: El sistema entrega notificaciones push en Android en ≤15 segundos desde que el evento es disparado.
- [ ] CA-02: La notificación muestra: tipo de evento, descripción breve, timestamp y nivel de severidad visual (color / ícono).
- [ ] CA-03: Al abrir la notificación, el usuario llega directamente al detalle del evento dentro de la app (deep link).
- [ ] CA-04: Las notificaciones se entregan aunque la app esté en segundo plano o cerrada.
- [ ] CA-05: El usuario puede configurar horario silencioso (ej. no molestar de 23:00 a 07:00), con excepción de alertas de severidad crítica que siempre se entregan.
- [ ] CA-06: Se registra el estado de entrega de cada notificación (enviada, recibida, leída).
- [ ] Integrar Firebase Cloud Messaging (FCM) para Android.
- [ ] Implementar deep link al detalle del evento.
- [ ] Implementar configuración de horario silencioso.
- [ ] Implementar log de estado de entrega de notificaciones.
- [ ] Integración con FCM implementada y validada en dispositivos reales.
- [ ] Entrega en ≤15 s verificada bajo pruebas de carga con 200 usuarios simultáneos.
- [ ] Deep link al detalle del evento funcional en Android.
- [ ] Comportamiento en segundo plano y app cerrada testeado en las últimas dos versiones de Android.
- [ ] Log de estado de entrega persistente y consultable desde el panel de administración.

## Metadata

- **External ID:** `SCRUM-95`
- **Source:** jira
- **Kind:** story
- **Assignee:** Florencia González- **External URL:** https://vitoproyecto-1775921969007.atlassian.net/browse/SCRUM-95- **Last sync:** 2026-09-08 00:30:00.502322+00:00