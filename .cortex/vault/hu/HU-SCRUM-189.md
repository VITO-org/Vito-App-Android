---
schema_version: 1
doc_type: hu
title: 'SCRUM-189: BUG HU-51 Push no se dispara para alertas generadas server-side
  (trigger + Edge Function evaluar-evento)'
created_at: '2026-09-11T15:28:00.109289Z'
updated_at: '2026-09-11T15:28:00.109289Z'
tags:
- hu
- jira
- bug
- backend
- qa
- supabase
status: backlog
links: []
vault_scope: local
fingerprint: d804a4d8a89858735dee20753319b0623bd6759a2914302f249ed5579e1094a8
external_id: SCRUM-189
source: jira
kind: bug
assignee: Florencia González
external_url: https://vitoproyecto-1775921969007.atlassian.net/browse/SCRUM-189
synced_at: '2026-09-11T15:28:00.081989Z'
---

## Description

Como usuario quiero recibir el push aunque la alerta la genere el servidor (trigger + Edge Function), para enterarme en tiempo real sin tener la app abierta.

Comportamiento actual

El panel-admin inserta en datos_reloj → trigger trg_datos_reloj_evaluar_evento → Edge Function evaluar-evento → fila en alerta en ~1s (verificado 2026-09-10: SpO2 82 a las 00:31:51 UTC → hipoxia crítica 00:31:52 UTC, visible en AlertasScreen). Pero el teléfono nunca muestra la notificación, porque sendAlertNotification solo se llama en el onGenerated del AlertEngine local (HealthProvider.tsx:171-179), que únicamente evalúa el dato vivo de Health Connect y nunca las filas manuales. La app no tiene realtime a datos_reloj y el auto-refresh mínimo es 60s.

Pasos para reproducir

Servir panel-admin de la rama feature/admin-panel-web (http://localhost:8000).

RLS: ALTER TABLE datos_reloj DISABLE ROW LEVEL SECURITY + policies anon de lectura en alerta y perfil_usuario.

Generar SpO2 82 para el usuario de prueba.

Verificar la alerta fresca:

SELECT titulo, tipo, severidad, created_at FROM alerta ORDER BY created_at DESC LIMIT 5;Forzar sync en el APK: la alerta aparece en AlertasScreen pero no llega ningún push.

Causa raíz

Generación de alertas server-side no versionada en el repo (trigger + edge solo existen en el dashboard de Supabase) combinada con push cableado únicamente al engine local de la app.

Alcance propuesto

- Opción A (recomendada): la Edge Function evaluar-evento envía el push vía Expo Push API usando el token de dispositivo_usuario (columna fcm_token) y registra el estado enviada en notificacion_entrega.
- Opción B: la app observa filas nuevas en alerta (dif de IDs en refreshAlerts o realtime) y dispara sendAlertNotification local con filtro de horario silencioso.
- Versionar el trigger + la edge en el repo (supabase/functions + migración).
- Extender panel-admin: vista de delivery log, editor de horario silencioso, alertId/deep link esperado.
Criterios de aceptación

 Las alertas server-side generan push con la app en segundo plano y cerrada.Estado enviada registrado en notificacion_entrega con id_alerta + id_dispositivo.Al tocar la notificación se navega al DetalleSigno con el alertId.Horario silencioso respetado (no-críticas suprimidas en ventana, críticas siempre).Trigger + Edge Function versionados en el repo.Notas

- El filtro silencioso se evalúa en hora local del teléfono (la DB guarda UTC; Argentina UTC-3: restar 3h al comparar con el SQL Editor).
- Severidades viejas con otro casing (leve / BRADICARDIA) son de otra versión del generador, no del engine actual.
- El job cron hu98-recalcular-baselines-nocturno quedó descartado como generador.
- APK testeado: build manual del CI sobre scrum-95-hu-51-notificaciones-push-de-app-movil (incluye 35bc3ca).

## Acceptance Criteria

- [ ] Opción A (recomendada): la Edge Function evaluar-evento envía el push vía Expo Push API usando el token de dispositivo_usuario (columna fcm_token) y registra el estado enviada en notificacion_entrega.
- [ ] Opción B: la app observa filas nuevas en alerta (dif de IDs en refreshAlerts o realtime) y dispara sendAlertNotification local con filtro de horario silencioso.
- [ ] Versionar el trigger + la edge en el repo (supabase/functions + migración).
- [ ] Extender panel-admin: vista de delivery log, editor de horario silencioso, alertId/deep link esperado.
- [ ] El filtro silencioso se evalúa en hora local del teléfono (la DB guarda UTC; Argentina UTC-3: restar 3h al comparar con el SQL Editor).
- [ ] Severidades viejas con otro casing (leve / BRADICARDIA) son de otra versión del generador, no del engine actual.
- [ ] El job cron hu98-recalcular-baselines-nocturno quedó descartado como generador.
- [ ] APK testeado: build manual del CI sobre scrum-95-hu-51-notificaciones-push-de-app-movil (incluye 35bc3ca).

## Metadata

- **External ID:** `SCRUM-189`
- **Source:** jira
- **Kind:** bug
- **Assignee:** Florencia González- **External URL:** https://vitoproyecto-1775921969007.atlassian.net/browse/SCRUM-189- **Last sync:** 2026-09-11 15:28:00.081989+00:00