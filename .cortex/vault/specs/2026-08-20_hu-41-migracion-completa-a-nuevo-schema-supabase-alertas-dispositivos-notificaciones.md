---
schema_version: 1
doc_type: spec
title: 'HU-41: Migración completa a nuevo schema Supabase — alertas + dispositivos
  + notificaciones'
created_at: '2026-08-20T21:29:07.538131Z'
updated_at: '2026-08-20T21:29:07.538131Z'
tags:
- spec
- hu-41
- supabase
- alertas
- migracion
- schema
- dispositivos
- notificaciones
status: draft
links: []
vault_scope: local
fingerprint: 1b5f7e83cf2eca4fcf8566a022cf5da494f6542cf8ab89f219f1e3c7b3bc696a
verification_hooks:
- name: TypeScript compilation
  command: npx tsc --noEmit
  required: true
  success_criteria: exit code 0, no type errors
  timeout_seconds: 120
- name: Alert tests
  command: npx jest __tests__/alerts.test.ts --verbose
  required: true
  success_criteria: all tests pass
  timeout_seconds: 120
goal: Adaptar todo el código de la HU-41 (modelos, API, motor de detección, escalación,
  UI, tests) y agregar las tablas nuevas (dispositivo_usuario, preferencia_notificacion,
  notificacion_entrega) para alinearse con la nueva estructura SQL de Supabase proporcionada
  por el usuario.
files_in_scope:
- src/services/supabase/models.ts
- src/services/supabase/api.ts
- src/services/supabase/schema.sql
- src/services/alerts/types.ts
- src/services/alerts/detector.ts
- src/services/alerts/engine.ts
- src/services/alerts/escalation.ts
- src/services/alerts/index.ts
- src/screens/AlertasScreen.tsx
- src/context/HealthProvider.tsx
- scripts/migrations/2026-08-18_hu41_tabla_alertas.sql
- __tests__/alerts.test.ts
constraints:
- El DDL de las 4 tablas es inmutable — fue proporcionado por el usuario y no debe
  modificarse.
- La lógica de detección pura (evaluateSpo2, classifySeverity, isEpisodeResolved)
  NO debe cambiar — solo los datos que produce al construir el registro.
- Los enums de PostgreSQL se eliminan — todo es varchar en la BD.
- El motor de escalación por timeout de 5 min se mantiene como lógica interna del
  engine, pero ya no persiste escalated_at en la tabla (puede guardar en datos jsonb
  o simplemente notificar al listener).
- Los tipos TS deben seguir siendo compatibles con el resto de la app (HealthProvider,
  BottomTabNavigator, etc.).
acceptance_criteria:
- La migración SQL crea las 4 tablas sin errores y sin conflictos con tablas existentes.
- Todos los archivos TypeScript compilan sin errores tras los cambios.
- Los tests en __tests__/alerts.test.ts pasan al 100%.
- La AlertasScreen muestra correctamente las alertas con el nuevo modelo (leída/no
  leída en vez de estado).
- El HealthProvider inicializa el AlertEngine correctamente con los nuevos mapeos
  de API.
- Las funciones API insertAlerta/getAlertas/marcarLeida funcionan contra el nuevo
  schema.
- Las tablas dispositivo_usuario, preferencia_notificacion, notificacion_entrega están
  listas para ser usadas (creadas pero sin lógica de UI aún).
- No hay regressions en el resto de la app (login, perfil, historial, etc.).
---

## Goal

Adaptar todo el código de la HU-41 (modelos, API, motor de detección, escalación, UI, tests) y agregar las tablas nuevas (dispositivo_usuario, preferencia_notificacion, notificacion_entrega) para alinearse con la nueva estructura SQL de Supabase proporcionada por el usuario.

## Requirements

