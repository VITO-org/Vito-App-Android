---
schema_version: 1
doc_type: spec
title: 'HU-54: administración de contactos y configuración de notificaciones por contacto'
created_at: '2026-09-09T13:59:30.762616Z'
updated_at: '2026-09-09T13:59:30.762616Z'
tags:
- spec
- hu-54
- contactos-confianza
- notificaciones
- release-r3
- sprint-s13
- epica-5
- tasks-required
status: draft
links: []
vault_scope: local
fingerprint: 408d7f82df024c48985cc7c02eec10be3252fe4048d2e1404b022106a6c320ae
verification_hooks:
- name: tsc
  command: npx tsc --noEmit
  required: true
  success_criteria: exit code 0
  timeout_seconds: 180
- name: jest
  command: npx jest
  required: true
  success_criteria: exit code 0
  timeout_seconds: 300
goal: 'Extender la HU-16 (ya mergeada a dev) para darle al usuario una base de administración
  de contactos con configuración granular: registrar el contacto (número WhatsApp/email),
  y guardar sus elecciones de notificación por contacto — qué tipos de evento (fisiológico,
  medicación, estado de ánimo) y por qué canal (app interna, WhatsApp) — más la designación
  de un contacto principal. El flujo de opt-in/confirmación del contacto y el envío
  real/entrega quedan como deuda técnica explícita.'
files_in_scope:
- src/services/supabase/models.ts
- src/services/supabase/api.ts
- src/services/contactos.ts
- src/screens/ContactosConfianzaScreen.tsx
- src/services/supabase/schema.sql
- scripts/migrations/2026-09-09_hu54_configuracion_notificaciones_contacto.sql
- __tests__/contactos.test.ts
- src/navigation/RootNavigator.tsx
constraints:
- NO flujo de opt-in/confirmación del contacto (CA-03/CA-04) → DEUDA TÉCNICA documentada
  en la spec
- NO historial de notificaciones por contacto ni generalización de notificacion_entrega
  (CA-07) → DEUDA TÉCNICA
- 'NO envío real por WhatsApp (sin proveedor): deep-link wa.me como stub, deuda técnica
  explícita'
- NO tocar AlertEngine/HealthProvider/notificador (el envío efectivo sigue out-of-scope,
  igual que R3 de HU-16)
- Sin dependencias nuevas (no react-hook-form/zod; validación manual en contactos.ts,
  patrón del repo)
- 'RLS: mantener patrón _own de HU-16 al agregar columnas; no repetir gap de datos_reloj'
- La migration (ALTER TABLE + policies) la corre el usuario manualmente en el SQL
  Editor de Supabase
- 'es_principal: constraint única parcial index (un solo principal por usuario); la
  lógica de ''recibe todas las alertas'' queda para el futuro motor de envío (deuda
  técnica)'
- tipos_evento como jsonb (lista) con union type en TS; canal como varchar con CHECK
- 'Bajar el sprint: si el scrum number de rama difiere, usar patrón scrum-<N>-hu-54-...'
acceptance_criteria:
- 'AC-01: El modal de alta/edición de contacto permite elegir canal (app_interna |
  whatsapp) y tipos de evento (fisiologico, medicacion, estado_animo) por contacto'
- 'AC-02: La configuración granular guardada se refleja al reabrir el mismo contacto
  (persistencia verificable en Supabase y en la UI)'
- 'AC-03: Se puede marcar/desmarcar un contacto como principal; el sistema impide
  tener más de un principal por usuario (constraint parcial única en DB + validación
  en UI/tests)'
- 'AC-04: Los cambios aplican de inmediato sin efecto retroactivo (tests de lógica
  pura que verifican lectura del estado actual)'
- 'AC-05: El teléfono del contacto queda registrado y validado (formato existente
  de HU-16) y existe una acción ''Notificar por WhatsApp'' que abre wa.me con el mensaje
  precargado (stub)'
- 'AC-06: Gates: npx tsc --noEmit 0 errores y npx jest exit 0 (base 171 + tests nuevos)'
- 'AC-07: Se genera build release local al final para testear (assembleRelease)'
---

## Goal

Extender la HU-16 (ya mergeada a dev) para darle al usuario una base de administración de contactos con configuración granular: registrar el contacto (número WhatsApp/email), y guardar sus elecciones de notificación por contacto — qué tipos de evento (fisiológico, medicación, estado de ánimo) y por qué canal (app interna, WhatsApp) — más la designación de un contacto principal. El flujo de opt-in/confirmación del contacto y el envío real/entrega quedan como deuda técnica explícita.

