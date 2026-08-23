---
schema_version: 1
doc_type: spec
title: 'HU-42: Alerta por frecuencia cardíaca fuera de rango'
created_at: '2026-08-21T23:35:04.052234Z'
updated_at: '2026-08-21T23:35:04.052234Z'
tags:
- spec
- spec
- hu-42
- alertas
- frecuencia-cardiaca
- taquicardia
- bradicardia
- detector
- engine
status: draft
links: []
vault_scope: local
fingerprint: 6f59cf32e53b8efc21a488d57e30fd0db8feeaedf7c47d6b940c46e22523f969
verification_hooks:
- name: TypeScript compilation
  command: npx tsc --noEmit
  required: true
  success_criteria: exit code 0, no type errors nuevos
  timeout_seconds: 120
- name: Alert tests
  command: npx jest __tests__/alerts.test.ts --verbose
  required: true
  success_criteria: all tests pass
  timeout_seconds: 180
goal: Implementar el módulo de detección de frecuencia cardíaca fuera de rango que
  genera alertas cuando la FC del usuario supera su umbral superior (taquicardia)
  o cae por debajo del inferior (bradicardia), con umbrales configurables, distinción
  explícita del tipo, tendencia de los últimos 5 minutos y deduplicación por episodio
  continuo. Reutiliza el patrón ya implementado para HU-41 (SpO2) y HU-43 (presión
  arterial) sobre el AlertEngine existente.
files_in_scope:
- src/services/alerts/types.ts
- src/services/alerts/detector.ts
- src/services/alerts/engine.ts
- src/services/alerts/index.ts
- src/context/HealthProvider.tsx
- src/services/supabase/api.ts
- __tests__/alerts.test.ts
constraints:
- Reutilizar la infraestructura existente del AlertEngine (persistencia, dedup, cache,
  escalacion via EscalationManager). No crear clase separada.
- 'El campo tipo de la tabla alerta es varchar (no enum): acepta los nuevos valores
  taquicardia/bradicardia sin migracion.'
- La logica de deteccion pura (evaluateHr, computeHrTrend) no tiene side effects —
  testeable aislada.
- 'Mantener compatibilidad con los motores existentes: no romper evaluateSpo2Reading
  ni evaluateBpReading.'
- Si no hay historial suficiente para calcular tendencia, retornar 'estable'.
- Los umbrales warning/critical son configurables; defaults sujetos a aprobacion clinica
  pendiente (DoD del ticket Jira).
acceptance_criteria:
- 'evaluateHr() retorna resultado correcto para: FC normal, taquicardia advertencia
  (>100), taquicardia critica (>=120), bradicardia advertencia (<50), bradicardia
  critica (<=40)'
- 'computeHrTrend() clasifica correctamente: subiendo, bajando, estable; y retorna
  ''estable'' si no hay historial suficiente'
- Se generan alertas en tabla alerta con tipo 'taquicardia' o 'bradicardia' y severidad
  correcta
- Titulo/mensaje mencionan explicitamente el tipo (taquicardia o bradicardia), valor
  medido, umbral excedido y tendencia (CA-03 + CA-04)
- 'Dedup CA-05: no genera segunda alerta mientras la condicion persiste sin recuperacion
  (max 1 alerta por episodio continuo)'
- 'Resolucion de episodio: FC vuelve a rango normal -> alerta activa se marca leida
  y se cancela la escalacion'
- HealthProvider llama evaluateHrReading() tras cada sync cycle cuando averageBpm
  esta disponible
- Escalacion por timeout funciona igual que para SpO2/BP (reutiliza EscalationManager)
- Tests pasan al 100% con cobertura >=80% sobre evaluateHr, computeHrTrend, dedup
  y resolucion
- TypeScript compilation sin errores nuevos
---

## Goal

Implementar el módulo de detección de frecuencia cardíaca fuera de rango que genera alertas cuando la FC del usuario supera su umbral superior (taquicardia) o cae por debajo del inferior (bradicardia), con umbrales configurables, distinción explícita del tipo, tendencia de los últimos 5 minutos y deduplicación por episodio continuo. Reutiliza el patrón ya implementado para HU-41 (SpO2) y HU-43 (presión arterial) sobre el AlertEngine existente.

## Requirements

