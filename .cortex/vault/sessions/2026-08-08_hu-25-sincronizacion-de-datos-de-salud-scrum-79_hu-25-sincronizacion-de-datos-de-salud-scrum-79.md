---
schema_version: 1
doc_type: session
title: HU-25 — Sincronización de datos de salud (SCRUM-79)
created_at: '2026-08-08T14:20:33.003682Z'
updated_at: '2026-08-08T14:20:33.003682Z'
tags:
- hu-25
- scrum-79
- sincronizacion
- supabase
- health-connect
- conflictos
status: auto-draft
links:
- vault/designs/2026-08-08_hu-25-sincronizacion-de-datos-de-salud-scrum-79.md
- vault/specs/2026-08-08_hu-25-sincronizacion-de-datos-de-salud-scrum-79.md
- vault/hu/hu-92_diseno-modelo-datos-ml.md
vault_scope: local
fingerprint: 7c06427cc2015c5eef5dda2540010f2b512b741125a960c32d55901805f2d64f
session_id: 2026-08-08_hu-25-sincronizacion-de-datos-de-salud-scrum-79
pr: null
branch: null
commit: null
cortex_telemetry: null
---

## Original Specification

Implementar sincronización automática de datos de salud con intervalo configurable, detección y resolución de conflictos entre fuentes (wearable > manual) y versionado auditable del origen de cada registro, sin romper el flujo actual de lectura (Inicio/Historial) ni el pipeline ML.

## Changes Made

Implementación de HU-25 completa y commiteada en `84c1762` (rama `scrum-79-hu-25-sincronizacion-datos-salud`, 1 adelante de dev `551cd2b`): motor `src/services/healthSync.ts` con `syncWearableToBackend()` + deps inyectadas, suite de tests `__tests__/healthSync.test.ts` (5 tests, todos PASS), migración `scripts/migrations/2026-08-08_hu25_datos_reloj_origen.sql` (ejecutada manualmente en Supabase: columnas `origen` y `reemplazado_por` en `datos_reloj`, `intervalo_sync_min` en `perfil_usuario`, índice de ventana), modelos actualizados (OrigenDato, DatosReloj+origen/reemplazado_por, PerfilUsuario+intervalo_sync_min), api.ts con markDatosRelojReemplazado + filtro origen en getDatosReloj, HealthProvider con intervalo configurable y delegación a healthSync. Se eliminó el leftover `upsertDatosClinicosConfig`/`updateClinicalConfig` (código muerto pre-HU-92 que rompía tsc). DevTrack: explorer → designer (design doc) → implementer con 2 checkpoints aceptados.

## Files Touched

- `src/services/healthSync.ts` (NUEVO)
- `__tests__/healthSync.test.ts` (NUEVO)
- `scripts/migrations/2026-08-08_hu25_datos_reloj_origen.sql` (NUEVO)
- `src/services/supabase/models.ts`
- `src/services/supabase/api.ts`
- `src/context/HealthProvider.tsx`
- `src/types/health.ts`

## Key Decisions

- Desviación documentada de la spec R1: `intervalo_sync_min` vive en `perfil_usuario` (no en `datos_clinicos_config`, tabla renombrada a datos_reloj en HU-92 y banned) — ver ADR-001.
- Versionado de origen con columnas denormalizadas `origen`/`reemplazado_por` en `datos_reloj`, no tabla de auditoría — ver ADR-002.
- `syncHealthSummaryToSupabase` queda @deprecated (concepto delegado a healthSync; sin import circular api⇄healthSync).

## Next Steps

- Validar en dispositivo real con Metro (sync wearable → datos_reloj sin colgar).
- Abrir PR `scrum-79-hu-25-sincronizacion-datos-salud` → `dev`.
- Ver ADR-001/ADR-002 y DEC-CRLF en vault/decisions.
