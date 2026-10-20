---
schema_version: 1
doc_type: adr
title: Push server-side vía Edge + Expo Push API (Opción A)
created_at: '2026-09-11T15:24:37.289817Z'
updated_at: '2026-09-11T15:24:37.289817Z'
tags:
- push
- edge-function
- expo
- fcm
- scrum-95
status: accepted
links:
- 2026-09-10_fix-push-alertas-server-side-edge-notifica-via-expo-push-versionar-triggeredge-extender-panel-admin
- HU-BUG-PUSH-SERVER-01
vault_scope: local
fingerprint: 8f87c739ce0d031e4589eb1e8cff8aea71c4608d2706ae500401ab86f0e6a570
adr_number: 3
supersedes: []
superseded_by: null
alternatives_considered: []
acceptance_criteria_met: false
---

## Context

Las alertas server-side (trigger + Edge evaluar-evento en dashboard, sin versionar) creaban la fila en `alerta` pero nunca llegaba el push: el único sender era el AlertEngine local (`HealthProvider onGenerated`), que no ve filas manuales ni funciona con app cerrada. `dispositivo_usuario.fcm_token` guarda `ExponentPushToken` sin consumidor.

## Decision

Opción A: la Edge Function `evaluar-evento` envía el push vía Expo Push API (`POST https://exp.host/--/api/v2/push/send`) tras cada INSERT de `alerta`, con fan-out por dispositivo activo, filtro quiet-hours (críticas bypasean) y registro en `notificacion_entrega` (`enviada`/`fallida`/`suprimida_quiet_hours`). Rechazadas: (B) FCM directo — rompe compatibilidad con `ExponentPushToken` y exige service-account + rewrite del registro; (C) push local por polling/diff en app — no funciona con app cerrada/muerta y gasta batería (es la causa del bug). Requiere FCM igual (proyecto `vito-39dda`, `google-services.json`, server key en proyecto Expo): en Android todo push pasa por FCM aunque uses Expo.

## Alternatives Considered

(none)

## Consequences