## Requirements

- Base: HU-16 ya mergeada a dev (fa14a4d) — tabla contacto_confianza con RLS own (5 policies), CRUD funcional, pantalla ContactosConfianzaScreen, módulo puro contactos.ts, 22 tests. Esta HU la EXTENDE, no la rehace.
- CA-02 (core): por cada contacto el usuario configura tipos de evento (fisiologico, medicacion, estado_animo) y canal (app_interna, whatsapp). La elección se PERSISTE y se lee de vuelta al abrir el contacto (configuración granular contacto × evento × canal)
- CA-05 (reducido): designar un contacto como 'principal' (es_principal), con UN SOLO principal por usuario (constraint de unicidad) y manejo en UI + tests de la lógica de un solo principal
- CA-06: los cambios de configuración se aplican de forma inmediata sin efecto retroactivo — la app siempre lee el estado actual; cubierto por tests de lógica pura
- CA-01: se mantiene el CRUD de HU-16 (nombre, relación, teléfono WhatsApp, email) con validación de formato existente
- Canal whatsapp: sin proveedor real en el repo (ni Meta Cloud API ni Twilio) — el canal se persiste como dato y el 'envío' es un deep-link wa.me/<telefono>?text=<mensaje> (stub documentado como deuda técnica)
- estado_opt_in: se agrega como columna con default 'pendiente' (dato) para preparar la deuda técnica del opt-in, SIN flujo de confirmación en esta HU

## Files in Scope

- `src/services/supabase/models.ts`
- `src/services/supabase/api.ts`
- `src/services/contactos.ts`
- `src/screens/ContactosConfianzaScreen.tsx`
- `src/services/supabase/schema.sql`
- `scripts/migrations/2026-09-09_hu54_configuracion_notificaciones_contacto.sql`
- `__tests__/contactos.test.ts`
- `src/navigation/RootNavigator.tsx`

## Constraints

- NO flujo de opt-in/confirmación del contacto (CA-03/CA-04) → DEUDA TÉCNICA documentada en la spec
- NO historial de notificaciones por contacto ni generalización de notificacion_entrega (CA-07) → DEUDA TÉCNICA
- NO envío real por WhatsApp (sin proveedor): deep-link wa.me como stub, deuda técnica explícita
- NO tocar AlertEngine/HealthProvider/notificador (el envío efectivo sigue out-of-scope, igual que R3 de HU-16)
- Sin dependencias nuevas (no react-hook-form/zod; validación manual en contactos.ts, patrón del repo)
- RLS: mantener patrón _own de HU-16 al agregar columnas; no repetir gap de datos_reloj
- La migration (ALTER TABLE + policies) la corre el usuario manualmente en el SQL Editor de Supabase
- es_principal: constraint única parcial index (un solo principal por usuario); la lógica de 'recibe todas las alertas' queda para el futuro motor de envío (deuda técnica)
- tipos_evento como jsonb (lista) con union type en TS; canal como varchar con CHECK
- Bajar el sprint: si el scrum number de rama difiere, usar patrón scrum-<N>-hu-54-...

## Acceptance Criteria

- [ ] AC-01: El modal de alta/edición de contacto permite elegir canal (app_interna | whatsapp) y tipos de evento (fisiologico, medicacion, estado_animo) por contacto
- [ ] AC-02: La configuración granular guardada se refleja al reabrir el mismo contacto (persistencia verificable en Supabase y en la UI)
- [ ] AC-03: Se puede marcar/desmarcar un contacto como principal; el sistema impide tener más de un principal por usuario (constraint parcial única en DB + validación en UI/tests)
- [ ] AC-04: Los cambios aplican de inmediato sin efecto retroactivo (tests de lógica pura que verifican lectura del estado actual)
- [ ] AC-05: El teléfono del contacto queda registrado y validado (formato existente de HU-16) y existe una acción 'Notificar por WhatsApp' que abre wa.me con el mensaje precargado (stub)
- [ ] AC-06: Gates: npx tsc --noEmit 0 errores y npx jest exit 0 (base 171 + tests nuevos)
- [ ] AC-07: Se genera build release local al final para testear (assembleRelease)

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### tsc
```bash
npx tsc --noEmit
```

Success: exit code 0 · Timeout: 180s
### jest
```bash
npx jest
```

Success: exit code 0 · Timeout: 300s
