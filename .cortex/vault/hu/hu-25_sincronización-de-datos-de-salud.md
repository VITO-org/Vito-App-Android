# HU-25: Sincronización de datos de salud

> **Estado:** 🟡 En desarrollo — Sync automático a Supabase `datos_reloj` implementado con lastSync tracking. Pendiente resolución de conflictos entre fuentes.

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
- [ ] CA-02: El sistema detecta conflictos entre distintas fuentes de datos.
- [ ] CA-03: El sistema prioriza wearable sobre registro manual en caso de conflicto.

## Tasks

- [x] Implementar sincronización automática.
  - *HealthProvider.tsx: loadHealthData() syncs a datos_reloj vía insertDatoReloj().*
  - *lastSync actualizado post-sync para feedback visual.*
- [ ] Resolver conflictos entre fuentes.
- [ ] Gestionar versionado de registros.

## Definition of Done

- [ ] La sincronización automática funciona por intervalo o en tiempo real según configuración.
- [ ] Los conflictos se detectan y resuelven aplicando la prioridad definida (wearable \> manual).
- [ ] El versionado permite auditar el origen de cada dato.
- [ ] Las pruebas cubren sincronización sin conflictos, con conflicto y fuente desconectada.


## Files in Scope

- `src/context/HealthProvider.tsx` — Contexto con lastSync, auto-refresh cada 10 min, sync a datos_reloj

## Tags

hu-hu-25, release-release-1, epic-épica-2, dev-nico
