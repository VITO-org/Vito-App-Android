---
schema_version: 1
doc_type: design
title: 'Fix push alertas server-side: edge notifica vía Expo Push + trigger versionado
  + panel-admin'
created_at: '2026-09-10T19:37:20.443928Z'
updated_at: '2026-09-10T19:37:20.443928Z'
tags:
- design
- push
- edge-function
- expo
- quiet-hours
- panel-admin
- scrum-95
status: draft
links: []
vault_scope: local
fingerprint: 37d42bfd39df1759e9355af4090cff6386e60007469c182b172790e1b9d8cbd6
session_id: 2026-09-10_fix-push-alertas-server-side-edge-notifica-via-expo-push-versionar-triggeredge-extender-panel-admin
spec_path: /mnt/c/Vito-App-Android/.cortex/vault/specs/2026-09-10_fix-push-alertas-server-side-edge-notifica-via-expo-push-versionar-triggeredge-extender-panel-admin.md
---

# Fix push alertas server-side: edge notifica vía Expo Push + trigger versionado + panel-admin

> *Design document — Pluggable Middle Phase 09.B.*
> *Session: `2026-09-10_fix-push-alertas-server-side-edge-notifica-via-expo-push-versionar-triggeredge-extender-panel-admin` · Spec: `/mnt/c/Vito-App-Android/.cortex/vault/specs/2026-09-10_fix-push-alertas-server-side-edge-notifica-via-expo-push-versionar-triggeredge-extender-panel-admin.md`*

## Architecture decision

Opcion A (elegida): Edge Function evaluar-evento envia push via Expo Push API tras INSERT de alerta. Descartadas: (B) FCM directo — requiere firebase-admin + service-account, rompe compat con ExponentPushToken en dispositivo_usuario.fcm_token; (C) push solo local RN — causa raiz del bug, no funciona con app cerrada. Flujo: 1) INSERT datos_reloj -> 2) TRIGGER pg_net trg_datos_reloj_evaluar_evento (AFTER INSERT FOR EACH ROW, DROP TRIGGER IF EXISTS) net.http_post a /functions/v1/evaluar-evento con service_role via vault secret + payload {record} -> 3) EDGE (Deno/TS, service_role): evalua umbrales existentes sin cambios, INSERT alerta -> 4) fan-out push: SELECT dispositivo activo + SELECT preferencia -> quiet-hours -> POST Expo -> 5) INSERT notificacion_entrega (id_alerta, id_dispositivo, id_usuario, estado, error_mensaje, enviado_en=now). Invariantes: fallo Expo/trigger jamas revierte alerta (try/catch por dispositivo, Promise.allSettled); una alerta = N entregas; trigger+edge versionados en repo desplegables con functions deploy + db push sin dashboard manual.

## Data model changes

- Sin cambios de schema: reuso alerta, dispositivo_usuario, preferencia_notificacion, notificacion_entrega
- Q1 dispositivo activo: SELECT id, fcm_token FROM dispositivo_usuario WHERE id_usuario=<uid> AND fcm_token IS NOT NULL (AND activo=true si existe columna; validar LIKE 'ExponentPushToken[%')
- Q2 preferencia: SELECT push_habilitado, horario_silencioso_inicio, horario_silencioso_fin FROM preferencia_notificacion WHERE id_usuario=<uid> (defaults si missing: true, 23:00/07:00)
- Q3 insert entrega exito: INSERT INTO notificacion_entrega (id_alerta,id_dispositivo,id_usuario,estado,error_mensaje,enviado_en) VALUES (...,'enviada',ticket-id|null,now()); suprimida: estado='enviada', error_mensaje='suprimida_quiet_hours'; fallida: estado='fallida', error_mensaje=<detalle>
- Q4 lectura panel: SELECT ne.*, a.tipo, a.severidad FROM notificacion_entrega ne JOIN alerta a ON a.id=ne.id_alerta WHERE ne.id_usuario=<uid> ORDER BY enviado_en DESC LIMIT 50

