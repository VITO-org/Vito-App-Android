---
schema_version: 1
doc_type: session
title: 'HU-41: Migración completa a nuevo schema Supabase — alertas + dispositivos
  + notificaciones'
created_at: '2026-08-20T22:21:08.855482Z'
updated_at: '2026-08-20T22:21:08.855482Z'
tags:
- hu-41
- supabase
- alertas
- migracion
- schema
- dispositivos
- notificaciones
- deep-track
status: auto-draft
links: []
vault_scope: local
fingerprint: 9636d6e5795d0d102f3b105f4c51ff26afd3a6734684183f4c1807208648eaa5
session_id: 2026-08-20_hu-41-migracion-completa-a-nuevo-schema-supabase-alertas-dispositivos-notificaciones
pr: null
branch: null
commit: null
cortex_telemetry: null
---

## Original Specification

Adaptar todo el código de la HU-41 (modelos, API, motor de detección, escalación, UI, tests) y agregar las tablas nuevas (dispositivo_usuario, preferencia_notificacion, notificacion_entrega) para alinearse con la nueva estructura SQL de Supabase.

## Changes Made

- **Migration SQL**: Creado `scripts/migrations/2026-08-20_hu41_migracion_schema_alertas.sql` con las 4 tablas nuevas (`alerta`, `dispositivo_usuario`, `preferencia_notificacion`, `notificacion_entrega`). Elimina la tabla vieja `alertas` y sus enums.
- **models.ts**: Reemplazados tipos `Alerta`/`AlertaInsert`/`TipoAlerta`/`SeveridadAlerta`/`EstadoAlerta` por el nuevo schema. Agregados interfaces `AlertaDatos`, `DispositivoUsuario`, `PreferenciaNotificacion`, `NotificacionEntrega`.
- **alerts/types.ts**: `AlertRecord` ahora tiene `titulo`, `mensaje`, `datos` (Record<string,unknown>), `leida_en`, `expira_en`. `AlertStatus` se deriva de `leida_en` ('activa' | 'leida'). Eliminados campos: `estado`, `valor_registrado`, `umbral_configurado`, `generated_at`, `dispositivo_origen`, `confirmed_at`, `escalated_at`, `escalated_to`, `resolved_at`.
- **alerts/detector.ts**: `buildAlertRecord` ahora produce `titulo` (human-readable), `mensaje` (descriptivo con valores), y `datos` jsonb (con `valor_registrado`, `umbral_configurado`, `dispositivo_origen`, `escalada`). Lógica pura de `evaluateSpo2`/`classifySeverity`/`isEpisodeResolved` sin cambios.
- **alerts/engine.ts**: `AlertSupabaseDeps` cambió: `updateAlertStatus` → `markAlertRead` + `updateAlertDatos`. El engine ahora marca alertas como leídas (en vez de cambiar estado) y persiste escalación en `datos` jsonb.
- **alerts/escalation.ts**: `EscalationManager` ahora recibe `updateAlertDatos` en vez de `updateAlertStatus`. La escalación se persiste en `datos` jsonb (`escalada: true`, `escalated_at: timestamp`).
- **api.ts**: CRUD renovado para tabla `alerta` (insertAlerta, getAlertas, getAlertasActivas, marcarAlertaLeida, updateAlertaDatos, countAlertasActivas). Nuevos endpoints: `registerDispositivo`, `getDispositivos`, `deactivateDispositivo`, `getPreferenciaNotificacion`, `upsertPreferenciaNotificacion`.
- **HealthProvider.tsx**: Bridge engine→API reescrito. `insertAlert` mapea al nuevo schema (titulo/mensaje/datos). `getActiveAlerts` deriva `status` de `leida_en`. `markAlertRead` reemplaza `updateAlertStatus`.
- **AlertasScreen.tsx**: Tabs cambiadas de 'Todas/No leídas/Resueltas' a 'Todas/No leídas/Leídas'. `isAlertRead` ahora checkea `leida_en !== null`. `alertDescription` usa `titulo`/`mensaje`/`datos`. Agregado color 'info' para severidad INFO.
- **schema.sql**: Sección de alertas reemplazada: eliminados enums + tabla `alertas`, agregadas 4 tablas nuevas con índices y RLS.
- **__tests__/alerts.test.ts**: 29 tests actualizados para nuevos tipos. Todos pasan. `buildAlertRecord` ahora verifica `titulo`, `mensaje`, `datos`. `EscalationManager` verifica `datos.escalada`. `AlertEngine` verifica `markAlertRead` en vez de `updateAlertStatus`.

## Files Touched

- `scripts/migrations/2026-08-20_hu41_migracion_schema_alertas.sql`
- `src/services/supabase/models.ts`
- `src/services/alerts/types.ts`
- `src/services/alerts/detector.ts`
- `src/services/alerts/engine.ts`
- `src/services/alerts/escalation.ts`
- `src/services/supabase/api.ts`
- `src/context/HealthProvider.tsx`
- `src/screens/AlertasScreen.tsx`
- `src/services/supabase/schema.sql`
- `__tests__/alerts.test.ts`

## Key Decisions

- Modelo de vida de alerta: state-machine (activa/confirmada/escalada/resuelta) → leído/no-leído (leida_en null = no leída). Razón: simplifica el schema y la UI, la escalación se maneja internamente.
- Campos flexibles en jsonb: valor_registrado, umbral_configurado, dispositivo_origen, escalada van en `datos` jsonb en vez de columnas separadas. Razón: el schema es más extensible para futuros tipos de alerta.
- Escalación por timeout se mantiene como lógica interna del engine (timer en memoria) y se persiste en `datos` jsonb. No requiere columna separada en la tabla.
- Enums de PostgreSQL eliminados: todo es varchar en la BD. Los tipos TS usan string literals.
- Severidad ahora incluye 'INFO' además de 'advertencia'/'critica' para futuros tipos de alerta menos urgentes.

## Next Steps

- [ ] Ejecutar la migration SQL `scripts/migrations/2026-08-20_hu41_migracion_schema_alertas.sql` en Supabase SQL Editor.
- [ ] Eliminar o renombrar el migration viejo `scripts/migrations/2026-08-18_hu41_tabla_alertas.sql` (ya no aplica).
- [ ] Verificar la UI de AlertasScreen en el emulador/dispositivo.
- [ ] Las tablas `dispositivo_usuario`, `preferencia_notificacion`, `notificacion_entrega` están listas pero sin lógica de UI — se usan en HU-51 (push notifications).

## Verified State

- 29/29 tests pasan en __tests__/alerts.test.ts
- TypeScript compilation: 0 errores en los 11 archivos modificados
- Lógica pura del detector sin cambios (evaluateSpo2/classifySeverity/isEpisodeResolved)
-  barrel file index.ts no necesita cambios (re-exports tipos con mismos nombres)

## Unverified Claims

- Migración SQL no ejecutada contra Supabase real
- Funciones API de dispositivo_usuario/preferencia_notificacion no testeadas end-to-end
- UI de AlertasScreen no verificada visualmente en emulador/dispositivo
