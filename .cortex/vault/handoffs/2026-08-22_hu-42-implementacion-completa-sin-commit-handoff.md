---
schema_version: 1
doc_type: handoff
title: 'HU-42: Implementación completa sin commit — handoff'
created_at: '2026-08-22T14:36:20.916556Z'
updated_at: '2026-08-22T14:36:20.916556Z'
tags:
- hu-42
- alertas
- frecuencia-cardiaca
- taquicardia
- bradicardia
- fast-track
- sin-commit
status: handoff
links:
- 2026-08-21_hu-42-alerta-por-frecuencia-cardiaca-fuera-de-rango
- HU-SCRUM-91
vault_scope: local
fingerprint: 56b24c7da638204951bb433a15cc33f6b26411bf22944e68beb04cd9fd1cea0c
parent_session_id: 2026-08-21_hu-42-alerta-por-frecuencia-cardiaca-fuera-de-rango
---

# HU-42: Alerta por frecuencia cardíaca fuera de rango — Handoff

## Resumen

Implementación de HU-42 (SCRUM-91) completada en Fast Track: tercer signo vital (FC) sobre el `AlertEngine` existente, siguiendo el patrón HU-41 (SpO2) / HU-43 (BP). Ver spec [[2026-08-21_hu-42-alerta-por-frecuencia-cardiaca-fuera-de-rango]] para alcance completo.

## Qué se hizo

- Detector puro en `src/services/alerts/detector.ts`: `classifyHr()`, `evaluateHr()`, `isHrEpisodeResolved()`, `computeHrTrend()` (ventana 5 min, delta ±5 lpm), `buildHrAlertRecord()`
- Engine (`src/services/alerts/engine.ts`): `evaluateHrReading()` como 3er entry point + dep opcional `getRecentHeartRates` con fallback `'estable'`
- `src/context/HealthProvider.tsx`: historial FC vía `getDatosReloj` + llamada a `evaluateHrReading()` tras cada sync cuando hay `averageBpm`
- `src/services/supabase/models.ts`: `TipoAlerta` extendido (columna varchar, sin migración)
- `__tests__/alerts.test.ts`: +28 tests nuevos

## Verified State

| Check | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 errores nuevos en archivos HU-42 |
| `npx jest __tests__/alerts.test.ts` | 80/80 pasan |
| Cobertura módulo alerts | detector 95.4% / engine 94.6% stmts |

Hooks corridos manualmente durante la sesión con resultados concretos (no capturados como resultados formales por `finish-session`).

## Por qué handoff

1. ~~Nada está commiteado~~ → **RESUELTO (2026-08-22)**: commits separados por HU.
2. `src/services/supabase/api.ts` quedó declarado en scope y **no se tocó**: resultó innecesario porque el historial de FC se obtiene con el `getDatosReloj` existente cableado desde HealthProvider. Es reducción de scope, no trabajo faltante.
3. Scope drift menor: `src/services/supabase/models.ts` se tocó fuera del scope declarado; requerido para que `insertAlerta` acepte los tipos nuevos (sin eso, tsc falla).

### Commits posteriores al cierre

- `e1bd48b` feat(hu-43) en rama `scrum-92-hu-43-alerta-presion-arterial` (el trabajo BP sin commit de la sesión anterior)
- `35ffd51` feat(hu-42) en rama `scrum-91-hu-42-alerta-frecuencia-cardiaca` (encadena sobre e1bd48b; HU-42 = SCRUM-91, HU-43 = SCRUM-92)
- Validación post-split: 80/80 tests, 0 errores tsc en archivos core

## Decisiones in-flight

- Umbrales críticos de FC (>=120 crítica alta / <=40 crítica baja) propuestos por analogía con las bandas SpO2/BP; el ticket solo especifica defaults warning (>100 / <50 lpm). Pendiente aprobación clínica (DoD del ticket).
- Tendencia CA-04 calculada comparando lectura más vieja vs más nueva dentro de la ventana de 5 minutos con umbral ±5 lpm.
- Dedup comparte episodio entre taquicardia y bradicardia (mismo patrón que hipertensión/hipotensión comparten episodio BP).

## Sorpresas

- El importador automático de Jira falla con issue types en español ("Historia"): la HU-42 se importó manualmente a [[HU-SCRUM-91]] vía write_doc.
- La sesión HU-41 del 18/08 estaba huérfana en estado `open`; cerrada manualmente al inicio de esta sesión.

## Unverified Claims

- Escalamiento E2E con alerta FC no probado en dispositivo real (limitación heredada de HU-41: timers en memoria).
- Tendencia CA-04 depende de lecturas previas en `datos_reloj` — flujo completo contra backend real no ejecutado.
- Aprobación clínica de umbrales críticos pendiente.
- Verificación visual de AlertasScreen renderizando los tipos nuevos pendiente.

## Blockers

(ninguno bloqueante — solo los pendientes listados arriba)

## Next Session Needs

- [x] Commit de los archivos ◌ → hecho: `e1bd48b` (HU-43) + `35ffd51` (HU-42) en ramas separadas
- [ ] Actualización de estado del ticket SCRUM-91 en Jira
- [ ] Escalamiento E2E y tendencia contra backend real

## Parent Session

[[2026-08-21_hu-42-alerta-por-frecuencia-cardiaca-fuera-de-rango]]
