---
schema_version: 1
doc_type: spec
title: 'HU-25 — Configuración: selector desplegable de intervalo y agrupación de cards
  de sincronización (SCRUM-79)'
created_at: '2026-08-11T17:04:04.000354Z'
updated_at: '2026-08-11T17:04:04.000354Z'
tags:
- spec
- hu-25
- scrum-79
- configuracion
- ui
- dropdown
- ux
status: draft
links: []
vault_scope: local
fingerprint: 2d5a1cdcf4de949699da285b81d9d2234cb92d1b9abfdc725ce65de6ae1d2060
verification_hooks:
- name: Lint scoped
  command: npx eslint src/screens/ConfiguracionScreen.tsx --max-warnings=0
  required: true
  success_criteria: exit code 0
  timeout_seconds: 180
- name: Type-check scoped (no nuevos errores)
  command: bash -c "! npx tsc --noEmit 2>&1 | grep -E 'src/(screens/ConfiguracionScreen)\.'
    -q"
  required: true
  success_criteria: exit 0 = cero errores en archivos del scope
  timeout_seconds: 240
- name: Unit tests syncConfig (sin regresión)
  command: npx jest __tests__/syncConfig.test.ts --silent
  required: true
  success_criteria: 4 tests pass (sin regresión en el helper)
  timeout_seconds: 180
goal: 'Refinar la pantalla de Configuración HU-25 (ConfiguracionScreen.tsx, implementada
  y cerrada en la sesión 2026-08-11) en dos frentes de UX sobre CA-01: (1) reemplazar
  el stepper de intervalo (botones − / +) por un selector desplegable de minutos;
  (2) agrupar en un mismo recuadro (o señalar visualmente su relación) la card ''Sincronización
  de datos'' (intervalo) y la card ''Estado de la sincronización'', ya que el intervalo
  define la periodicidad del estado de última sincronización. Todo el comportamiento
  de fondo se mantiene: persistencia con updateSyncInterval (PATCH raw REST de 1 columna,
  sin pisar el perfil), clamp mínimo 60s (resolveSyncIntervalMin), setSyncInterval
  en el contexto (re-crea auto-refresh), card de conflictos (CA-02/CA-03) y navegación.'
files_in_scope:
- src/screens/ConfiguracionScreen.tsx
constraints:
- 'Archivo único en scope: src/screens/ConfiguracionScreen.tsx (el resto del contrato
  ya existe y no se toca).'
- NO agregar dependencias nuevas al package.json (ni nativas ni JS) — Modal de React
  Native basta.
- Reutilizar el theme (colors/spacing/fontSize) y componentes existentes (Card, StatusIndicator,
  AppIcon si aplica).
- La opción elegida se persiste y refleja en contexto igual que hoy (updateSyncInterval
  + setSyncInterval); el stepper − / + desaparece del código (sin muertos).
- Los hooks de verificación de la spec anterior (eslint scoped, tsc scoped, jest syncConfig)
  se mantienen como hooks de esta spec.
acceptance_criteria:
- 'AC-01: No existen más botones stepperBtn − / + en ConfiguracionScreen; hay un botón
  desplegable ''Sincronizar cada X min'' que abre un selector modal con las opciones
  de minutos.'
- 'AC-02: Elegir una opción cierra el modal, persiste vía updateSyncInterval (PATCH
  1 columna — verificado sin cambios en api.ts) y actualiza el contexto con setSyncInterval
  (re-crea auto-refresh).'
- 'AC-03: El intervalo y el estado de sincronización comparten un único recuadro con
  header común y la relación señalada en el subtítulo; badges y texto de estado intactos.'
- 'AC-04: La card de conflictos (CA-02/CA-03), el useFocusEffect y la navegación desde
  PerfilScreen quedan sin cambios funcionales.'
- 'AC-05: Hooks de la spec pasan: npx eslint src/screens/ConfiguracionScreen.tsx --max-warnings=0
  (0 problemas); tsc --noEmit sin errores NUEVOS en el scope; npx jest __tests__/syncConfig.test.ts
  4/4 PASS.'
---

## Goal

Refinar la pantalla de Configuración HU-25 (ConfiguracionScreen.tsx, implementada y cerrada en la sesión 2026-08-11) en dos frentes de UX sobre CA-01: (1) reemplazar el stepper de intervalo (botones − / +) por un selector desplegable de minutos; (2) agrupar en un mismo recuadro (o señalar visualmente su relación) la card 'Sincronización de datos' (intervalo) y la card 'Estado de la sincronización', ya que el intervalo define la periodicidad del estado de última sincronización. Todo el comportamiento de fondo se mantiene: persistencia con updateSyncInterval (PATCH raw REST de 1 columna, sin pisar el perfil), clamp mínimo 60s (resolveSyncIntervalMin), setSyncInterval en el contexto (re-crea auto-refresh), card de conflictos (CA-02/CA-03) y navegación.

