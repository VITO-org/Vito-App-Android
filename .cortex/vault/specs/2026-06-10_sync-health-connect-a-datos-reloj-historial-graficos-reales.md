---
schema_version: 1
doc_type: spec
title: Sync Health Connect a datos_reloj + Historial + gráficos reales
created_at: '2026-06-10T20:50:13.496903Z'
updated_at: '2026-06-10T20:50:13.496903Z'
tags:
- spec
- dev-pruebas
- datos_reloj
- sync
- health-connect
- historial
- HU-25
- HU-95
status: draft
links: []
vault_scope: local
fingerprint: 9ea735c4a29650cc4e2304929a2762d32752da4d78e722cb13f09e8fa16d3fe9
verification_hooks: []
goal: Sincronizar automáticamente los datos de Health Connect a la tabla datos_reloj
  en Supabase, crear pantalla de Historial con datos reales, y reemplazar datos mock
  en gráficos por consultas a la base de datos
files_in_scope:
- src/context/HealthProvider.tsx
- src/screens/DetalleSignoScreen.tsx
- src/screens/HistorialScreen.tsx
- src/services/supabase/api.ts
- src/services/supabase/models.ts
- src/services/supabase/schema.sql
constraints:
- El auto-sync no debe bloquear la UI si falla
- Los gráficos deben mostrar mensaje informativo cuando no hay datos
- Los valores decimales deben redondearse correctamente para columnas INTEGER
acceptance_criteria:
- Health Connect data se persiste automáticamente en datos_reloj cada 10 min
- HistorialScreen muestra resumen por período con promedios y listado de últimas lecturas
- DetalleSignoScreen muestra datos reales desde Supabase en vistas diaria/semanal/mensual
- Refresh rate reducido de 30s a 10 min
- CRUD completo disponible en api.ts para datos_reloj
---

## Goal

Sincronizar automáticamente los datos de Health Connect a la tabla datos_reloj en Supabase, crear pantalla de Historial con datos reales, y reemplazar datos mock en gráficos por consultas a la base de datos

## Requirements

- Sincronizar cada lectura de Health Connect a la tabla datos_reloj en Supabase automáticamente
- Crear pantalla Historial con selector de período (7/30/90 días) mostrando promedios y últimas lecturas desde datos_reloj
- Modificar DetalleSignoScreen para consultar datos reales desde datos_reloj en vez de generar mock
- Cambiar refresh rate de Health Connect de 30s a 10 min para ahorrar batería
- Definir tabla datos_reloj en schema.sql con todos los campos y tipos correctos
- Crear tipos TypeScript DatoReloj y DatoRelojInsert en models.ts
- Crear funciones CRUD (insert, batch, get, delete) en api.ts para datos_reloj
- Redondear valores decimales a integer para columnas INTEGER y evitar errores de sintaxis

## Files in Scope

- `src/context/HealthProvider.tsx`
- `src/screens/DetalleSignoScreen.tsx`
- `src/screens/HistorialScreen.tsx`
- `src/services/supabase/api.ts`
- `src/services/supabase/models.ts`
- `src/services/supabase/schema.sql`

## Constraints

- El auto-sync no debe bloquear la UI si falla
- Los gráficos deben mostrar mensaje informativo cuando no hay datos
- Los valores decimales deben redondearse correctamente para columnas INTEGER

## Acceptance Criteria

- [ ] Health Connect data se persiste automáticamente en datos_reloj cada 10 min
- [ ] HistorialScreen muestra resumen por período con promedios y listado de últimas lecturas
- [ ] DetalleSignoScreen muestra datos reales desde Supabase en vistas diaria/semanal/mensual
- [ ] Refresh rate reducido de 30s a 10 min
- [ ] CRUD completo disponible en api.ts para datos_reloj

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

*(none declared — legacy spec; finish-session will skip verification)*
