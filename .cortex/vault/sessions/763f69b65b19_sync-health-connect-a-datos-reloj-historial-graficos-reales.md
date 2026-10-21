---
schema_version: 1
doc_type: session
title: Sync Health Connect a datos_reloj + Historial + gráficos reales
created_at: '2026-06-10T20:50:29.564966Z'
updated_at: '2026-06-10T20:50:29.564966Z'
tags:
- session
- session
- with-checkpoints
status: completed
links: []
vault_scope: local
fingerprint: 5c232f56b6dc793f2051f674c01535844de4aaa175f46a28f5168636557e6c44
session_id: 763f69b65b19
pr: null
branch: null
commit: null
cortex_telemetry: null
---

## Original Specification

Sincronizar automáticamente los datos de Health Connect a la tabla datos_reloj en Supabase, crear pantalla de Historial con datos reales, y reemplazar datos mock en gráficos por consultas a la base de datos

## Changes Made

(none)

## Files Touched

- `◌ src/context/HealthProvider.tsx`
- `◌ src/screens/DetalleSignoScreen.tsx`
- `◌ src/screens/HistorialScreen.tsx`
- `◌ src/services/supabase/api.ts`
- `◌ src/services/supabase/models.ts`
- `◌ src/services/supabase/schema.sql`

## Key Decisions

- Doc: Avance significativo en HU-25 (sincronización) y HU-95 (históricos). Se creó toda la capa de datos reloj + sync automático + pantalla historial + gráficos reales. Pendiente: probar acumulación de datos durante varios días.

## Next Steps

- [ ] Commit (or revert) declared-only files: src/context/HealthProvider.tsx, src/screens/DetalleSignoScreen.tsx, src/screens/HistorialScreen.tsx, src/services/supabase/api.ts, src/services/supabase/models.ts, src/services/supabase/schema.sql

## Verified State

- Modified 6 file(s) inside spec scope

## Unverified Claims

- acceptance criterion: Health Connect data se persiste automáticamente en datos_reloj cada 10 min
- acceptance criterion: HistorialScreen muestra resumen por período con promedios y listado de últimas lecturas
- acceptance criterion: DetalleSignoScreen muestra datos reales desde Supabase en vistas diaria/semanal/mensual
- acceptance criterion: Refresh rate reducido de 30s a 10 min
- acceptance criterion: CRUD completo disponible en api.ts para datos_reloj
