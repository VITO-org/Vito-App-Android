---
schema_version: 1
doc_type: design
title: 'Design Doc: HU-54 — Configuración granular de notificaciones por contacto'
created_at: '2026-09-09T14:13:43.945537Z'
updated_at: '2026-09-09T14:13:43.945537Z'
tags:
- design
- hu-54
- contactos-confianza
- notificaciones
- configuracion-granular
- es-principal
- wa-me
- release-r3
- sprint-s13
status: draft
links: []
vault_scope: local
fingerprint: 5cdbcba09511369ecf261f96e07630b61668eb5614a3fa86913b0c72cf1ef833
session_id: 2026-09-09_hu-54-administracion-de-contactos-y-configuracion-de-notificaciones-por-contacto
spec_path: /Users/cristianvera21/Documents/proyecto-final/Vito-App-Android/.cortex/vault/specs/2026-09-09_hu-54-administracion-de-contactos-y-configuracion-de-notificaciones-por-contacto.md
---

# Design Doc: HU-54 — Configuración granular de notificaciones por contacto

> *Design document — Pluggable Middle Phase 09.B.*
> *Session: `2026-09-09_hu-54-administracion-de-contactos-y-configuracion-de-notificaciones-por-contacto` · Spec: `/Users/cristianvera21/Documents/proyecto-final/Vito-App-Android/.cortex/vault/specs/2026-09-09_hu-54-administracion-de-contactos-y-configuracion-de-notificaciones-por-contacto.md`*

## Architecture decision

ESTRATEGIA DE UNICIDAD es_principal: 2 updates secuenciales (desmarcar todos los contactos del usuario → marcar el nuevo como principal) + constraint parcial UNIQUE en DB como safety net. NO se usa RPC: sobredimensionado para este caso trivial (un usuario con pocos contactos, race window microscópico). El constraint UNIQUE parcial (`CREATE UNIQUE INDEX contacto_confianza_un_principal ON contacto_confianza(id_usuario) WHERE es_principal = true`) previene duplicados a nivel DB. Si ambos updates fallan por race condition, el constraint captura el conflicto y el frontend muestra error. Función dedicada marcarPrincipal() en api.ts centraliza esta lógica.

## Data model changes

- ALTER TABLE contacto_confianza ADD COLUMN tipos_evento jsonb NOT NULL DEFAULT '["fisiologico"]' — array de TipoEventoNotificacion. Categorías de suscripción (filtros), NO tipos de alerta concretos. fisiologico agrupa signos vitales; medicacion y estado_animo son dominios nuevos sin motor detrás. jsonb consistente con alerta.datos y prediccion_riesgo.factores_mas_influyentes.
- ALTER TABLE contacto_confianza ADD COLUMN canal varchar(20) NOT NULL DEFAULT 'app_interna' CHECK (canal IN ('app_interna','whatsapp')). Canal de notificación preferido por contacto.
- ALTER TABLE contacto_confianza ADD COLUMN estado_opt_in varchar(20) NOT NULL DEFAULT 'pendiente' CHECK (estado_opt_in IN ('pendiente','confirmado','rechazado','vencido')). Dato preparatorio para futura deuda técnica (flujo CA-03/CA-04). Sin flujo de confirmación en esta HU.
- ALTER TABLE contacto_confianza ADD COLUMN es_principal boolean NOT NULL DEFAULT false. Designa un contacto como principal (recibe todas las alertas — motor futuro). Constraint parcial UNIQUE: CREATE UNIQUE INDEX contacto_confianza_un_principal ON contacto_confianza(id_usuario) WHERE es_principal = true;
- Models.ts: Canales = 'app_interna' | 'whatsapp'; TiposEventoNotificacion = 'fisiologico' | 'medicacion' | 'estado_animo'; EstadoOptIn = 'pendiente' | 'confirmado' | 'rechazado' | 'vencido'. ContactoConfianza se extiende con +4 campos. ContactoConfianzaInsert hereda via Omit.
- NO se tocan policies RLS existentes — las 5 policies de HU-16 aplican sobre id_usuario y no referencian columnas específicas que se estén agregando.
- Nota: tipos_evento es un nivel de abstracción MÁS ALTO que TipoAlerta (= 'hipoxia'|'hipertension'|...). Son categorías de suscripción, no tipos de alerta concretos. Sin motor de envío, son DATA FUTURA — hoy no hay nada que consulte estos campos.

## API contracts

