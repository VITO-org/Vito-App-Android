---
schema_version: 1
doc_type: spec
title: HU-25 — Sincronización de datos de salud (SCRUM-79)
created_at: '2026-08-08T13:23:20.385132Z'
updated_at: '2026-08-08T13:23:20.385132Z'
tags:
- spec
- hu-25
- scrum-79
- sincronizacion
- health-connect
- wearable
- conflictos
- versionado
- datos-reloj
- supabase
status: draft
links: []
vault_scope: local
fingerprint: ec9b2df34dae6796e5aaf38de3c8d758d2ccc291938c96dc57dbc82eaf387bcc
verification_hooks:
- name: Lint
  command: npm run lint
  required: true
  success_criteria: exit code 0
  timeout_seconds: 180
- name: Type-check
  command: npx tsc --noEmit
  required: true
  success_criteria: exit code 0
  timeout_seconds: 240
- name: Unit tests
  command: npx jest __tests__/healthSync.test.ts --silent
  required: true
  success_criteria: 3 tests pass (sin conflicto, con conflicto, fuente desconectada)
  timeout_seconds: 180
goal: Implementar sincronización automática de datos de salud con intervalo configurable,
  detección y resolución de conflictos entre fuentes (wearable > manual) y versionado
  auditable del origen de cada registro, sin romper el flujo actual de lectura (Inicio/Historial)
  ni el pipeline ML.
files_in_scope:
- src/services/healthSync.ts (NUEVO — motor central de sincronización)
- __tests__/healthSync.test.ts (NUEVO — 3 escenarios DoD)
- scripts/migrations/2026-08-08_hu25_datos_reloj_origen.sql (NUEVO — migración documentada)
- src/services/supabase/models.ts (DatosReloj/DatosRelojInsert + OrigenDato + origen/reemplazado_por)
- src/services/supabase/api.ts (insertDatosReloj/insertDatosRelojBatch con origen,
  getDatosReloj con filtro origen, upsertDatosClinicosConfig con intervalo_sync_min,
  syncHealthSummaryToSupabase delegado o deprecado)
- src/context/HealthProvider.tsx (intervalo configurable + delegación a healthSync
  + manejo fuente desconectada)
- src/types/health.ts (exponer syncIntervalMin si aplica al contexto)
- src/services/HealthDataCache.ts (sin cambios o menores, validar compatibilidad)
constraints:
- Reutilizar normalizeVital() y NORMAL_RANGES existentes; NO duplicar lógica de normalización.
- 'La migración SQL se ejecuta manualmente en Supabase (el repo no mantiene migraciones
  versionadas): dejar el script documentado y avisar al equipo.'
- 'Los contratos de lectura de getDatosReloj() no cambian: las nuevas columnas son
  opcionales (nullable) para no romper HistorialScreen/InicioScreen ni el pipeline
  ML (promedio_semanal_ml).'
- 'Nombrar la rama scrum-79-hu-25-sincronizacion-datos-salud y usar commits feat(HU-25):
  ... / fix(HU-25): ... (convención del repo).'
- 'No romper CI existente: npm run lint, npx tsc --noEmit, npx jest --passWithNoTests.'
- 'Vocabulario: usar ''sincronización'', ''origen de dato'', ''datos_reloj'', ''registro
  manual'' (CONTEXT.md no define sinónimos prohibidos aún).'
- 'No inventar contexto histórico: el retrieval de cortex_sync_ticket devolvió memorias
  de otro proyecto (cv-portfolio), no aplicable a esta spec.'
acceptance_criteria:
- 'AC-01 (CA-01): La sincronización automática corre por intervalo configurable (datos_clinicos_config.intervalo_sync_min,
  default 10 min) con límite inferior definido para modo casi-tiempo-real.'
- 'AC-02 (CA-02): Se detectan conflictos entre fuentes (mismo usuario, mismo signo,
  ventana temporal ±5 min) con lógica testeada.'
- 'AC-03 (CA-03): En conflicto wearable vs manual gana el wearable; el registro manual
  queda auditado como reemplazado (reemplazado_por).'
- 'AC-04 (Versionado): Todo registro en datos_reloj tiene origen auditable (''wearable''|''manual'')
  y timestamps (recorded_at/created_at), visible en el modelo y en la migración.'
- 'AC-05 (DoD pruebas): Suite jest cubre sincronización sin conflicto, con conflicto
  y fuente desconectada; pasa en CI.'
- 'AC-06 (No regresión): lint + tsc --noEmit + jest pasan; HistorialScreen/InicioScreen
  siguen leyendo datos_reloj y caché sin cambios de contrato.'
---

## Goal

Implementar sincronización automática de datos de salud con intervalo configurable, detección y resolución de conflictos entre fuentes (wearable > manual) y versionado auditable del origen de cada registro, sin romper el flujo actual de lectura (Inicio/Historial) ni el pipeline ML.

## Requirements

