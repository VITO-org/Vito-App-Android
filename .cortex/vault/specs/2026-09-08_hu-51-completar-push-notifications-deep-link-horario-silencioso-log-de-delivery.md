---
schema_version: 1
doc_type: spec
title: 'HU-51: Completar push notifications (deep link, horario silencioso, log de
  delivery)'
created_at: '2026-09-08T00:51:40.452309Z'
updated_at: '2026-09-08T00:51:40.452309Z'
tags:
- spec
- hu-51
- scrum-95
- push
- notifications
- deep-link
- quiet-hours
- delivery-log
- fast-code
status: draft
links: []
vault_scope: local
fingerprint: 4d3a5e5eae2632702c50638c700e531850fb4b20c7b4cd92974dc809647cb81a
verification_hooks:
- name: TypeScript type-check
  command: npx tsc --noEmit --pretty 2>&1 | tail -20
  required: true
  success_criteria: exit code 0
  timeout_seconds: 180
- name: Android debug build
  command: cd android && ./gradlew assembleDebug -x lint 2>&1 | tail -15
  required: true
  success_criteria: BUILD SUCCESSFUL
  timeout_seconds: 300
goal: 'Completar los 3 criterios de aceptación pendientes de la HU-51 notificaciones
  push (SCRUM-95) sobre la feature branch scrum-95: deep link al detalle, horario
  silencioso configurable y log de delivery status, integrados con el AlertEngine
  + expo-notifications + Supabase ya existentes.'
files_in_scope:
- src/services/notifications/index.ts
- src/context/NotificationsProvider.tsx
- src/screens/ConfiguracionScreen.tsx
- src/services/supabase/api.ts
- src/services/supabase/models.ts
- src/services/supabase/schema.sql
- src/services/alerts/types.ts
constraints:
- 'Stack: React Native + Expo + Supabase (raw REST fetch, no supabase-js en RN)'
- Android 14+ (API 34+) compatible
- 'No nueva arquitectura: continuidad sobre expo-notifications existente'
- No pruebas de carga (out of scope de esta tarea)
acceptance_criteria:
- '[CA-03] Deep link: al tocar una notificación, se navega a DetalleSignoScreen pasando
  el alertId'
- '[CA-05] Horario silencioso configurable en ConfiguracionScreen; notificaciones
  no críticas suprimidas en horario; críticas entregadas siempre'
- '[CA-06] Estado de entrega (enviada/recibida/leída) persistido en notificacion_entrega
  con id_dispositivo y id_alerta'
---

## Goal

Completar los 3 criterios de aceptación pendientes de la HU-51 notificaciones push (SCRUM-95) sobre la feature branch scrum-95: deep link al detalle, horario silencioso configurable y log de delivery status, integrados con el AlertEngine + expo-notifications + Supabase ya existentes.

## Requirements

- CA-03: Al abrir la notificación push recibida, navegar al DetalleSignoScreen pasando el alertId del evento
- CA-05: Permitir al usuario configurar un horario silencioso (no-molestar) con hora inicio y fin; las notificaciones no críticas dentro del horario se suprimen, pero las críticas siempre se entregan
- CA-06: Registrar el estado de entrega de cada notificación (enviada, recibida, leída) en la tabla notificacion_entrega, asociada al id_dispositivo y id_alerta
- Integración con FCM token + expo-notifications ya existente en NotificationsProvider
- persistir preferencias (incl. horario silencioso) en preferencia_notificacion en Supabase
- filtrar envío de notificaciones según horario silencioso en services/notifications/index.ts

## Files in Scope

- `src/services/notifications/index.ts`
- `src/context/NotificationsProvider.tsx`
- `src/screens/ConfiguracionScreen.tsx`
- `src/services/supabase/api.ts`
- `src/services/supabase/models.ts`
- `src/services/supabase/schema.sql`
- `src/services/alerts/types.ts`

## Constraints

- Stack: React Native + Expo + Supabase (raw REST fetch, no supabase-js en RN)
- Android 14+ (API 34+) compatible
- No nueva arquitectura: continuidad sobre expo-notifications existente
- No pruebas de carga (out of scope de esta tarea)

## Acceptance Criteria

- [ ] [CA-03] Deep link: al tocar una notificación, se navega a DetalleSignoScreen pasando el alertId
- [ ] [CA-05] Horario silencioso configurable en ConfiguracionScreen; notificaciones no críticas suprimidas en horario; críticas entregadas siempre
- [ ] [CA-06] Estado de entrega (enviada/recibida/leída) persistido en notificacion_entrega con id_dispositivo y id_alerta

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### TypeScript type-check
```bash
npx tsc --noEmit --pretty 2>&1 | tail -20
```

Success: exit code 0 · Timeout: 180s
### Android debug build
```bash
cd android && ./gradlew assembleDebug -x lint 2>&1 | tail -15
```

Success: BUILD SUCCESSFUL · Timeout: 300s
