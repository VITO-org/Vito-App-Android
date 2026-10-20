---
schema_version: 1
doc_type: runbook
title: 'QA push server-side en staging: prechecks Supabase + pruebas en fisico con
  APK del CI'
created_at: '2026-09-11T16:17:06.899352Z'
updated_at: '2026-09-11T16:17:06.899352Z'
tags:
- push
- qa
- staging
- panel-admin
- edge-function
- scrum-95
- apk-ci
- dispositivo-fisico
status: deprecated
links:
- 2026-09-10_fix-push-alertas-server-side-edge-notifica-via-expo-push-versionar-triggeredge-extender-panel-admin
- HU-BUG-PUSH-SERVER-01
- SCRUM-95
vault_scope: local
fingerprint: 5e1eddd625e744393c4736891e5da679f8bdf8aad872777cda4a63bfba0034c5
runbook_kind: operational
applies_to: []
estimated_duration_minutes: 0
last_verified_at: null
---

## Description



## Kind

**operational**

## Applies To

(none)

## Prerequisites

(none)

## Procedure

### Step 1

Pre-check 1 — Edge evaluar-evento desplegada = version del repo (supabase/functions/evaluar-evento/index.ts del commit 4afad0c: Expo Push API + fan-out + insert en notificacion_entrega). Si hubo hotfix desde el dashboard, traerlo al repo antes de seguir.
### Step 2

Pre-check 2 — Secrets de la edge: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY obligatorios (sin ellos la edge devuelve 500); EXPO_ACCESS_TOKEN opcional. Solo via 'supabase secrets', nunca hardcodeados.
### Step 3

Pre-check 3 — Trigger trg_datos_reloj_evaluar_evento existe y apunta a la edge desplegada. Aplicado por SQL Editor (idempotente DROP IF EXISTS + CREATE). NO usar 'supabase db push' hasta reconciliar historial remoto (migraciones 20260901* ausentes en local: migration repair / db pull). Verificar con SELECT tgname FROM pg_trigger.
### Step 4

Pre-check 4 — Schema staging: preferencia_notificacion.horario_silencioso_inicio/fin + tabla notificacion_entrega (estados enviada/recibida/leida/fallida/suprimida). Migracion scripts/migrations/2026-09-08_hu51_quiet_hours_delivery_log.sql aplicada.
### Step 5

Pre-check 5 — RLS staging temporal: RLS deshabilitado en datos_reloj/dispositivo_usuario + policies anon solo para que el panel QA opere sin auth. REVERTIR todo antes de prod (policies finas por auth.uid()). Ver DECs DEC-2026-09-10 y DEC-2026-09-11 de RLS staging.
### Step 6

Pre-check 6 — Timezone quiet-hours: la edge compara la ventana en America/Argentina/Buenos_Aires (columna TIME sin zona, edge corre en UTC). Columna timezone por usuario diferida a fase 2.
### Step 7

Pre-check 7 — Panel-admin operativo: panel-admin/config.js apuntando al Supabase de staging, con vistas de alertas, delivery log por usuario/alerta, editor de quiet-hours y columna alertId + deep-link esperado. Es la consola de inyeccion y verificacion sin tocar la app.
### Step 8

Pre-check 8 — CI en verde + APK disponible: builds validados en CI (build-android-dev.yml -> artifact app-release.apk), no en local. QA arranca descargando ese artifact del push de scrum-95-hu-51-notificaciones-push-de-app-movil.
### Step 9

Fisico 1 — Instalar la APK del CI en dispositivo fisico (no emulador: sin FCM real ni token fisico ni comportamiento de app cerrada), hacer login, conceder permiso de notificaciones y confirmar en Supabase que dispositivo_usuario tiene el fcm_token del equipo.
### Step 10

Fisico 2 — Matriz minima inyectando con panel-admin (ej. SpO2 82 = critica): critica dentro de quiet-hours LLEGA igual (bypass); no-critica dentro de ventana SE SUPRIME (queda suprimida en delivery log); no-critica fuera de ventana llega; tap navega a DetalleSigno con alertId; ciclo enviada (edge) -> recibida (bandeja) -> leida (tap) en notificacion_entrega; app en segundo plano y cerrada; cambio de quiet-hours desde ConfiguracionScreen (presets 23-07/22-06) reflejado en el proximo envio.
### Step 11

Cierre QA -> prod: revertir RLS staging + policies anon; reconciliar historial de migraciones remoto/local; si la edge se toco en caliente, versionarla en el repo. Reemplaza a RB-deploy-qa-de-push-server-side-en-staging y RB-testeo-de-push-con-panel-admin-worktree-rls-staging-apk-ci (deprecated, cuerpo corrupto).


## Verification

(none)