- R1 (CA-01): Hacer configurable el intervalo de sincronización. El HealthProvider debe leer el intervalo desde datos_clinicos_config (nuevo campo intervalo_sync_min, default 10 min) en lugar del hardcode AUTO_REFRESH_INTERVAL_MS=600_000. Exponer syncIntervalMin en HealthContextValue. Definir constante MIN_SYNC_INTERVAL (p.ej. 60s) como límite inferior para 'tiempo real'.
- R2: Crear motor central src/services/healthSync.ts con syncWearableToBackend(userId, summary, opts): normaliza con normalizeVital() existente, construye DatosRelojInsert con origen 'wearable' y delega en insertDatosReloj. Unifica la lógica hoy duplicada entre HealthProvider.loadHealthData() y syncHealthSummaryToSupabase().
- R3 (CA-02): Detección de conflictos: antes de insertar, consultar getDatosReloj por (id_usuario, ventana temporal ±SYNC_CONFLICT_WINDOW_MS, p.ej. ±5 min) filtrando origen distinto. Un conflicto = registro de otra fuente para el mismo usuario y signo dentro de la ventana. El dedupe evita lecturas idénticas consecutivas del wearable en la misma ventana.
- R4 (CA-03): Resolución de conflictos con prioridad wearable > manual: si existe un registro manual en la ventana, el wearable gana; el registro manual se marca como reemplazado (columna reemplazado_por = id del registro wearable ganador). Si ambas son wearable, dedupe por cercanía temporal.
- R5 (Versionado/auditoría): Agregar columna origen (text 'wearable'|'manual') y opcional reemplazado_por (uuid) a datos_reloj en DatosReloj/DatosRelojInsert (models.ts) + insertDatosReloj/insertDatosRelojBatch. Documentar migración SQL en scripts/migrations/2026-08-08_hu25_datos_reloj_origen.sql (ALTER TABLE + default 'wearable' para filas existentes).
- R6 (Fuente desconectada): Si getHealthData() o el insert a Supabase fallan: conservar el summary previo, setear error no bloqueante (severity warning), mantener lastSync previo y reintentar en el próximo tick. No romper la caché local (HealthDataCache) que respalda HistorialScreen.
- R7: Suite de tests jest en __tests__/healthSync.test.ts con los 3 escenarios del DoD: (a) sync sin conflicto → inserta con origen 'wearable'; (b) conflicto wearable vs manual en ventana → gana wearable y el manual queda reemplazado_por set; (c) fuente desconectada (getHealthData rechaza) → no crashea, mantiene estado previo y marca warning.
- R8: No romper contratos de lectura existentes: getDatosReloj() y la firma de DatosReloj se mantienen compatibles (nuevos campos opcionales), HistorialScreen e InicioScreen siguen funcionando sin cambios de contrato. Lint + tsc --noEmit + jest deben pasar en la rama.

## Files in Scope

- `src/services/healthSync.ts (NUEVO — motor central de sincronización)`
- `__tests__/healthSync.test.ts (NUEVO — 3 escenarios DoD)`
- `scripts/migrations/2026-08-08_hu25_datos_reloj_origen.sql (NUEVO — migración documentada)`
- `src/services/supabase/models.ts (DatosReloj/DatosRelojInsert + OrigenDato + origen/reemplazado_por)`
- `src/services/supabase/api.ts (insertDatosReloj/insertDatosRelojBatch con origen, getDatosReloj con filtro origen, upsertDatosClinicosConfig con intervalo_sync_min, syncHealthSummaryToSupabase delegado o deprecado)`
- `src/context/HealthProvider.tsx (intervalo configurable + delegación a healthSync + manejo fuente desconectada)`
- `src/types/health.ts (exponer syncIntervalMin si aplica al contexto)`
- `src/services/HealthDataCache.ts (sin cambios o menores, validar compatibilidad)`

## Constraints

- Reutilizar normalizeVital() y NORMAL_RANGES existentes; NO duplicar lógica de normalización.
- La migración SQL se ejecuta manualmente en Supabase (el repo no mantiene migraciones versionadas): dejar el script documentado y avisar al equipo.
- Los contratos de lectura de getDatosReloj() no cambian: las nuevas columnas son opcionales (nullable) para no romper HistorialScreen/InicioScreen ni el pipeline ML (promedio_semanal_ml).
- Nombrar la rama scrum-79-hu-25-sincronizacion-datos-salud y usar commits feat(HU-25): ... / fix(HU-25): ... (convención del repo).
- No romper CI existente: npm run lint, npx tsc --noEmit, npx jest --passWithNoTests.
- Vocabulario: usar 'sincronización', 'origen de dato', 'datos_reloj', 'registro manual' (CONTEXT.md no define sinónimos prohibidos aún).
- No inventar contexto histórico: el retrieval de cortex_sync_ticket devolvió memorias de otro proyecto (cv-portfolio), no aplicable a esta spec.

## Acceptance Criteria

- [ ] AC-01 (CA-01): La sincronización automática corre por intervalo configurable (datos_clinicos_config.intervalo_sync_min, default 10 min) con límite inferior definido para modo casi-tiempo-real.
- [ ] AC-02 (CA-02): Se detectan conflictos entre fuentes (mismo usuario, mismo signo, ventana temporal ±5 min) con lógica testeada.
- [ ] AC-03 (CA-03): En conflicto wearable vs manual gana el wearable; el registro manual queda auditado como reemplazado (reemplazado_por).
- [ ] AC-04 (Versionado): Todo registro en datos_reloj tiene origen auditable ('wearable'|'manual') y timestamps (recorded_at/created_at), visible en el modelo y en la migración.
- [ ] AC-05 (DoD pruebas): Suite jest cubre sincronización sin conflicto, con conflicto y fuente desconectada; pasa en CI.
- [ ] AC-06 (No regresión): lint + tsc --noEmit + jest pasan; HistorialScreen/InicioScreen siguen leyendo datos_reloj y caché sin cambios de contrato.

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### Lint
```bash
npm run lint
```

Success: exit code 0 · Timeout: 180s
### Type-check
```bash
npx tsc --noEmit
```

Success: exit code 0 · Timeout: 240s
### Unit tests
```bash
npx jest __tests__/healthSync.test.ts --silent
```

Success: 3 tests pass (sin conflicto, con conflicto, fuente desconectada) · Timeout: 180s
