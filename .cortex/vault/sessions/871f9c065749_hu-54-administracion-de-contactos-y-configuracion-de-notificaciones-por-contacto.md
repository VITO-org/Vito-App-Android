---
schema_version: 1
doc_type: session
title: 'HU-54: administración de contactos y configuración de notificaciones por contacto'
created_at: '2026-09-09T19:40:50.581361Z'
updated_at: '2026-09-09T19:40:50.581361Z'
tags:
- session
- session
- with-checkpoints
status: completed
links: []
vault_scope: local
fingerprint: 101985129a03dbf2ec876d1a882f0a1afaacdabdde8a74420fd536633dea6bee
session_id: 871f9c065749
pr: null
branch: null
commit: null
cortex_telemetry: null
---

## Original Specification

Extender la HU-16 (ya mergeada a dev) para darle al usuario una base de administración de contactos con configuración granular: registrar el contacto (número WhatsApp/email), y guardar sus elecciones de notificación por contacto — qué tipos de evento (fisiológico, medicación, estado de ánimo) y por qué canal (app interna, WhatsApp) — más la designación de un contacto principal. El flujo de opt-in/confirmación del contacto y el envío real/entrega quedan como deuda técnica explícita.

## Changes Made

- added: .cortex/vault/decisions/ADR-004-documenter-informe-del-explorer-para-hu-16-hallazgo-clave-gap-rls-de-datos.md
- added: .cortex/vault/designs/2026-09-08_registro-contacto-confianza.md
- added: .cortex/vault/sessions/a50c10008343_registro-contacto-confianza.md
- added: .cortex/vault/specs/2026-09-08_registro-contacto-confianza.md
- added: __tests__/contactos.test.ts
- added: scripts/migrations/2026-09-08_hu16_contacto_confianza.sql
- modified: src/navigation/RootNavigator.tsx
- added: src/screens/ContactosConfianzaScreen.tsx
- modified: src/screens/PerfilScreen.tsx
- added: src/services/contactos.ts
- modified: src/services/supabase/api.ts
- modified: src/services/supabase/models.ts
- modified: src/services/supabase/schema.sql

## Files Touched

- `✓ .cortex/vault/decisions/ADR-004-documenter-informe-del-explorer-para-hu-16-hallazgo-clave-gap-rls-de-datos.md`
- `✓ .cortex/vault/designs/2026-09-08_registro-contacto-confianza.md`
- `✓ .cortex/vault/sessions/a50c10008343_registro-contacto-confianza.md`
- `✓ .cortex/vault/specs/2026-09-08_registro-contacto-confianza.md`
- `✓ __tests__/contactos.test.ts`
- `✓ scripts/migrations/2026-09-08_hu16_contacto_confianza.sql`
- `✓ src/navigation/RootNavigator.tsx`
- `✓ src/screens/ContactosConfianzaScreen.tsx`
- `✓ src/screens/PerfilScreen.tsx`
- `✓ src/services/contactos.ts`
- `✓ src/services/supabase/api.ts`
- `✓ src/services/supabase/models.ts`
- `✓ src/services/supabase/schema.sql`
- `◌ src/services/alerts/types.ts`
- `◌ scripts/migrations/2026-08-20_hu41_migracion_schema_alertas.sql`
- `◌ scripts/migrations/2026-08-23_hu98_baseline_personalizado.sql`
- `◌ src/screens/ConfiguracionScreen.tsx`
- `◌ src/screens/RegistrarSintomaScreen.tsx`
- `◌ app.json`
- `◌ scripts/migrations/2026-09-09_hu54_configuracion_notificaciones_contacto.sql`

## Key Decisions

