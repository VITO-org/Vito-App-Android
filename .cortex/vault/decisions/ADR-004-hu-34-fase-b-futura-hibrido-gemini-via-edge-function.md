---
schema_version: 1
doc_type: adr
title: 'HU-34 Fase B futura: híbrido Gemini vía Edge Function'
created_at: '2026-09-15T03:23:41.120495Z'
updated_at: '2026-09-15T03:23:41.120495Z'
tags:
- hu-34
- scrum-86
- fase-b
- gemini
- adr
status: accepted
links: []
vault_scope: local
fingerprint: 1a5790d2649f9eaf447e691095bc05049c391cb22aa1114b9978b11f9389fdb6
adr_number: 4
supersedes: []
superseded_by: null
alternatives_considered: []
acceptance_criteria_met: false
---

## Context

HU-34 (SCRUM-86) pide sugerencias personalizadas en dashboard. Fase A especificada en 2026-09-07 como motor local de reglas sin IA (ver vault/specs/2026-09-07_hu-34-sugerencias-de-vittito-fase-a-motor-de-reglas-local-ui-en-dashboard.md). El 2026-09-17 se aprobo extension de fuente: primaria Supabase datos_reloj 24h con fallback a Health Connect. Se evaluó agregar Gemini para enriquecer sugerencias lifestyle y patrones complejos.

## Decision

Fase A: motor local determinístico (rulesEngine puro) + supabaseMapper puro que condensa datos_reloj 24h a HealthSummary (FC promedio, PA/SpO2/temp ultimo por recorded_at, pasos suma, sueno ultimo*60, excluye reemplazado_por) + supabaseSource loader (unico con red via getDatosReloj) + UI debajo de signos vitales en InicioScreen con effectiveSummary = remoteSummary ?? summary. Offline-first se mantiene via fallback a Health Connect. Sin SDKs LLM. Fase B (futuro S18, OUT OF SCOPE S17): híbrido con Gemini 2.5 Flash-Lite vía Supabase Edge Function generar-sugerencia (proxy con secrets, rate-limit 1/día, cache 24h, fallback a reglas, validación Zod, disclaimer no-médico). Interfaz SuggestionProvider deja seam para LlmSuggestionProvider sin tocar UI.

## Alternatives Considered

(none)

## Consequences

- Fase A lee datos_reloj (incluye panel-admin y cargas manuales) sin romper offline: sin red o sin filas, fallback a Health Connect y CA-07 vacio.
- RLS de datos_reloj debe permitir SELECT al usuario autenticado desde la app (pendiente verificar en prod, ver claims no verificados de la sesion); si RLS bloquea, la app cae a fallback silencioso y Vittito no muestra datos remotos.
- Testabilidad preservada: rulesEngine + supabaseMapper puros (17/17 jest), red aislada en supabaseSource.