- CA-01: Detectar FC > umbral superior (taquicardia) o FC < umbral inferior (bradicardia) contra el perfil del usuario.
- CA-02: Valores por defecto configurables: taquicardia >100 lpm, bradicardia <50 lpm, con bandas warning/critical analogas a SpO2/BP (defaults propuestos: tachyWarning=100, tachyCritical=120, bradyWarning=50, bradyCritical=40, sujetos a aprobacion clinica).
- CA-03: Tipos de alerta diferenciados: extender AlertType con 'taquicardia' y 'bradicardia'; titulo/mensaje mencionan explicitamente cual de las dos.
- CA-04: La alerta incluye la tendencia de los ultimos 5 minutos ('subiendo'|'bajando'|'estable') calculada sobre lecturas previas de datos_reloj (frec_cardiaca_bpm); almacenada en datos jsonb y visible en el mensaje.
- CA-05: No se generan alertas duplicadas si la condicion persiste sin recuperacion (max 1 alerta por episodio continuo); el episodio se resuelve cuando la FC vuelve al rango normal.
- Crear HrThresholds + DEFAULT_HR_THRESHOLDS en types.ts siguiendo el patron de BpThresholds.
- Crear evaluateHr() funcion pura en detector.ts que retorne HrDetectionResult (shouldAlert, severity, thresholdExceeded, isNewEpisode).
- Crear computeHrTrend() funcion pura en detector.ts que calcule la tendencia a partir de un array de lecturas {bpm, recordedAt} de los ultimos 5 minutos.
- Crear buildHrAlertRecord() en detector.ts para construir el AlertRecordInsert con datos jsonb (valor_medido, umbral, tendencia).
- Agregar evaluateHrReading() al AlertEngine como nuevo entry point + hrThresholds en AlertEngineConfig + dep opcional inyectable getRecentHeartRates(userId, fromIso) para el historial de tendencia.
- Integrar en HealthProvider.tsx: llamar evaluateHrReading() despues de syncWearableToBackend() cuando data.averageBpm != null (mismo patron que SpO2 en linea 229 y BP en linea 242).
- Exportar nuevos tipos/constantes desde index.ts.
- Tests en __tests__/alerts.test.ts: cobertura >=80% sobre evaluateHr, computeHrTrend, dedup por episodio continuo, resolucion de episodio e integracion del engine.

## Files in Scope

- `src/services/alerts/types.ts`
- `src/services/alerts/detector.ts`
- `src/services/alerts/engine.ts`
- `src/services/alerts/index.ts`
- `src/context/HealthProvider.tsx`
- `src/services/supabase/api.ts`
- `__tests__/alerts.test.ts`

## Constraints

- Reutilizar la infraestructura existente del AlertEngine (persistencia, dedup, cache, escalacion via EscalationManager). No crear clase separada.
- El campo tipo de la tabla alerta es varchar (no enum): acepta los nuevos valores taquicardia/bradicardia sin migracion.
- La logica de deteccion pura (evaluateHr, computeHrTrend) no tiene side effects — testeable aislada.
- Mantener compatibilidad con los motores existentes: no romper evaluateSpo2Reading ni evaluateBpReading.
- Si no hay historial suficiente para calcular tendencia, retornar 'estable'.
- Los umbrales warning/critical son configurables; defaults sujetos a aprobacion clinica pendiente (DoD del ticket Jira).

## Acceptance Criteria

- [ ] evaluateHr() retorna resultado correcto para: FC normal, taquicardia advertencia (>100), taquicardia critica (>=120), bradicardia advertencia (<50), bradicardia critica (<=40)
- [ ] computeHrTrend() clasifica correctamente: subiendo, bajando, estable; y retorna 'estable' si no hay historial suficiente
- [ ] Se generan alertas en tabla alerta con tipo 'taquicardia' o 'bradicardia' y severidad correcta
- [ ] Titulo/mensaje mencionan explicitamente el tipo (taquicardia o bradicardia), valor medido, umbral excedido y tendencia (CA-03 + CA-04)
- [ ] Dedup CA-05: no genera segunda alerta mientras la condicion persiste sin recuperacion (max 1 alerta por episodio continuo)
- [ ] Resolucion de episodio: FC vuelve a rango normal -> alerta activa se marca leida y se cancela la escalacion
- [ ] HealthProvider llama evaluateHrReading() tras cada sync cycle cuando averageBpm esta disponible
- [ ] Escalacion por timeout funciona igual que para SpO2/BP (reutiliza EscalationManager)
- [ ] Tests pasan al 100% con cobertura >=80% sobre evaluateHr, computeHrTrend, dedup y resolucion
- [ ] TypeScript compilation sin errores nuevos

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### TypeScript compilation
```bash
npx tsc --noEmit
```

Success: exit code 0, no type errors nuevos · Timeout: 120s
### Alert tests
```bash
npx jest __tests__/alerts.test.ts --verbose
```

Success: all tests pass · Timeout: 180s