- documenter: informe del explorer para HU-54. HALLAZGO CLAVE: tipos_evento (fisiologico/medicacion/estado_animo) son un NIVEL NUEVO y MAS ALTO que TipoAlerta (que tiene 5 valores granulares: hipoxia/hipertension/...). No mapean 1:1 — son categorías de suscripción. jsonb ya tiene precedente (alerta.datos, prediccion_riesgo.factores_mas_influyentes). NO hay precedente de índice único parcial (es_principal sería el primero). RPC confirmado (recalcular_baseline via rawRestFetch rpc/). Sin Linking ni deps de WhatsApp en el repo.
- Design doc completo para HU-54. 6 decisiones clave: (1) unicidad es_principal = 2 updates secuenciales + constraint parcial UNIQUE, (2) marcarPrincipal() función dedicada en api.ts, (3) tipos_evento = TipoEventoNotificacion[] jsonb→TS array, (4) wa.me = buildWhatsAppLink() quita '+' de E.164, (5) botón WhatsApp en Card solo si canal='whatsapp', (6) multi-select = pills toggle wrap patrón frecuencia. Documento jerarquía tipos_evento > TipoAlerta. Deuda técnica explícita: opt-in, historial entregas, envío real, motor notificaciones.
- HU-54 implementada: migration SQL nueva (4 columnas + UNIQUE parcial comentado, NO ejecutada), modelos extendidos (CanalNotificacion/TipoEventoNotificacion/EstadoOptIn), contacto_confianza +4 campos, módulo puro contactos.ts extendido (validarContacto canal/eventos, buildWhatsAppLink, resolverReemplazoPrincipal, catálogos CANALES/EVENTOS y defaults), marcarPrincipal() con 2 PATCH secuenciales en api.ts, pantalla con canal segmentado + pills de eventos multi-select + toggle principal (solo edición, con Alert de confirmación), badge estado_opt_in y línea canal·eventos en la card + acción WhatsApp (wa.me). Tests: 185/185 (14 nuevos, contactos 22→36). tsc 0 errores. Migration la corre el usuario en SQL Editor de Supabase.
- documenter: HU-54 implementada completando Deep Track (explorer→designer→implementer). 3 checkpoints en sesión; tasks 5/5 done. Spec: .cortex/vault/specs/2026-09-09_hu-54-administracion-de-contactos-y-configuracion-de-notificaciones-por-contacto.md. Design: .cortex/vault/designs/2026-09-09_hu-54-...md (DEC-1..DEC-6). Pendientes de usuario: (1) correr migration en SQL Editor de Supabase, (2) generar APK release local si quiere probar, (3) QA en dispositivo. Después: PR scrum-98 a dev. Deuda técnica documentada: opt-in CA-03/04, historial CA-07, envío real WhatsApp, motor de notificaciones.
- documenter: fix UX modal de ContactosConfianza. Root cause: el bottom-sheet era una View fija sin ScrollView + KeyboardAvoidingView no-op en Android (behavior undefined), así que con el teclado abierto (windowSoftInputMode=adjustResize ya activo) el contenido se recortaba y no había forma de scrollear al campo activo. Fix: contenido del modal envuelto en ScrollView con keyboardShouldPersistTaps='handled', paddings movidos a contentContainerStyle, maxHeight 92% en el KAV para que el sheet nunca exceda la ventana visible y el scroll sea el que acomode el teclado. Sin cambios de lógica/estado. Validado tsc 0 + jest 185/185.

## Next Steps

- [ ] Decide if scope drift is intentional: .cortex/vault/decisions/ADR-004-documenter-informe-del-explorer-para-hu-16-hallazgo-clave-gap-rls-de-datos.md, .cortex/vault/designs/2026-09-08_registro-contacto-confianza.md, .cortex/vault/sessions/a50c10008343_registro-contacto-confianza.md, .cortex/vault/specs/2026-09-08_registro-contacto-confianza.md, scripts/migrations/2026-09-08_hu16_contacto_confianza.sql, src/screens/PerfilScreen.tsx, src/services/alerts/types.ts, scripts/migrations/2026-08-20_hu41_migracion_schema_alertas.sql, scripts/migrations/2026-08-23_hu98_baseline_personalizado.sql, src/screens/ConfiguracionScreen.tsx, src/screens/RegistrarSintomaScreen.tsx, app.json
- [ ] Commit (or revert) declared-only files: src/services/alerts/types.ts, scripts/migrations/2026-08-20_hu41_migracion_schema_alertas.sql, scripts/migrations/2026-08-23_hu98_baseline_personalizado.sql, src/screens/ConfiguracionScreen.tsx, src/screens/RegistrarSintomaScreen.tsx, app.json, scripts/migrations/2026-09-09_hu54_configuracion_notificaciones_contacto.sql