- api.ts: marcarPrincipal(contactoId: string, userId: string, accessToken?: string | null): Promise<void> — ejecuta 2 updates secuenciales: (1) desmarcar todos los contactos del usuario (PATCH id_usuario=eq.X body={es_principal:false}), (2) marcar el nuevo (PATCH id=eq.Y body={es_principal:true}). Ambos con updated_at. Maneja errores de DB.
- api.ts: Las 4 columnas nuevas entran solas via ContactoConfianzaInsert/Partial<Omit<...>> — NO se necesitan cambios en getContactos/insertContacto/updateContacto/deleteContacto existentes.
- contactos.ts: buildWhatsAppLink(telefono: string, mensaje: string): string — helper puro. Transforma E.164 con '+' a formato wa.me (solo dígitos): 'https://wa.me/<digitos>?text=<encodeURIComponent(mensaje)>'. Testeable sin dependencias.
- contactos.ts: ContactoForm se extiende con {canal: CanalNotificacion; tipos_evento: TipoEventoNotificacion[]; es_principal: boolean}. Catálogos CANALES (2 items con label) y EVENTOS (3 items con label).
- contactos.ts: validarContacto extendido — agrega: canal ∈ CANALES (si no, error), tipos_evento no vacío (si vacío, error), cada tipo ∈ EVENTOS (si alguno no, error). es_principal no se valida (manejo por UI/alert).
- contactos.ts: DEFAULTS: CANAL_DEFAULT = 'app_interna', EVENTOS_DEFAULT: TipoEventoNotificacion[] = ['fisiologico'], ES_PRINCIPAL_DEFAULT = false.
- Frontend: handleGuardar extiende para incluir canal, tipos_evento, es_principal en insertContacto/updateContacto.
- Frontend: handleCambiarPrincipal(contacto) — si ya existe principal y se marca otro → Alert.alert confirmación → marcarPrincipal() → cargarContactos(). Si se desmarca el principal → updateContacto directo.
- Frontend: accionWhatsApp(contacto) — Linking.openURL(buildWhatsAppLink(contacto.telefono, 'Mensaje de Vito')) — stub, solo visible en Card si canal='whatsapp'.

## Test plan

- validarContacto: canal inválido (canal='fax') → error; canal válido → null.
- validarContacto: tipos_evento vacío ([]) → error; tipos_evento con valor fuera del enum ['fisiologico','telepatia'] → error; tipos_evento válido ['fisiologico'] → null.
- buildWhatsAppLink: teléfono '+541155551234' → 'https://wa.me/541155551234?text=...'; teléfono '541155551234' (sin +) → mismo resultado; texto con espacios y caracteres especiales → encodeURIComponent correcto.
- resolverReemplazoPrincipal (función pura): si hay principal y marco otro → reemplaza (retorna {desmarcar: [id_viejo], marcar: id_nuevo}); si marco el mismo → no-op (retorna null); si no hay principal → solo marcar (retorna {desmarcar: [], marcar: id_nuevo}).
- Lectura siempre usa estado actual: la función pura no cachea, los builders no tienen estado. Test de que후 readContacto despues de update refleja los campos nuevos.
- ContactoForm defaults: al abrir modal de alta, canal='app_interna', tipos_evento=['fisiologico'], es_principal=false.
- Tipo es TipoEventoNotificacion[] en contacto leído desde DB (jsonb → TS array): test de que tipos_evento parseado coincide con el array guardado.

## Risks

- R1: Constraint parcial UNIQUE sin precedente en repo (es_principal). Riesgo de error 23505 en runtime si race condition. Mitigación: 2 updates secuenciales reduce el window a milisegundos; constraint es safety net; frontend muestra error claro si falla.
- R2: jsonb en RLS/policies: las policies existentes referencian id_usuario, no columnas específicas. Agregar columnas no las rompe. Verificar con pg_policies tras migration.
- R3: wa.me y formatos internacionales: número guardado sin código de país completo puede causar que wa.me no encuentre el contacto. Límite documentado: los teléfonos ya se validan con E.164 simplificado (8-15 dígitos con optional +).
- R4: tipos_evento como filtración de categoría: sin motor de envío, es DATA FUTURA. Hoy no hay nada que consulte estos campos (igual que R3 de HU-16). Documentar explícitamente.
- R5: es_principal sin motor de envío: el campo se persiste pero no tiene efecto funcional todavía. La UI lo muestra y permite toggle, pero no dispara nada. Deuda técnica documentada.
- R6: InsertContacto pasa tipos_evento como jsonb via rawRestFetch. PostgREST acepta arrays JSON en body — verificar que el POST/representation retorna el jsonb parseado correctamente.

---

*Generated by `cortex-code-designer` (Pluggable Middle Phase 09.B). The
implementer reads this document and follows it; deviations require a
new checkpoint with the `unverified_claims` justifying the diff.*
