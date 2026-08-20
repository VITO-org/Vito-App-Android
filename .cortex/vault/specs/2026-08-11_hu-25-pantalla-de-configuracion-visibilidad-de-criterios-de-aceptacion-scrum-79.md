---
schema_version: 1
doc_type: spec
title: 'HU-25 — Pantalla de Configuración: visibilidad de criterios de aceptación
  (SCRUM-79)'
created_at: '2026-08-11T14:26:09.760377Z'
updated_at: '2026-08-11T14:26:09.760377Z'
tags:
- spec
- spec
- hu-25
- scrum-79
- configuracion
- sincronizacion
- ui
- jira-subtareas
status: draft
links: []
vault_scope: local
fingerprint: 7fff75965598eeba7d8222030c6feb8deceae55f35616e605eae5015c6b0c042
verification_hooks:
- name: Lint scoped
  command: npx eslint src/screens/ConfiguracionScreen.tsx src/screens/PerfilScreen.tsx
    src/services/supabase/api.ts src/context/HealthProvider.tsx src/services/healthSync.ts
    --max-warnings=0
  required: true
  success_criteria: exit code 0
  timeout_seconds: 180
- name: Type-check scoped (no nuevos errores)
  command: bash -c "! npx tsc --noEmit 2>&1 | grep -E 'src/(screens/ConfiguracionScreen|screens/PerfilScreen|services/supabase/(api|models)|context/HealthProvider|services/healthSync)\.'
    -q"
  required: true
  success_criteria: exit 0 = cero errores en archivos del scope
  timeout_seconds: 240
- name: Unit tests syncConfig
  command: npx jest __tests__/syncConfig.test.ts --silent
  required: true
  success_criteria: 3 tests pass (default, clamp mínimo, valor de perfil)
  timeout_seconds: 180
goal: 'Materializar visualmente los criterios de aceptación originales de la HU-25
  (CA-01, CA-02, CA-03) en una nueva pantalla de Configuración navegable desde el
  item ⚙️ de PerfilScreen: intervalo de sincronización editable con persistencia real,
  estado de última sincronización con badge en línea/desconectado, contador de conflictos
  resueltos (7 días) y evidencia de prioridad wearable > manual. Todo es UI + queries
  de lectura sobre el motor HU-25 ya implementado (healthSync.ts, HealthProvider,
  migración datos_reloj), e incorpora la mitigación de los 4 riesgos detectados: deuda
  tsc/lint preexistente, sobre-escritura del perfil al persistir el intervalo, query
  de conflictos inexistente y nota de HU desactualizada.'
files_in_scope:
- src/screens/ConfiguracionScreen.tsx (NUEVO)
- src/navigation/RootNavigator.tsx
- src/screens/PerfilScreen.tsx
- src/services/supabase/api.ts (updateSyncInterval + countConflictosRecientes)
- src/services/supabase/models.ts (si requiere tipo de retorno para conflictos, menor)
- src/context/HealthProvider.tsx (reaccionar a cambio de intervalo, menor)
- src/services/healthSync.ts (helper resolveSyncIntervalMin, menor)
- .eslintrc.json (NUEVO — configuración mínima)
- __tests__/syncConfig.test.ts (NUEVO)
- .cortex/vault/hu/hu-25_sincronización-de-datos-de-salud.md (docs)
constraints:
- Reutilizar componentes del theme existentes (Card, PrimaryButton, StatusIndicator,
  AppIcon, colors/spacing/fontSize); NO crear estilos duplicados.
- Reutilizar MIN_SYNC_INTERVAL_MS, DEFAULT_SYNC_INTERVAL_MIN y normalizeVital existentes;
  NO duplicar lógica.
- updateSyncInterval DEBE usar PATCH raw REST de una sola columna (no upsertProfile
  completo) para no pisar campos existentes del perfil (peso/altura/patologia/etc).
- No agregar errores tsc nuevos en los archivos del scope. El baseline legacy (sin
  config ESLint, ~20 errores tsc) se documenta en la spec y NO se repara en esta tarea.
- 'No romper contratos de lectura existentes: getDatosReloj(), HistorialScreen e InicioScreen
  siguen funcionando sin cambios de contrato.'
