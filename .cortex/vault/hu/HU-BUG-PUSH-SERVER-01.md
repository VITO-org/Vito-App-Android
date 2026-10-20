---
schema_version: 1
doc_type: hu
title: 'BUG: Push no se dispara para alertas generadas server-side (trigger + Edge
  Function evaluar-evento)'
created_at: '2026-09-10T02:35:43.617443Z'
updated_at: '2026-09-10T02:35:43.617443Z'
tags:
- hu
- bug
- push
- alertas
- server-side
- scrum-95
status: backlog
links:
- 2026-09-08_hu-51-completar-push-notifications-deep-link-horario-silencioso-log-de-delivery
vault_scope: local
fingerprint: dbce1a5a4d2297d0db0bdc20adfcf0dc70e8f7f1f6a5c46a9e4ea8a1352875a5
external_id: BUG-PUSH-SERVER-01
source: cortex-SDDwork
kind: story
assignee: null
external_url: null
synced_at: null
---

## Description

Como usuario quiero recibir el push aunque la alerta la genere el servidor (trigger + Edge Function), para enterarme en tiempo real sin tener la app abierta. Comportamiento actual: el panel-admin inserta en datos_reloj -> trigger trg_datos_reloj_evaluar_evento -> Edge Function evaluar-evento -> fila en alerta en ~1s (verificado 2026-09-10: SpO2 82 a las 00:31:51 UTC -> hipoxia crítica 00:31:52 UTC, visible en AlertasScreen). Pero el teléfono nunca muestra la notificación, porque sendAlertNotification solo se llama en el onGenerated del AlertEngine local (HealthProvider.tsx:171-179), que únicamente evalúa el dato vivo de Health Connect y nunca las filas manuales. La app no tiene realtime a datos_reloj y el auto-refresh mínimo es 60s. Pasos para reproducir: 1) Servir panel-admin de la rama feature/admin-panel-web (http://localhost:8000). 2) RLS: ALTER TABLE datos_reloj DISABLE ROW LEVEL SECURITY + policies anon de lectura en alerta y perfil_usuario. 3) Generar SpO2 82 para el usuario de prueba. 4) Verificar la alerta fresca: SELECT titulo, tipo, severidad, created_at FROM alerta ORDER BY created_at DESC LIMIT 5. 5) Forzar sync en el APK (build manual del CI sobre scrum-95-hu-51-notificaciones-push-de-app-movil): la alerta aparece en AlertasScreen pero no llega ningún push. Causa raíz: Generación de alertas server-side no versionada en el repo (trigger + edge solo existen en el dashboard de Supabase) combinada con push cableado únicamente al engine local de la app. Alcance propuesto: Opción A (recomendada): la Edge Function evaluar-evento envía el push vía Expo Push API usando el token de dispositivo_usuario (columna fcm_token) y registra el estado enviada en notificacion_entrega. Opción B: la app observa filas nuevas en alerta (dif de IDs en refreshAlerts o realtime) y dispara sendAlertNotification local con filtro de horario silencioso. Versionar el trigger + la edge en el repo (supabase/functions + migración). Extender panel-admin: vista de delivery log, editor de horario silencioso, alertId/deep link esperado. Criterios de aceptación: [ ] server-side genera push en 2do plano y cerrada; [ ] enviada en notificacion_entrega con id_alerta + id_dispositivo; [ ] tap navega a DetalleSigno con alertId; [ ] quiet hours respetado; [ ] trigger + edge versionados. Notas: filtro silencioso en hora local del teléfono (DB UTC, Argentina UTC-3); severidades viejas con otro casing son de otra versión del generador; cron hu98 descartado; APK con 35bc3ca.

## Acceptance Criteria

- [ ] Las alertas server-side generan push con la app en segundo plano y cerrada
- [ ] Estado enviada registrado en notificacion_entrega con id_alerta + id_dispositivo
- [ ] Al tocar la notificación se navega al DetalleSigno con el alertId
- [ ] Horario silencioso respetado (no-críticas suprimidas en ventana, críticas siempre)
- [ ] Trigger + Edge Function versionados en el repo

## Metadata

- **External ID:** `BUG-PUSH-SERVER-01`
- **Source:** cortex-SDDwork
- **Kind:** story
