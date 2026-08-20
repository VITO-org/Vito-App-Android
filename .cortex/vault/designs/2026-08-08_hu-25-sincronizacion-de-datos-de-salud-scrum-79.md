---
schema_version: 1
doc_type: design
title: HU-25 — Motor de sincronización con origen, conflictos y versión
created_at: '2026-08-08T13:31:51.578079Z'
updated_at: '2026-08-08T13:31:51.578079Z'
tags:
- hu-25
- scrum-79
- design
- sync
- conflictos
- versionado
status: draft
links: []
vault_scope: local
fingerprint: 528b4b7bc5da288f5dc1e695bed4cfd73ffadade48e62f2f28308687735f4de9
session_id: 2026-08-08_hu-25-sincronizacion-de-datos-de-salud-scrum-79
spec_path: /mnt/c/Vito-App-Android/.cortex/vault/specs/2026-08-08_hu-25-sincronizacion-de-datos-de-salud-scrum-79.md
---

# HU-25 — Motor de sincronización con origen, conflictos y versión

> *Design document — Pluggable Middle Phase 09.B.*
> *Session: `2026-08-08_hu-25-sincronizacion-de-datos-de-salud-scrum-79` · Spec: `/mnt/c/Vito-App-Android/.cortex/vault/specs/2026-08-08_hu-25-sincronizacion-de-datos-de-salud-scrum-79.md`*

## Architecture decision

Motor central `src/services/healthSync.ts` con inyección de dependencias (API de Supabase) para testabilidad pura. DESVIACIÓN DOCUMENTADA de la spec R1: la spec propuso `datos_clinicos_config.intervalo_sync_min`, pero esa tabla fue RENOMBRADA a `datos_reloj` en HU-92 y su referencia está banned en el repo (vault/hu/hu-92_diseno-modelo-datos-ml.md). El intervalo configurable se persiste en `perfil_usuario.intervalo_sync_min` (tabla existente, co-located con peso/altura que HU-92 movió allí) y se lee con `getProfile()` ya existente — sin nuevas funciones de API. Versionado de origen: columnas `origen TEXT NOT NULL DEFAULT 'wearable'` y `reemplazado_por UUID NULL` en `datos_reloj` (nullable → contratos de lectura intactos). Resolución de conflictos: ventana temporal ±5 min por (id_usuario, signo), prioridad wearable > manual; el registro manual se marca con reemplazado_por = id del wearable ganador. Dedupe: lecturas wearable idénticas en ventana se descartan (misma lógica que HealthDataCache). Se ELIMINA el leftover `upsertDatosClinicosConfig` de HealthProvider (código muerto pre-HU-92 que referencia tabla eliminada y rompía tsc con `hr` sin declarar).

## Data model changes

- datos_reloj: ADD COLUMN origen TEXT NOT NULL DEFAULT 'wearable' (nullable en tipos TS para compatibilidad de lectura)
- datos_reloj: ADD COLUMN reemplazado_por UUID NULL REFERENCES datos_reloj(id) ON DELETE SET NULL
- perfil_usuario: ADD COLUMN intervalo_sync_min INTEGER NULL (minutos; NULL => default 10)
- models.ts: nuevo type OrigenDato = 'wearable' | 'manual'; DatosReloj + origen/reemplazado_por nullable; DatosRelojInsert + origen opcional; PerfilUsuario + intervalo_sync_min nullable

## API contracts

- syncWearableToBackend(userId: string|null, summary: HealthSummary, deps: HealthSyncDeps, now?: Date): Promise<SyncResult> — status 'inserted'|'deduplicated'|'no_user'|'empty', conflictResolved: boolean, manualReplaced: string[]
- HealthSyncDeps: { insertDatosReloj, getDatosRelojInWindow(userId, from, to), markDatosRelojReemplazado(id, reemplazadoPor) }
- api.ts: getDatosReloj options + origen?: OrigenDato (filtro .eq)
- api.ts: insertDatosReloj/insertDatosRelojBatch → safeDato agrega origen ?? 'wearable'
- api.ts (NUEVO): markDatosRelojReemplazado(id, reemplazadoPor) → UPDATE datos_reloj SET reemplazado_por
- api.ts: syncHealthSummaryToSupabase queda @deprecated (delega concepto en healthSync; no importa healthSync para evitar ciclo api⇄healthSync)
- HealthContextValue: + syncIntervalMin: number (minutos, default 10, clamp >= MIN_SYNC_INTERVAL_MS)

## Test plan

- __tests__/healthSync.test.ts (a) SIN conflicto: getDatosRelojInWindow devuelve [] → inserta con origen 'wearable', status inserted, conflictResolved false
- (b) CON conflicto: window devuelve registro manual → inserta wearable, markDatosRelojReemplazado llamado con id manual, manualReplaced=[id], conflictResolved true
- (c) FUENTE DESCONECTADA: getDatosRelojInWindow/insert lanzan → syncWearableToBackend propaga el error; HealthProvider lo captura, conserva summary/lastSync previos y setea error warning (verificado en el diff de HealthProvider, no en unit test puro)
- dedupe: window con wearable idéntico → status 'deduplicated', sin insert
- no_user: userId null → status 'no_user' sin llamadas a deps

## Risks

- tsc --noEmit ya falla en dev con ~20 errores preexistentes (PermissionButton accent, BottomTabNavigator onPress, AlertasScreen/InicioScreen style filter, DetalleSignoScreen gifted-charts sin tipos, DatoReloj vs DatosReloj en screens, tsconfig expo/tsconfig.base no encontrado). Mi cambio no agrega errores; elimina los de HealthProvider (hr sin declarar) y el bloqueo de import de api.ts:350
- Migración SQL se ejecuta manualmente en Supabase (el repo no mantiene migraciones versionadas)
- updateClinicalConfig/upsertDatosClinicosConfig/DatosClinicosConfig (código muerto pre-HU-92) NO se implementan ni se eliminan: quedan como errores tsc preexistentes fuera de scope
- jest no tiene config en el repo: tests puros TS vía babel-jest default; si falla el transform se agrega jest.config.js mínimo

---

*Generated by `cortex-code-designer` (Pluggable Middle Phase 09.B). The
implementer reads this document and follows it; deviations require a
new checkpoint with the `unverified_claims` justifying the diff.*
