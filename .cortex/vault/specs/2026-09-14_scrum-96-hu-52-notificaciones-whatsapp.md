# Spec: SCRUM-96 HU-52 Notificaciones automáticas por WhatsApp a familiares

- **Jira:** SCRUM-96 (HU-52) — Tareas por hacer, Sprint 8 activo
- **Rama:** `scrum-96-hu-52-notificaciones-automaticas-por-whatsapp` desde `origin/dev 7b1c152`
- **Subtareas Jira:** SCRUM-170 (redefinida: sin alta de cuenta, usar sandbox existente), SCRUM-171, SCRUM-172, SCRUM-173, SCRUM-174

## Goal

Implementar HU-52 (SCRUM-96): notificaciones automáticas por WhatsApp a familiares con
1 solo número WABA sandbox existente (sin cuentas extra), Edge Function de envío,
fallback SMS + email, consentimiento por contacto × tipo de evento y rate-limit,
mapeando las 5 subtareas Jira.

## Requirements

- T1/SCRUM-170: usar sandbox del número WABA existente + 2–3 plantillas Meta por tipo
  de evento (fisiológico, medicación, estado de ánimo) + registro de hasta 5 números
  de prueba. Sin alta de cuenta nueva.
- T2/SCRUM-171: tabla `notificacion_whatsapp` (cola: id_alerta, id_contacto, teléfono,
  plantilla, estado, intentos, respuesta) + Edge Function `enviar-whatsapp` vía
  Meta Cloud API + encolado desde `evaluar-evento` respetando canal/tipos_evento,
  consentimiento (`estado_opt_in`) y frecuencia.
- T3/SCRUM-172: fallback automático SMS (provider configurable, ej. Twilio trial con
  1 número) + email. Error 131030 (sin WhatsApp) dispara fallback. `wa.me` queda
  como stub local para dev sin token.
- T4/SCRUM-173: rate-limit SQL máx 3 mensajes/hora por contacto, bypass si severidad
  crítica.
- T5: consentimiento por contacto × tipo de evento reutilizando `estado_opt_in`
  (HU-54) + auditoría; webhook Meta registra confirmación cuando el contacto
  responde OK/Recibido (CA-03).
- T6/SCRUM-174: insumo para revisión legal de consentimiento/opt-out (dependencia
  externa, fuera del código).

## Acceptance Criteria

- [ ] CA-01: el sistema envía mensajes vía WhatsApp (Cloud API, 1 número sandbox
  existente) al teléfono registrado del contacto.
- [ ] CA-02: mensaje con nombre del usuario, tipo de evento, descripción en lenguaje
  no técnico y timestamp.
- [ ] CA-03: el contacto responde OK/Recibido vía webhook y la confirmación queda
  registrada.
- [ ] CA-04: sin WhatsApp → fallback automático SMS (provider configurable) + email.
- [ ] CA-05: solo con consentimiento explícito por contacto × tipo de evento.
- [ ] CA-06: máx 3 mensajes/hora por contacto salvo severidad crítica.

## Constraints

- Sin crear cuentas extra de WhatsApp: 1 solo número sandbox, 5 destinatarios prueba.
- Plantillas Meta aprobadas; fuera de ventana 24h solo plantillas.
- Android 14+ (API 34+), arquitectura React Native + Native Modules.
- Secrets solo vía env / supabase secrets, nunca hardcodeados.
- SCRUM-170 redefinida (sin alta de cuenta).

## Files in Scope

- supabase/functions/evaluar-evento/index.ts
- supabase/functions/enviar-whatsapp/index.ts (nueva)
- src/services/supabase/models.ts
- src/services/contactos.ts
- src/screens/ContactosConfianzaScreen.tsx
- scripts/migrations/2026-09-14_scrum96_cola_whatsapp_sms.sql (nueva)
- __tests__/contactos.test.ts

## Verification hooks

- `npx tsc --noEmit` → 0 errores
- `npx jest __tests__/contactos.test.ts` → todos pasan

## Tags

tasks-required, hu-52, scrum-96, whatsapp, sprint-8
