---
schema_version: 1
doc_type: spec
title: Gráficos interactivos DetalleSigno con gifted-charts
created_at: '2026-07-23T21:48:48.095005Z'
updated_at: '2026-07-23T21:48:48.095005Z'
tags:
- spec
- HU-32
- charts
- graficos
- gifted-charts
- detalle-signo
status: draft
links: []
vault_scope: local
fingerprint: ee62c710a2ff209439357eb149185eaf23cc18eb9a2a0a79ab82cf57994dbf17
verification_hooks:
- name: build-release
  command: cd android && ./gradlew assembleRelease
  required: true
  success_criteria: exit code 0
  timeout_seconds: 300
goal: Reemplazar el gráfico SVG custom de DetalleSignoScreen por react-native-gifted-charts
  para obtener curvas bezier, gradientes, tooltips, animaciones e interactividad.
  Agregar baseline del paciente y fallback a cache local.
files_in_scope:
- src/screens/DetalleSignoScreen.tsx
- src/components/LineChart.tsx
- src/screens/InicioScreen.tsx
- package.json
constraints:
- No romper navegación existente desde InicioScreen, TodosLosSignosScreen, HistorialScreen
- Mantener los mismos parámetros de navegación (tipoSigno, label, unit, icon)
- No instalar librerías de charts adicionales
- Build release debe compilar sin errores
acceptance_criteria:
- 'CA-01: Al tocar un indicador del dashboard se navega a DetalleSigno con el signo
  correcto'
- 'CA-02: El gráfico muestra curvas bezier con gradiente, tooltip al tocar puntos,
  y línea de referencia del valor normal'
- 'CA-03: Las 3 vistas (Diario/Semanal/Mensual) funcionan y el gráfico se actualiza
  sin recargar la pantalla'
- 'CA-04: Si Supabase no tiene datos, se muestra data del cache local'
- 'CA-05: El baseline del paciente se usa para rangos normales en vez de valores hardcodeados'
---

## Goal

Reemplazar el gráfico SVG custom de DetalleSignoScreen por react-native-gifted-charts para obtener curvas bezier, gradientes, tooltips, animaciones e interactividad. Agregar baseline del paciente y fallback a cache local.

## Requirements

- Instalar react-native-gifted-charts y dependencias (react-native-linear-gradient, react-native-svg)
- Reemplazar componente LineChart custom por LineChart de gifted-charts con curvas bezier y gradiente
- Agregar tooltips al tocar puntos del gráfico mostrando valor + fecha/hora
- Agregar animación de entrada al gráfico
- Mantener filtro Diario/Semanal/Mensual existente
- Reemplazar NORMAL_RANGES hardcodeados por baseline_clinico del paciente via getBaseline()
- Agregar fallback a HealthDataCache cuando Supabase no tiene datos
- Mostrar icono del signo vital en el header de la pantalla
- Línea de referencia punteada del valor normal en el gráfico
- Resumen estadístico existente se mantiene igual

## Files in Scope

- `src/screens/DetalleSignoScreen.tsx`
- `src/components/LineChart.tsx`
- `src/screens/InicioScreen.tsx`
- `package.json`

## Constraints

- No romper navegación existente desde InicioScreen, TodosLosSignosScreen, HistorialScreen
- Mantener los mismos parámetros de navegación (tipoSigno, label, unit, icon)
- No instalar librerías de charts adicionales
- Build release debe compilar sin errores

## Acceptance Criteria

- [ ] CA-01: Al tocar un indicador del dashboard se navega a DetalleSigno con el signo correcto
- [ ] CA-02: El gráfico muestra curvas bezier con gradiente, tooltip al tocar puntos, y línea de referencia del valor normal
- [ ] CA-03: Las 3 vistas (Diario/Semanal/Mensual) funcionan y el gráfico se actualiza sin recargar la pantalla
- [ ] CA-04: Si Supabase no tiene datos, se muestra data del cache local
- [ ] CA-05: El baseline del paciente se usa para rangos normales en vez de valores hardcodeados

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### build-release
```bash
cd android && ./gradlew assembleRelease
```

Success: exit code 0 · Timeout: 300s
