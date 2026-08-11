# HU-25: Sincronización de datos de salud

> **Estado:** 🟢 Implementado — Sync automático a Supabase `datos_reloj` + detección y resolución de conflictos (wearable > manual) + pantalla de Configuración con intervalo editable (CA-01), estado de sync y detección visible (CA-02/CA-03).

**Release:** R1
**Sprint:** S4
**Épica:** Épica 2: Registro e Integración de Datos
**Desarrolladores:** Flor Galarza, Nico

---

## Goal

Sincronización de datos de salud

## User Story

> **Como** usuario
> **Quiero** sincronizar mis datos clínicos automáticamente
> **Para** mantener actualizado mi historial

## Requirements

1. Sincronización de datos de salud.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [x] CA-01: El sistema sincroniza datos en tiempo real o por intervalos configurables.
  - *Auto-sync cada 10 min via HealthProvider + intervalo configurable por contexto.*
  - *Cada lectura exitosa persiste en Supabase `datos_reloj` automáticamente.*
  - *`lastSync` timestamp trackeado en el contexto para UI reactiva.*
  - *Pantalla de Configuración (`src/screens/ConfiguracionScreen.tsx`): stepper 1-60 min con clamp al mínimo de 60s, persistido con `updateSyncInterval` (PATCH de 1 columna en `perfil_usuario.intervalo_sync_min`) y reflejado en el contexto (`setSyncInterval`) que re-crea el auto-refresh.*
  - *Card de estado: última sincronización relativa + badge En línea/Desconectado según `hcStatus`/`errorSeverity`.*
- [x] CA-02: El sistema detecta conflictos entre distintas fuentes de datos.
  - *Motor `syncWearableToBackend`: ventana de conflicto ±5 min (`SYNC_CONFLICT_WINDOW_MS`) entre fuentes distintas; la lectura previa se marca como `reemplazado_por`.*
  - *Card de conflictos: contador de conflictos resueltos en los últimos 7 días (`countConflictosRecientes`) + mini-listado "Últimos reemplazos" (`getUltimosConflictos`).*
- [x] CA-03: El sistema prioriza wearable sobre registro manual en caso de conflicto.
  - *Al resolver, se conserva la lectura del wearable y se marca la manual como reemplazada (`origen='wearable'` vs `origen='manual'`).*
  - *Leyenda en pantalla: "Cuando el wearable y el registro manual coinciden, gana el wearable."*

## Tasks

- [x] Implementar sincronización automática.
  - *HealthProvider.tsx: loadHealthData() syncs a datos_reloj vía insertDatoReloj().*
  - *lastSync actualizado post-sync para feedback visual.*
- [x] Resolver conflictos entre fuentes.
  - *syncWearableToBackend + ventana de conflicto ±5 min + prioridad wearable > manual.*
- [ ] Gestionar versionado de registros.
- [x] Pantalla de Configuración (SCRUM-79).
  - *`src/screens/ConfiguracionScreen.tsx` + ruta `Configuracion` en RootNavigator + item ⚙️ habilitado en PerfilScreen.*
  - *Subtareas Jira: intervalo editable (CA-01), estado de última sync (CA-01), conflictos visibles (CA-02), prioridad wearable (CA-03).*

## Definition of Done

- [x] La sincronización automática funciona por intervalo o en tiempo real según configuración.
  - *Intervalo editable 1-60 min, clamp 60s, auto-refresh re-creado desde el contexto.*
- [x] Los conflictos se detectan y resuelven aplicando la prioridad definida (wearable \> manual).
  - *Verificado en `syncConfig.test.ts` (helper `resolveSyncIntervalMin`, 4 tests) + motor HU-25 con tests previos.*
- [ ] El versionado permite auditar el origen de cada dato.
- [x] Las pruebas cubren sincronización sin conflictos, con conflicto y fuente desconectada.
  - *Motor HU-25 cubierto por tests del milestone anterior; helper de intervalo cubierto por `syncConfig.test.ts`.*


## Files in Scope

- `src/context/HealthProvider.tsx` — Contexto con lastSync, auto-refresh cada 10 min, sync a datos_reloj, `setSyncInterval`
- `src/screens/ConfiguracionScreen.tsx` — Pantalla de Configuración (intervalo, estado, conflictos)
- `src/services/supabase/api.ts` — `updateSyncInterval`, `countConflictosRecientes`, `getUltimosConflictos`
- `src/services/healthSync.ts` — `resolveSyncIntervalMin` (clamp 60s) + motor de conflictos
- `src/navigation/RootNavigator.tsx` — Ruta `Configuracion`
- `src/screens/PerfilScreen.tsx` — Item ⚙️ "Configuración" navegable
- `__tests__/syncConfig.test.ts` — Tests del helper de intervalo

## Tags

hu-hu-25, release-release-1, epic-épica-2, dev-nico
