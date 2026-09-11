---
schema_version: 1
doc_type: session
title: 'Design Doc: HU-54 — Administración de contactos y configuración de notificaciones
  por contacto'
created_at: '2026-09-09T14:13:12.204477Z'
updated_at: '2026-09-09T14:13:12.204477Z'
tags: []
status: auto-draft
links: []
vault_scope: local
fingerprint: 38452895d9ea15def3057d523332319fe0c785de81e7174421bb65a5d885b5a7
session_id: 2026-09-09_hu-54-administracion-de-contactos-y-configuracion-de-notificaciones-por-contacto
pr: null
branch: null
commit: null
cortex_telemetry: null
---

## Original Specification

Extender HU-16 (contactos de confianza ya mergeada) con configuración granular por contacto: tipos de evento (fisiologico/medicacion/estado_animo), canal de notificación (app_interna/whatsapp), designación de contacto principal (es_principal con constraint parcial única), y stub wa.me. Alcance REDUCIDO: sin flujo opt-in, sin historial entregas, sin envío real, sin tocar AlertEngine/HealthProvider.

## Changes Made

- Design doc completo con 6 decisiones clave documentadas
- Data model: 4 columnas nuevas (tipos_evento jsonb, canal varchar+CHECK, estado_opt_in varchar+CHECK, es_principal boolean)
- Estrategia de unicidad es_principal: 2 updates secuenciales + constraint parcial UNIQUE como safety net (NO RPC)
- Función dedicada marcarPrincipal() en api.ts centraliza lógica de unicidad
- buildWhatsAppLink() helper puro que transforma E.164 a formato wa.me (quita '+')
- Multi-select tipos_evento: pills con toggle (patrón frecuencia), NO lista
- Card: badge estado_opt_in + acción 'Notificar por WhatsApp' visible solo si canal='whatsapp'

## Files Touched

- `src/services/supabase/models.ts`
- `src/services/supabase/api.ts`
- `src/services/contactos.ts`
- `src/screens/ContactosConfianzaScreen.tsx`
- `scripts/migrations/2026-09-09_hu54_configuracion_notificaciones_contacto.sql`
- `__tests__/contactos.test.ts`

## Key Decisions

- DEC-1: es_principal unicidad → 2 updates secuenciales (desmarcar todos → marcar uno) + constraint parcial UNIQUE. NO RPC: sobredimensionado para este caso. El constraint es safety net definitivo.
- DEC-2: marcarPrincipal() función dedicada en api.ts. Centraliza lógica, testeable, separación de responsabilidades.
- DEC-3: tipos_evento → TipoEventoNotificacion[] en TS (jsonb array → TS union array). Natural, type-safe, consistente con jsonb existente.
- DEC-4: wa.me phone format → buildWhatsAppLink() quita '+' del E.164. wa.me acepta solo dígitos.
- DEC-5: Botón 'Notificar por WhatsApp' → en Card (junto a Editar/Eliminar), solo si canal='whatsapp'. Acción de uso frecuente, no necesita modal.
- DEC-6: Multi-select tipos_evento → pills con toggle wrap (3 opciones, patrón frecuencia). NO lista de RegistrarSintoma.

## Next Steps

- [ ] Implementar migration ALTER TABLE en Supabase SQL Editor
- [ ] Extender models.ts con 4 tipos nuevos + interface ContactoConfianza expandida
- [ ] Extender contactos.ts con catálogos CANALES/EVENTOS, buildWhatsAppLink, validarContacto extendido
- [ ] Agregar marcarPrincipal() en api.ts
- [ ] Extender ContactosConfianzaScreen (modal + card + estilos)
- [ ] Escribir tests extendidos en __tests__/contactos.test.ts
- [ ] Verificar tsc --noEmit y jest exit 0
- [ ] Build release assembleRelease para smoke test