## Requirements

- R1 (selector desplegable CA-01): Reemplazar los botones stepperBtn − / + (y el cuadro de valor) por un botón 'Sincronizar cada X min' con indicador de desplegable que abre un selector de minutos. Implementar con Modal nativo de React Native (patrón ya usado en RegistrarSintomaScreen), SIN agregar dependencias nuevas (@react-native-picker/picker queda descartado — requeriría setup de build para un cambio de 1 archivo).
- R2 (opciones del selector): Lista discreta de minutos [1, 2, 3, 5, 10, 15, 30, 45, 60] con el valor actual resaltado; si el valor persistido en el perfil no está en la lista (p.ej. 7 por datos viejos), igual se muestra el valor real y se agrega como opción marcada al selector. El clamp mínimo de 60s (resolveSyncIntervalMin) sigue gobernando la resolución.
- R3 (persistencia sin cambios de contrato): Seleccionar una opción persiste igual que hoy con updateSyncInterval(userId, minutos, access_token) (PATCH de 1 columna perfil_usuario.intervalo_sync_min) + setSyncInterval en el contexto para re-crear el auto-refresh. NO tocar api.ts, healthSync.ts ni HealthProvider.tsx — el contrato de persistencia ya existe y pasó los hooks.
- R4 (agrupación visual CA-01): Fusionar las cards 'Sincronización de datos' (intervalo) y 'Estado de la sincronización' en UNA sola card con header común 'Sincronización' y subtítulo que explique la relación ('El intervalo define cada cuánto se sincronizan tus datos y se actualiza el estado'). Dentro de la card, dos sub-secciones (Intervalo de sincronización / Estado de la sincronización) separadas por divider; mantener los badges (En línea/Desconectado), 'Última sincronización: hace X min' y 'Sincronización automática: Activa' tal cual están.
- R5 (intacto): La card 'Conflictos entre fuentes' (CA-02/CA-03) con contador 7 días + leyenda + mini-listado, el useFocusEffect de refresh y la navegación desde PerfilScreen NO se modifican.
- R6 (calidad): No agregar errores tsc nuevos ni warnings eslint en src/screens/ConfiguracionScreen.tsx (hooks scoped corren al cierre). Los tests existentes __tests__/syncConfig.test.ts (helper puro) siguen pasando — el helper no cambia.

## Files in Scope

- `src/screens/ConfiguracionScreen.tsx`

## Constraints

- Archivo único en scope: src/screens/ConfiguracionScreen.tsx (el resto del contrato ya existe y no se toca).
- NO agregar dependencias nuevas al package.json (ni nativas ni JS) — Modal de React Native basta.
- Reutilizar el theme (colors/spacing/fontSize) y componentes existentes (Card, StatusIndicator, AppIcon si aplica).
- La opción elegida se persiste y refleja en contexto igual que hoy (updateSyncInterval + setSyncInterval); el stepper − / + desaparece del código (sin muertos).
- Los hooks de verificación de la spec anterior (eslint scoped, tsc scoped, jest syncConfig) se mantienen como hooks de esta spec.

## Acceptance Criteria

- [ ] AC-01: No existen más botones stepperBtn − / + en ConfiguracionScreen; hay un botón desplegable 'Sincronizar cada X min' que abre un selector modal con las opciones de minutos.
- [ ] AC-02: Elegir una opción cierra el modal, persiste vía updateSyncInterval (PATCH 1 columna — verificado sin cambios en api.ts) y actualiza el contexto con setSyncInterval (re-crea auto-refresh).
- [ ] AC-03: El intervalo y el estado de sincronización comparten un único recuadro con header común y la relación señalada en el subtítulo; badges y texto de estado intactos.
- [ ] AC-04: La card de conflictos (CA-02/CA-03), el useFocusEffect y la navegación desde PerfilScreen quedan sin cambios funcionales.
- [ ] AC-05: Hooks de la spec pasan: npx eslint src/screens/ConfiguracionScreen.tsx --max-warnings=0 (0 problemas); tsc --noEmit sin errores NUEVOS en el scope; npx jest __tests__/syncConfig.test.ts 4/4 PASS.

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### Lint scoped
```bash
npx eslint src/screens/ConfiguracionScreen.tsx --max-warnings=0
```

Success: exit code 0 · Timeout: 180s
### Type-check scoped (no nuevos errores)
```bash
bash -c "! npx tsc --noEmit 2>&1 | grep -E 'src/(screens/ConfiguracionScreen)\.' -q"
```

Success: exit 0 = cero errores en archivos del scope · Timeout: 240s
### Unit tests syncConfig (sin regresión)
```bash
npx jest __tests__/syncConfig.test.ts --silent
```

Success: 4 tests pass (sin regresión en el helper) · Timeout: 180s
