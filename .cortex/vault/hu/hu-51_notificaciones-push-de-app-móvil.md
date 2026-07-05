# HU-51: Notificaciones push de app móvil

**Release:** R3
**Sprint:** S12
**Épica:** Épica 5: Sistema de Notificaciones
**Desarrolladores:** Emma, Nico

---

## Goal

Notificaciones push de app móvil

## User Story

> **Como** usuario
> **Quiero** recibir notificaciones push de la aplicación móvil cuando se genere un evento relevante
> **Para** estar informado en tiempo real sin necesidad de estar dentro de la app

## Requirements

1. Notificaciones push de app móvil.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El sistema entrega notificaciones push en Android en ≤15 segundos desde que el evento es disparado.
- [ ] CA-02: La notificación muestra: tipo de evento, descripción breve, timestamp y nivel de severidad visual (color / ícono).
- [ ] CA-03: Al abrir la notificación, el usuario llega directamente al detalle del evento dentro de la app (deep link).
- [ ] CA-04: Las notificaciones se entregan aunque la app esté en segundo plano o cerrada.
- [ ] CA-05: El usuario puede configurar horario silencioso (ej. no molestar de 23:00 a 07:00), con excepción de alertas de severidad crítica que siempre se entregan.
- [ ] CA-06: Se registra el estado de entrega de cada notificación (enviada, recibida, leída).

## Tasks

- [ ] Integrar Firebase Cloud Messaging (FCM) para Android.
- [ ] Implementar deep link al detalle del evento.
- [ ] Implementar configuración de horario silencioso.
- [ ] Implementar log de estado de entrega de notificaciones.

## Definition of Done

- [ ] Integración con FCM implementada y validada en dispositivos reales.
- [ ] Entrega en ≤15 s verificada bajo pruebas de carga con 200 usuarios simultáneos.
- [ ] Deep link al detalle del evento funcional en Android.
- [ ] Comportamiento en segundo plano y app cerrada testeado en las últimas dos versiones de Android.
- [ ] Log de estado de entrega persistente y consultable desde el panel de administración.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-51, release-release-2, epic-épica-5, dev-emma