- 'Nombrar la rama scrum-79-hu-25-pantalla-configuracion y usar commits feat(HU-25):
  ... / fix(HU-25): ... (convención del repo).'
- 'Vocabulario: ''sincronización'', ''origen de dato'', ''datos_reloj'', ''registro
  manual'', ''reemplazado'' (CONTEXT.md no define sinónimos prohibidos aún).'
- 'Las 5 subtareas Jira (HU-25: Configuración — crear pantalla y navegación; intervalo
  editable CA-01; estado última sync CA-01; detección conflictos CA-02; prioridad
  wearable>manual CA-03) son el desglose de trabajo: cada commit debe referenciar
  su subtarea en el mensaje.'
- 'No inventar contexto histórico: la memoria recuperada en cortex_sync_ticket corresponde
  a la propia spec/design HU-25 (aplicable) y a sesiones de otros proyectos (no aplicables).'
acceptance_criteria:
- 'AC-01 (CA-01 intervalo): La pantalla de Configuración permite editar el intervalo
  (1-60 min, clamp mínimo 60s) y el valor persiste en perfil_usuario.intervalo_sync_min
  SIN pisar otros campos del perfil (verificado: updateSyncInterval usa PATCH de una
  columna).'
- 'AC-02 (CA-01 estado): Se muestra ''Última sincronización: hace X min'' (fallback
  ''nunca'') + badge ''En línea''/''Desconectado'' derivados de lastSync, hcStatus
  y errorSeverity del contexto.'
- 'AC-03 (CA-02): El contador ''Conflictos resueltos en los últimos 7 días: N'' refleja
  datos reales de datos_reloj (reemplazado_por NOT NULL) vía countConflictosRecientes.'
- 'AC-04 (CA-03): Leyenda de prioridad wearable > manual visible + mini-listado ''Últimos
  reemplazos'' (o estado vacío ''Sin conflictos recientes''). Sección de solo lectura.'
- 'AC-05 (Navegación): Desde PerfilScreen, tocar ''Configuración'' (⚙️) navega a ConfiguracionScreen;
  la pantalla respeta el theme.'
- 'AC-06 (Riesgo lint): npx eslint sobre los archivos del scope pasa con 0 errores
  (config .eslintrc.json creada en R6).'
- 'AC-07 (Riesgo tsc): tsc --noEmit no reporta errores NUEVOS en archivos del scope;
  el baseline legacy queda documentado.'
- 'AC-08 (Tests): npx jest __tests__/syncConfig.test.ts pasa (helper resolveSyncIntervalMin:
  default, clamp mínimo, valor de perfil).'
- 'AC-09 (Docs): La nota de HU-25 queda actualizada con CA-02/CA-03 tildados y la
  pantalla de Configuración mencionada.'
---

## Goal

Materializar visualmente los criterios de aceptación originales de la HU-25 (CA-01, CA-02, CA-03) en una nueva pantalla de Configuración navegable desde el item ⚙️ de PerfilScreen: intervalo de sincronización editable con persistencia real, estado de última sincronización con badge en línea/desconectado, contador de conflictos resueltos (7 días) y evidencia de prioridad wearable > manual. Todo es UI + queries de lectura sobre el motor HU-25 ya implementado (healthSync.ts, HealthProvider, migración datos_reloj), e incorpora la mitigación de los 4 riesgos detectados: deuda tsc/lint preexistente, sobre-escritura del perfil al persistir el intervalo, query de conflictos inexistente y nota de HU desactualizada.

## Requirements