- Reemplazar la migración SQL existente por una nueva que cree las 4 tablas: alerta, dispositivo_usuario, preferencia_notificacion, notificacion_entrega, siguiendo exactamente el DDL proporcionado por el usuario.
- Actualizar models.ts: renombrar tabla de 'alertas' a 'alerta', eliminar enum EstadoAlerta y campos (estado, valor_registrado, umbral_configurado, generated_at, dispositivo_origen, confirmed_at, escalated_at, escalated_to, resolved_at), agregar campos nuevos (id_dato_reloj, id_prediccion_riesgo, titulo, mensaje, datos jsonb, leida_en, expira_en), cambiar SeveridadAlerta a string más amplio, agregar interfaces para dispositivo_usuario, preferencia_notificacion, notificacion_entrega.
- Actualizar api.ts: renombrar todas las funciones de 'alertas' a 'alerta', adaptar insertAlerta/getAlertas/updateAlertaStatus/countAlertasActivas al nuevo schema, agregar nuevas funciones para dispositivo_usuario (registerDevice, getDevices, deactivateDevice), preferencia_notificacion (getPreferencia, upsertPreferencia), notificacion_entrega (si aplica).
- Actualizar alerts/types.ts: cambiar AlertRecord para reflejar el nuevo schema (sin estado, con leida_en, titulo, mensaje, datos jsonb), adaptar AlertRecordInsert, mantener los tipos de severidad compatibles.
- Actualizar alerts/detector.ts: adaptar buildAlertRecord para generar titulo/mensaje/datos jsonb en vez de campos planos, mantener la lógica pura de evaluateSpo2/classifySeverity/isEpisodeResolved.
- Actualizar alerts/engine.ts: adaptar AlertSupabaseDeps y AlertEngine para el nuevo modelo (sin estado, con leida_en), la lógica de escalación puede quedar como timer interno sin persistir escalated_at, adaptar confirmAlert para usar leida_en.
- Actualizar alerts/escalation.ts: adaptar para que el callback de escalación funcione sin el campo escalated_at (usar datos jsonb o simplemente notificar).
- Actualizar AlertasScreen.tsx: cambiar las tabs de 'Todas/No leídas/Resueltas' a filtrar por leida_en null/no-null, adaptar alertDescription para usar titulo/mensaje/datos, adaptar severityToColorKey para los nuevos valores de severidad.
- Actualizar HealthProvider.tsx: adaptar el bridge entre AlertEngine y la API (los mapeos de insertAlert, getActiveAlerts, updateAlertStatus) al nuevo schema.
- Actualizar __tests__/alerts.test.ts: todos los tests deben usar los nuevos tipos (sin estado, con leida_en), adaptar makeEngineDeps y los assertions.

## Files in Scope

- `src/services/supabase/models.ts`
- `src/services/supabase/api.ts`
- `src/services/supabase/schema.sql`
- `src/services/alerts/types.ts`
- `src/services/alerts/detector.ts`
- `src/services/alerts/engine.ts`
- `src/services/alerts/escalation.ts`
- `src/services/alerts/index.ts`
- `src/screens/AlertasScreen.tsx`
- `src/context/HealthProvider.tsx`
- `scripts/migrations/2026-08-18_hu41_tabla_alertas.sql`
- `__tests__/alerts.test.ts`

## Constraints

- El DDL de las 4 tablas es inmutable — fue proporcionado por el usuario y no debe modificarse.
- La lógica de detección pura (evaluateSpo2, classifySeverity, isEpisodeResolved) NO debe cambiar — solo los datos que produce al construir el registro.
- Los enums de PostgreSQL se eliminan — todo es varchar en la BD.
- El motor de escalación por timeout de 5 min se mantiene como lógica interna del engine, pero ya no persiste escalated_at en la tabla (puede guardar en datos jsonb o simplemente notificar al listener).
- Los tipos TS deben seguir siendo compatibles con el resto de la app (HealthProvider, BottomTabNavigator, etc.).

## Acceptance Criteria

- [ ] La migración SQL crea las 4 tablas sin errores y sin conflictos con tablas existentes.
- [ ] Todos los archivos TypeScript compilan sin errores tras los cambios.
- [ ] Los tests en __tests__/alerts.test.ts pasan al 100%.
- [ ] La AlertasScreen muestra correctamente las alertas con el nuevo modelo (leída/no leída en vez de estado).
- [ ] El HealthProvider inicializa el AlertEngine correctamente con los nuevos mapeos de API.
- [ ] Las funciones API insertAlerta/getAlertas/marcarLeida funcionan contra el nuevo schema.
- [ ] Las tablas dispositivo_usuario, preferencia_notificacion, notificacion_entrega están listas para ser usadas (creadas pero sin lógica de UI aún).
- [ ] No hay regressions en el resto de la app (login, perfil, historial, etc.).

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### TypeScript compilation
```bash
npx tsc --noEmit
```

Success: exit code 0, no type errors · Timeout: 120s
### Alert tests
```bash
npx jest __tests__/alerts.test.ts --verbose
```

Success: all tests pass · Timeout: 120s