## API contracts

- Expo Push POST https://exp.host/--/api/v2/push/send — headers Content-Type/Accept application/json (+ Access-Token si EXPO_ACCESS_TOKEN). Body: { to:<ExponentPushToken>, title, body, sound:'default', priority:'high'| 'default', data:{ alertId(uuid), alertType, severity, screen:'AlertDetail' } }
- Tickets: [{status:'ok',id} | {status:'error',message,details:{error:'DeviceNotRegistered'|...}}]. Receipts fase 2: GET push/getReceipts con {ids:[ticket-id]}
- Errores: DeviceNotRegistered -> UPDATE notificacion_entrega estado='fallida', error_mensaje='DeviceNotRegistered: token revocado' (no reintentar). Otros errores/timeout -> estado='fallida', error_mensaje=<detalle>; nunca revierte INSERT alerta
- Quiet-hours edge previo a POST: leer preferencia_notificacion (push_habilitado, inicio/fin TIME default 23:00/07:00). push_habilitado=false -> suprimir. severity=='critica' -> bypass siempre. Hora local via timezone default America/Argentina/Buenos_Aires (convierte now UTC -> local). Ventana wrap: inicio<=fin ? inicio<=now<fin : now>=inicio OR now<fin. Suprimidas: NO llamar Expo, INSERT estado='enviada', error_mensaje='suprimida_quiet_hours'. Nota UTC: TIME sin tz, edge compara en local convertido
- Deep-link: data.screen='AlertDetail'+alertId; keys exactas {alertId,alertType,severity,screen} compatibles con NotificationsProvider.tsx y src/services/notifications/index.ts

## Test plan

- Hook1 Edge type-check: npx tsc --noEmit -p supabase/functions/evaluar-evento/tsconfig.json -> exit 0
- Hook2 Panel JS syntax: node --check panel-admin/app.js -> PANEL-SYNTAX-OK
- Hook3 Migraciones idempotentes: grep -c IF NOT EXISTS|DROP POLICY IF EXISTS|DROP TRIGGER IF EXISTS en ambos .sql -> >=2 c/u
- QA1 app cerrada: INSERT SpO2 82 en datos_reloj staging -> alerta + push con app killed + entrega enviada con ids
- QA2 quiet-hours: presets 23-07/22-06/00-06+custom; no-critica en ventana -> sin push + suprimida_quiet_hours; critica -> push bypass
- QA3 delivery log: panel muestra entregas por usuario/alerta con alertId + deep-link screen=AlertDetail; token invalido muestra DeviceNotRegistered

## Risks

- Secrets: service_role solo via supabase secrets/Vault, nunca hardcodeado; riesgo leak .env -> mitigacion .gitignore + revision finish-session
- Timezone UTC vs local: TIME sin tz + edge UTC, conversion a America/Argentina/Buenos_Aires por defecto; si usuario viaja ventana se desplaza -> fase 2 columna timezone
- N dispositivos: fan-out Promise.allSettled, token revocado no bloquea otros; filtrar LIKE ExponentPushToken% y marcar fallidas para limpieza
- Expo failures no rompen alerta: POST en try/catch por dispositivo, INSERT alerta commitea antes del fan-out
- RLS staging: edge service_role bypass solo server-side; panel-admin anon key con SELECT limitado; no prod hasta QA verde
- Idempotencia SQL: DROP TRIGGER IF EXISTS + CREATE TRIGGER + CREATE EXTENSION IF NOT EXISTS pg_net; setup panel con IF NOT EXISTS / DROP POLICY IF EXISTS; hook grep exige >=2 marcadores

---

*Generated by `cortex-code-designer` (Pluggable Middle Phase 09.B). The
implementer reads this document and follows it; deviations require a
new checkpoint with the `unverified_claims` justifying the diff.*
