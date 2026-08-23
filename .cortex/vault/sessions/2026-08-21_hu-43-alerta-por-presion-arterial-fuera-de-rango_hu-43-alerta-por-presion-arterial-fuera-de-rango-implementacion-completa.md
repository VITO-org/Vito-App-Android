---
schema_version: 1
doc_type: session
title: 'HU-43: Alerta por presión arterial fuera de rango — Implementación completa'
created_at: '2026-08-21T21:42:51.239916Z'
updated_at: '2026-08-21T21:42:51.239916Z'
tags:
- hu-43
- alertas
- presion-arterial
- hipertension
- hipotension
- detector
- engine
- contextos-especiales
status: auto-draft
links:
- '[[specs/2026-08-21_hu-43-alerta-por-presion-arterial-fuera-de-rango]]'
- '[[sessions/2026-08-20_hu-41-migracion-completa-a-nuevo-schema-supabase-alertas-dispositivos-notificaciones]]'
vault_scope: local
fingerprint: 78e5aaea19b1cbf595439e03fe7f1be67c32565a0745701e035392585f12db81
session_id: 2026-08-21_hu-43-alerta-por-presion-arterial-fuera-de-rango
pr: null
branch: null
commit: null
cortex_telemetry: null
---

## Original Specification

Implementar detección de presión arterial fuera de rango con alertas diferenciadas hipertensión/hipotension, alerta combinada (CA-05), contextos especiales (CA-04), y defaults OMS.

## Changes Made

- Tipos BP agregados en types.ts: BpThresholds (8 campos), BpEvaluationInput, BpDetectionResult, BpSingleResult, BpContextoEspecial, BpContextoOverrides. AlertType extendido con 'hipertension' y 'hipotension'.
- Detector BP en detector.ts: evaluateBp() evalúa sistólica y diastólicamente independiente, retorna BpDetectionResult con isCombined para alerta combinada. resolveBpThresholds() mergea overrides de contexto. classifySingleBp() y evaluateSingleBp() como helpers internos.
- buildBpAlertRecord() produce registros con titulo/mensaje/datos jsonb. resolveBpAlertType() determina si es hipertension o hipotension basado en dirección del exceso.
- Engine: evaluateBpReading() nuevo entry point en AlertEngine. Config extendido con bpThresholds y bpContextoOverrides. Resolución de episodios: si ambos valores vuelven a rango normal, marca alerta como leída.
- HealthProvider: llama evaluateBpReading() en cada sync cycle cuando bloodPressureSystolic y bloodPressureDiastolic están disponibles en HealthSummary.
- AlertasScreen: función alertIcon() retorna emoji por tipo (🫁 hipoxia, ⚠️ hipertension, ⬇️ hipotension).
- models.ts: TipoAlerta extendido. AlertaDatos con campos BP: bp_sistolica, bp_diastolica, umbral_sist, umbral_diast, is_combined, contexto.

## Files Touched

- `src/services/alerts/types.ts`
- `src/services/alerts/detector.ts`
- `src/services/alerts/engine.ts`
- `src/services/alerts/index.ts`
- `src/services/supabase/models.ts`
- `src/context/HealthProvider.tsx`
- `src/screens/AlertasScreen.tsx`
- `__tests__/alerts.test.ts`

## Key Decisions

- Fast Track: Se reutilizó el AlertEngine existente (no crear clase separada). La tabla alerta acepta nuevos valores de tipo por ser varchar(50), no enum.
- Defaults OMS: sistólica 90-120, diastólica 60-80; hipertensión ≥140/≥90; hipotensión <90/<60. Se usan cuando no hay baseline_clinico.
- Contextos especiales: post_medicacion baja sistolicaLowWarning a 85, reposo_nocturno baja a 80. Overrides mergeados via spread operator.
- Alerta combinada (CA-05): cuando ambos valores fuera de rango, severidad = max(sistólica, diastólica), titulo incluye '(combinada)'.
- api.ts y vitals.ts no requirieron cambios: CRUD existente soporta varchar tipo, vitals.ts ya tiene los rangos BP definidos.

## Next Steps

- [ ] Los archivos están en filesystem pero sin commit git — hacer commit y push para merge a rama principal.
- [ ] La migración DB de HU-41 debe ejecutarse en Supabase real antes de que las alertas BP persistan correctamente.
- [ ] Tests de integración con Supabase real (no mocked) para verificar CRUD completo de alertas BP.
- [ ] UI futura: configuración de contextos especiales por el usuario (toggle post-medicación, reposo nocturno) en pantalla de perfil.