- R1 (Subtarea 1 — infraestructura): Crear src/screens/ConfiguracionScreen.tsx como pantalla base (ScrollView, theme existente colors/spacing/fontSize, componentes Card/PrimaryButton/StatusIndicator). Registrar la ruta 'Configuracion' en RootNavigator.tsx (RootStackParamList + Stack.Screen). Habilitar el item ⚙️ (label 'Configuración') en PerfilScreen.tsx con navigation.navigate('Configuracion').
- R2 (Subtarea 2 — CA-01 intervalo): Stepper/slider 'Sincronizar cada X minutos' rango 1-60 con clamp mínimo 60s reutilizando MIN_SYNC_INTERVAL_MS y DEFAULT_SYNC_INTERVAL_MIN de healthSync.ts (NO duplicar constantes). Persistir con NUEVA función updateSyncInterval(userId, intervalo_sync_min) en api.ts que use PATCH raw REST de una sola columna (id_usuario=eq.X, body {intervalo_sync_min}) — MITIGA riesgo 2: evita upsertProfile completo que podría pisar otros campos del perfil. HealthProvider debe reaccionar al cambio (recrear el intervalo de auto-refresh).
- R3 (Subtarea 3 — CA-01 estado): Badge 'Sincronización automática: Activa' (persistencia automática en datos_reloj). 'Última sincronización: hace X min' derivado de lastSync del contexto (formato relativo, fallback 'nunca'). Badge 'En línea'/'Desconectado' según hcStatus + errorSeverity (rojo/ámbar si error). Si la escritura a Supabase falla (R6 del motor), mostrar warning sin romper la UI.
- R4 (Subtarea 4 — CA-02 detección): Estado 'Detección de conflictos: Activa' + contador 'Conflictos resueltos en los últimos 7 días: N'. Query NUEVA countConflictosRecientes(userId, days=7) en api.ts sobre datos_reloj filtrando reemplazado_por NOT NULL y recorded_at >= now-7d (reusar rawRestFetch existente; MITIGA riesgo 3). La sección se refresca al volver a la pantalla (useFocusEffect o refetch on mount).
- R5 (Subtarea 5 — CA-03 prioridad): Leyenda 'Cuando el wearable y el registro manual coinciden, gana el wearable. El registro manual queda guardado como reemplazado.' + mini-listado 'Últimos reemplazos' (fecha + signo) con los últimos N registros reemplazado_por NOT NULL uniendo el registro ganador para mostrar signo/valor. Estado vacío 'Sin conflictos recientes'. Solo lectura: ninguna acción modifica datos.
- R6 (Riesgo 1a — lint): Crear .eslintrc.json mínimo extendiendo @react-native/eslint-config (ya presente como devDependency 0.85.3) para que npx eslint sobre los archivos del scope corra con éxito. NO se pide arreglar los ~20 errores legacy de tsc ni los archivos ajenos al scope.
- R7 (Riesgo 1b — tsc): La rama NO debe agregar errores tsc nuevos en los archivos del scope. El baseline de ~20 errores legacy (PermissionButton, BottomTabNavigator, AlertasScreen, DetalleSignoScreen, HistorialScreen DatoReloj, InicioScreen style filter, tsconfig expo) queda DOCUMENTADO en la spec como preexistente y fuera de alcance — no se repara en esta tarea.
- R8 (Riesgo 4 — docs): Actualizar .cortex/vault/hu/hu-25_sincronización-de-datos-de-salud.md tildando CA-02 y CA-03 (el código ya los cumple desde el commit 84c1762) y reflejando la nueva pantalla de Configuración. cortex-documenter finaliza la reconciliación en el cierre de sesión.
- R9 (Tests): Extraer helper puro resolveSyncIntervalMin(perfilIntervalo, default=DEFAULT_SYNC_INTERVAL_MIN) con clamp >= MIN_SYNC_INTERVAL_MS en healthSync.ts (o archivo util nuevo) y testearlo en __tests__/syncConfig.test.ts (default, clamp mínimo, valor de perfil válido). Los tests no requieren supabase ni react-native (lógica pura).

## Files in Scope

- `src/screens/ConfiguracionScreen.tsx (NUEVO)`
- `src/navigation/RootNavigator.tsx`
- `src/screens/PerfilScreen.tsx`
- `src/services/supabase/api.ts (updateSyncInterval + countConflictosRecientes)`
- `src/services/supabase/models.ts (si requiere tipo de retorno para conflictos, menor)`
- `src/context/HealthProvider.tsx (reaccionar a cambio de intervalo, menor)`
- `src/services/healthSync.ts (helper resolveSyncIntervalMin, menor)`
- `.eslintrc.json (NUEVO — configuración mínima)`
- `__tests__/syncConfig.test.ts (NUEVO)`
- `.cortex/vault/hu/hu-25_sincronización-de-datos-de-salud.md (docs)`

## Constraints