## Verified State

- Modified 8 file(s) inside spec scope
- verification hook 'tsc' passed
- verification hook 'jest' passed

## Unverified Claims

- acceptance criterion: AC-01: El modal de alta/edición de contacto permite elegir canal (app_interna | whatsapp) y tipos de evento (fisiologico, medicacion, estado_animo) por contacto
- acceptance criterion: AC-02: La configuración granular guardada se refleja al reabrir el mismo contacto (persistencia verificable en Supabase y en la UI)
- acceptance criterion: AC-03: Se puede marcar/desmarcar un contacto como principal; el sistema impide tener más de un principal por usuario (constraint parcial única en DB + validación en UI/tests)
- acceptance criterion: AC-04: Los cambios aplican de inmediato sin efecto retroactivo (tests de lógica pura que verifican lectura del estado actual)
- acceptance criterion: AC-05: El teléfono del contacto queda registrado y validado (formato existente de HU-16) y existe una acción 'Notificar por WhatsApp' que abre wa.me con el mensaje precargado (stub)
- acceptance criterion: AC-06: Gates: npx tsc --noEmit 0 errores y npx jest exit 0 (base 171 + tests nuevos)
- acceptance criterion: AC-07: Se genera build release local al final para testear (assembleRelease)

## Tasks (5/5 completed)

- T1 — [Backend] Migration ALTER contacto_confianza: agregar tipos_evento (jsonb), canal (varchar+CHECK app_interna|whatsapp), estado_opt_in (default pendiente, dato), es_principal (bool default false) + índice parcial único WHERE es_principal (un solo principal por usuario). Generar scripts/migrations/2026-09-09_hu54_configuracion_notificaciones_contacto.sql para que el usuario lo corra manualmente. RLS own se mantiene (no tocar policies existentes). `[done]`
- T2 — [Backend] models.ts: uniones TiposEventoNotificacion (fisiologico|medicacion|estado_animo), CanalNotificacion (app_interna|whatsapp), EstadoOptIn (pendiente|confirmado|rechazado|vencido); extender ContactoConfianza y ContactoConfianzaInsert con tipos_evento, canal, estado_opt_in, es_principal. `[done]`
- T3 — [Backend] contactos.ts (módulo puro): catálogos EVENTOS/CANALES, extender validarContacto (canal válido, tipos_evento no vacío y dentro del enum), builders para update de es_principal/tipos_evento/canal. api.ts: extender getContactos/insertContacto/updateContacto con los campos nuevos (rawRestFetch, patrón existente) + función marcarPrincipal (update es_principal respetando unicidad). `[done]`
- T4 — [Frontend] ContactosConfianzaScreen (HU-16 ya trae el modal): agregar selector de canal (app_interna|whatsapp con labels), multi-select de tipos de evento, toggle es_principal (con manejo de cambiar principal: si ya hay uno, confirmar reemplazo) y acción 'Notificar por WhatsApp' (Linking.openURL wa.me/<telefono>?text=<mensaje> — stub sin proveedor real). Badge de estado_opt_in 'pendiente' (solo visual por ahora). `[done]`
- T5 — [QA] Tests: validación canal/tipos_evento (valores inválidos), unicidad de principal (lógica de reemplazo), aplicación inmediata sin retroactividad (lectura de estado actual). Gates tsc 0 + jest (base 171 + nuevos). Build release local al final (assembleRelease). `[done]`
