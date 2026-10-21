---
schema_version: 1
doc_type: spec
title: 'Fix push alertas server-side: edge notifica vía Expo Push + versionar trigger/edge
  + extender panel-admin'
created_at: '2026-09-10T02:56:28.749861Z'
updated_at: '2026-09-10T02:56:28.749861Z'
tags:
- spec
- spec
- bug-fix
- push
- edge-function
- trigger
- panel-admin
- scrum-95
status: draft
links: []
vault_scope: local
fingerprint: 6165727ffce9a9d0b9c8026e07592956a2b0717f0f12705359fc8333d207aabd
verification_hooks:
- name: Edge type-check
  command: npx tsc --noEmit -p supabase/functions/evaluar-evento/tsconfig.json 2>&1
    | tail -10
  required: true
  success_criteria: exit code 0
  timeout_seconds: 120
- name: Panel JS syntax
  command: node --check panel-admin/app.js && echo PANEL-SYNTAX-OK
  required: true
  success_criteria: PANEL-SYNTAX-OK
  timeout_seconds: 60
- name: Migraciones idempotentes
  command: grep -c -E 'IF NOT EXISTS|DROP POLICY IF EXISTS|DROP TRIGGER IF EXISTS'
    supabase/migrations/20260910235900_trg_datos_reloj_evaluar_evento.sql panel-admin/supabase-setup.sql
  required: true
  success_criteria: cada archivo con >=2 marcadores
  timeout_seconds: 30
goal: 'Corregir el bug HU-BUG-PUSH-SERVER-01: las alertas generadas server-side (trigger
  + Edge Function evaluar-evento) deben disparar push en el dispositivo aunque la
  app esté cerrada, con filtro quiet-hours y delivery log, versionando trigger+edge
  en el repo y extendiendo panel-admin para QA.'
files_in_scope:
- supabase/functions/evaluar-evento/index.ts
- supabase/migrations/20260910235900_trg_datos_reloj_evaluar_evento.sql
- panel-admin/index.html
- panel-admin/app.js
- panel-admin/config.js
- panel-admin/styles.css
- panel-admin/supabase-setup.sql
- src/services/supabase/api.ts
- src/services/supabase/models.ts
constraints:
- 'Stack: Supabase Edge Functions (Deno/TS) + pg_net trigger existente; app RN sin
  cambios salvo que la opción elegida lo requiera'
- Secrets (service_role) solo vía Vault/supabase secrets, nunca hardcodeados
- Solo staging hasta QA verde; prod requiere aprobación explícita
- No pruebas de carga (out of scope)
acceptance_criteria:
- '[CA-01] Edge evaluar-evento envía push vía Expo Push API al crear cada alerta,
  usando el token activo de dispositivo_usuario; funciona con app cerrada'
- '[CA-02] Filtro quiet-hours aplicado en la edge (lee preferencia_notificacion):
  no-críticas suprimidas en ventana, críticas siempre entregadas'
- '[CA-03] Cada envío registra estado enviada en notificacion_entrega con id_alerta
  + id_dispositivo + id_usuario'
- '[CA-04] Trigger trg_datos_reloj_evaluar_evento + edge versionados en el repo y
  deployables sin pasos manuales en dashboard'
- '[CA-05] Panel-admin en el repo con vista de delivery log, editor de horario silencioso
  y alertId/deep-link esperado por alerta'
---

## Goal

Corregir el bug HU-BUG-PUSH-SERVER-01: las alertas generadas server-side (trigger + Edge Function evaluar-evento) deben disparar push en el dispositivo aunque la app esté cerrada, con filtro quiet-hours y delivery log, versionando trigger+edge en el repo y extendiendo panel-admin para QA.

## Requirements

- Extraer fielmente la Edge Function evaluar-evento desde el dashboard Supabase y versionarla en supabase/functions/evaluar-evento/index.ts sin cambiar su lógica de umbrales
- Al crear cada alerta, la edge obtiene el dispositivo activo del usuario (dispositivo_usuario por id_usuario, fcm_token no nulo) y envía push vía Expo Push API (https://exp.host/--/api/v2/push/send) con título/mensaje/severidad/data {alertId, alertType, severity}
- Aplicar filtro quiet-hours en la edge leyendo preferencia_notificacion (horario_silencioso_inicio/fin, hora local del usuario; críticas bypasean siempre)
- Registrar cada envío en notificacion_entrega (estado enviada, id_alerta, id_dispositivo, id_usuario, enviado_en) y tolerar receipts con token inválido marcando error_mensaje sin romper el flujo
- Versionar el trigger en supabase/migrations/20260910235900_trg_datos_reloj_evaluar_evento.sql de forma idempotente (DROP IF EXISTS + CREATE) apuntando a la edge desplegada
- Traer panel-admin/ de feature/admin-panel-web al árbol y extenderlo: vista de notificacion_entrega por usuario/alerta, editor de horario silencioso (presets 23–07/22–06/00–06 + custom), y columna alertId + destino deep-link esperado por alerta

## Files in Scope

- `supabase/functions/evaluar-evento/index.ts`
- `supabase/migrations/20260910235900_trg_datos_reloj_evaluar_evento.sql`
- `panel-admin/index.html`
- `panel-admin/app.js`
- `panel-admin/config.js`
- `panel-admin/styles.css`
- `panel-admin/supabase-setup.sql`
- `src/services/supabase/api.ts`
- `src/services/supabase/models.ts`

## Constraints

- Stack: Supabase Edge Functions (Deno/TS) + pg_net trigger existente; app RN sin cambios salvo que la opción elegida lo requiera
- Secrets (service_role) solo vía Vault/supabase secrets, nunca hardcodeados
- Solo staging hasta QA verde; prod requiere aprobación explícita
- No pruebas de carga (out of scope)

## Acceptance Criteria

- [ ] [CA-01] Edge evaluar-evento envía push vía Expo Push API al crear cada alerta, usando el token activo de dispositivo_usuario; funciona con app cerrada
- [ ] [CA-02] Filtro quiet-hours aplicado en la edge (lee preferencia_notificacion): no-críticas suprimidas en ventana, críticas siempre entregadas
- [ ] [CA-03] Cada envío registra estado enviada en notificacion_entrega con id_alerta + id_dispositivo + id_usuario
- [ ] [CA-04] Trigger trg_datos_reloj_evaluar_evento + edge versionados en el repo y deployables sin pasos manuales en dashboard
- [ ] [CA-05] Panel-admin en el repo con vista de delivery log, editor de horario silencioso y alertId/deep-link esperado por alerta

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### Edge type-check
```bash
npx tsc --noEmit -p supabase/functions/evaluar-evento/tsconfig.json 2>&1 | tail -10
```

Success: exit code 0 · Timeout: 120s
### Panel JS syntax
```bash
node --check panel-admin/app.js && echo PANEL-SYNTAX-OK
```

Success: PANEL-SYNTAX-OK · Timeout: 60s
### Migraciones idempotentes
```bash
grep -c -E 'IF NOT EXISTS|DROP POLICY IF EXISTS|DROP TRIGGER IF EXISTS' supabase/migrations/20260910235900_trg_datos_reloj_evaluar_evento.sql panel-admin/supabase-setup.sql
```

Success: cada archivo con >=2 marcadores · Timeout: 30s