- Reutilizar componentes del theme existentes (Card, PrimaryButton, StatusIndicator, AppIcon, colors/spacing/fontSize); NO crear estilos duplicados.
- Reutilizar MIN_SYNC_INTERVAL_MS, DEFAULT_SYNC_INTERVAL_MIN y normalizeVital existentes; NO duplicar lógica.
- updateSyncInterval DEBE usar PATCH raw REST de una sola columna (no upsertProfile completo) para no pisar campos existentes del perfil (peso/altura/patologia/etc).
- No agregar errores tsc nuevos en los archivos del scope. El baseline legacy (sin config ESLint, ~20 errores tsc) se documenta en la spec y NO se repara en esta tarea.
- No romper contratos de lectura existentes: getDatosReloj(), HistorialScreen e InicioScreen siguen funcionando sin cambios de contrato.
- Nombrar la rama scrum-79-hu-25-pantalla-configuracion y usar commits feat(HU-25): ... / fix(HU-25): ... (convención del repo).
- Vocabulario: 'sincronización', 'origen de dato', 'datos_reloj', 'registro manual', 'reemplazado' (CONTEXT.md no define sinónimos prohibidos aún).
- Las 5 subtareas Jira (HU-25: Configuración — crear pantalla y navegación; intervalo editable CA-01; estado última sync CA-01; detección conflictos CA-02; prioridad wearable>manual CA-03) son el desglose de trabajo: cada commit debe referenciar su subtarea en el mensaje.
- No inventar contexto histórico: la memoria recuperada en cortex_sync_ticket corresponde a la propia spec/design HU-25 (aplicable) y a sesiones de otros proyectos (no aplicables).

## Acceptance Criteria

- [ ] AC-01 (CA-01 intervalo): La pantalla de Configuración permite editar el intervalo (1-60 min, clamp mínimo 60s) y el valor persiste en perfil_usuario.intervalo_sync_min SIN pisar otros campos del perfil (verificado: updateSyncInterval usa PATCH de una columna).
- [ ] AC-02 (CA-01 estado): Se muestra 'Última sincronización: hace X min' (fallback 'nunca') + badge 'En línea'/'Desconectado' derivados de lastSync, hcStatus y errorSeverity del contexto.
- [ ] AC-03 (CA-02): El contador 'Conflictos resueltos en los últimos 7 días: N' refleja datos reales de datos_reloj (reemplazado_por NOT NULL) vía countConflictosRecientes.
- [ ] AC-04 (CA-03): Leyenda de prioridad wearable > manual visible + mini-listado 'Últimos reemplazos' (o estado vacío 'Sin conflictos recientes'). Sección de solo lectura.
- [ ] AC-05 (Navegación): Desde PerfilScreen, tocar 'Configuración' (⚙️) navega a ConfiguracionScreen; la pantalla respeta el theme.
- [ ] AC-06 (Riesgo lint): npx eslint sobre los archivos del scope pasa con 0 errores (config .eslintrc.json creada en R6).
- [ ] AC-07 (Riesgo tsc): tsc --noEmit no reporta errores NUEVOS en archivos del scope; el baseline legacy queda documentado.
- [ ] AC-08 (Tests): npx jest __tests__/syncConfig.test.ts pasa (helper resolveSyncIntervalMin: default, clamp mínimo, valor de perfil).
- [ ] AC-09 (Docs): La nota de HU-25 queda actualizada con CA-02/CA-03 tildados y la pantalla de Configuración mencionada.

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### Lint scoped
```bash
npx eslint src/screens/ConfiguracionScreen.tsx src/screens/PerfilScreen.tsx src/services/supabase/api.ts src/context/HealthProvider.tsx src/services/healthSync.ts --max-warnings=0
```

Success: exit code 0 · Timeout: 180s
### Type-check scoped (no nuevos errores)
```bash
bash -c "! npx tsc --noEmit 2>&1 | grep -E 'src/(screens/ConfiguracionScreen|screens/PerfilScreen|services/supabase/(api|models)|context/HealthProvider|services/healthSync)\.' -q"
```

Success: exit 0 = cero errores en archivos del scope · Timeout: 240s
### Unit tests syncConfig
```bash
npx jest __tests__/syncConfig.test.ts --silent
```

Success: 3 tests pass (default, clamp mínimo, valor de perfil) · Timeout: 180s
