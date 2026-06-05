---
schema_version: 1
doc_type: spec
title: 'HU-32: Visualizar reportes de signos vitales diario, semanal y mensual'
created_at: '2026-06-05T22:05:03.181092Z'
updated_at: '2026-06-05T22:05:03.181092Z'
tags:
- spec
- hu-hu-32
- release-release-2
- epic-epica-3
- dev-cristian
- deep-track
- custom-chart
- mock-data
status: draft
links: []
vault_scope: local
fingerprint: c08ab57505d179d95f15ff2dea11016e9f808d5927f59ec86cfa4038dcb6cf38
verification_hooks: []
goal: Implementar pantalla de detalle de cada signo vital con gráfico de línea interactivo,
  3 vistas temporales seleccionables (Diario/Semanal/Mensual), resumen estadístico
  (promedio, máximo, mínimo, cantidad de registros), y destacado visual de valores
  anormales. Datos mock. Navegación desde los indicadores del dashboard (InicioScreen).
files_in_scope:
- src/screens/DetalleSignoScreen.tsx (nuevo)
- src/components/LineChart.tsx (nuevo, custom SVG chart con zoom/pan)
- src/components/ResumenEstadistico.tsx (nuevo)
- src/data/mockReportes.ts (nuevo, generador de datos mock)
- src/navigation/BottomTabNavigator.tsx (agregar stack navigator)
- src/screens/InicioScreen.tsx (vincular navigation a DetalleSignoScreen)
- src/theme/colors.ts (verificar colores existentes)
- src/theme/spacing.ts (verificar espaciados existentes)
- src/components/VitalSignCard.tsx (hacer touchable para navegación)
- src/components/Card.tsx (reutilizado, ya existe)
constraints:
- No agregar librerías externas de gráficos (victory, chart-kit, etc.). Usar react-native-svg
  + PanResponder nativo.
- Compatibilidad con Android 14+ (API 34+), objetivo real API 33 (Samsung Galaxy S20
  FE).
- Mantener la arquitectura React Native + Native Modules existente.
- Los datos sensibles deben manejarse de forma segura (aunque sean mock).
- El bundle no debe crecer más de 50KB con esta feature (sin deps externas pesadas).
acceptance_criteria:
- 'CA-01: Al tocar un indicador del dashboard se navega a la pantalla de detalle de
  ese signo vital.'
- 'CA-02: La pantalla muestra un gráfico de línea con eje X (tiempo) y eje Y (valores),
  incluyendo línea de referencia del valor normal.'
- 'CA-03: Se ofrecen 3 vistas seleccionables: Diario, Semanal y Mensual. Al cambiar
  la vista el gráfico se actualiza sin recargar la pantalla completa.'
- 'CA-04: Se muestra un resumen textual con valor promedio, máximo, mínimo y cantidad
  de registros del período.'
- 'CA-05: Los valores anormales en el período se destacan visualmente en el gráfico
  (ej: punto rojo).'
- 'CA-06: El usuario puede hacer zoom o desplazarse horizontalmente sobre el gráfico.'
---

## Goal

Implementar pantalla de detalle de cada signo vital con gráfico de línea interactivo, 3 vistas temporales seleccionables (Diario/Semanal/Mensual), resumen estadístico (promedio, máximo, mínimo, cantidad de registros), y destacado visual de valores anormales. Datos mock. Navegación desde los indicadores del dashboard (InicioScreen).

## Requirements

- Al tocar un indicador del dashboard (InicioScreen) se navega a la pantalla de detalle de ese signo vital.
- La pantalla muestra un gráfico de línea SVG con eje X (tiempo) y eje Y (valores), incluyendo línea de referencia del valor normal del usuario.
- Se ofrecen 3 vistas seleccionables: Diario, Semanal y Mensual. Al cambiar la vista el gráfico se actualiza sin recargar la pantalla completa.
- Se muestra un resumen textual con valor promedio, máximo, mínimo y cantidad de registros del período.
- Los valores anormales en el período seleccionado se destacan visualmente en el gráfico (punto rojo en lugar de verde).
- El usuario puede hacer zoom y desplazarse horizontalmente sobre el gráfico mediante gestos táctiles (PanResponder + pinch).
- Los datos son mock generados localmente (sin Health Connect por ahora).
- La UI debe seguir los lineamientos del theme VITO (fondo #EAF8EF, cards blancas, verde oscuro #063B3B, verde principal #2FAF7A, border-radius 18-24px).

## Files in Scope

- `src/screens/DetalleSignoScreen.tsx (nuevo)`
- `src/components/LineChart.tsx (nuevo, custom SVG chart con zoom/pan)`
- `src/components/ResumenEstadistico.tsx (nuevo)`
- `src/data/mockReportes.ts (nuevo, generador de datos mock)`
- `src/navigation/BottomTabNavigator.tsx (agregar stack navigator)`
- `src/screens/InicioScreen.tsx (vincular navigation a DetalleSignoScreen)`
- `src/theme/colors.ts (verificar colores existentes)`
- `src/theme/spacing.ts (verificar espaciados existentes)`
- `src/components/VitalSignCard.tsx (hacer touchable para navegación)`
- `src/components/Card.tsx (reutilizado, ya existe)`

## Constraints

- No agregar librerías externas de gráficos (victory, chart-kit, etc.). Usar react-native-svg + PanResponder nativo.
- Compatibilidad con Android 14+ (API 34+), objetivo real API 33 (Samsung Galaxy S20 FE).
- Mantener la arquitectura React Native + Native Modules existente.
- Los datos sensibles deben manejarse de forma segura (aunque sean mock).
- El bundle no debe crecer más de 50KB con esta feature (sin deps externas pesadas).

## Acceptance Criteria

- [ ] CA-01: Al tocar un indicador del dashboard se navega a la pantalla de detalle de ese signo vital.
- [ ] CA-02: La pantalla muestra un gráfico de línea con eje X (tiempo) y eje Y (valores), incluyendo línea de referencia del valor normal.
- [ ] CA-03: Se ofrecen 3 vistas seleccionables: Diario, Semanal y Mensual. Al cambiar la vista el gráfico se actualiza sin recargar la pantalla completa.
- [ ] CA-04: Se muestra un resumen textual con valor promedio, máximo, mínimo y cantidad de registros del período.
- [ ] CA-05: Los valores anormales en el período se destacan visualmente en el gráfico (ej: punto rojo).
- [ ] CA-06: El usuario puede hacer zoom o desplazarse horizontalmente sobre el gráfico.

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

*(none declared — legacy spec; finish-session will skip verification)*
