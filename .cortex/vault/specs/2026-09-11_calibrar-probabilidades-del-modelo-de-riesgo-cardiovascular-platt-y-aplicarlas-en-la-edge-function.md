---
schema_version: 1
doc_type: spec
title: Calibrar probabilidades del modelo de riesgo cardiovascular (Platt) y aplicarlas
  en la Edge Function
created_at: '2026-09-11T23:47:55.636890Z'
updated_at: '2026-09-11T23:47:55.636890Z'
tags:
- spec
- spec
- hu-91
- ml
- calibracion
- platt
- prediccion-riesgo
- edge-function
- vito-prediction
status: draft
links: []
vault_scope: local
fingerprint: bcdb02af7410a9ad5c7d0a600afab416fff85d18dece884faf49533f65c51dec
verification_hooks:
- name: tsc
  command: npx tsc --noEmit
  required: true
  success_criteria: exit code 0
  timeout_seconds: 120
- name: jest
  command: npx jest --passWithNoTests
  required: true
  success_criteria: exit code 0
  timeout_seconds: 120
goal: 'Calibrar las probabilidades del modelo de riesgo cardiovascular: hoy el score
  0-100 es la probabilidad cruda del RandomForest, que no está alineada con la probabilidad
  real de tener riesgo (sobrestima/subestima según el umbral). Entrenar el RF calibrado
  con Platt (sigmoid) en ml-trainer, exportar la curva de calibración a un JSON, y
  aplicar esa curva en la Edge Function prediccion-riesgo antes de calcular el score.
  Los umbrales 33/66 y la UI no cambian.'
files_in_scope:
- ml-trainer/src/train.py
- ml-trainer/models/risk_model_calibration.json
- supabase/functions/prediccion-riesgo/index.ts
constraints:
- No tocar el contrato de 10 features, la tabla datos_prediccion_riesgo, ni la pantalla
  de resultado (solo se recalibra el score del backend)
- El RandomForest base (80 árboles, depth 10, leaf 5, balanced, random_state 42) se
  mantiene idéntico — solo se agrega la calibración
- La curva de calibración viaja como JSON estático en la Edge Function (mismo patrón
  que risk_model_trees.json, sin runtime nativo)
- No cambiar los umbrales 33/66 ni el disclaimer educativo
acceptance_criteria:
- 'AC-01: ml-trainer/src/train.py entrena el RF y calibra sus probabilidades con método
  sigmoid (Platt), exportando ml-trainer/models/risk_model_calibration.json con la
  curva de calibración (grid de probabilidades crudas -> calibradas)'
- 'AC-02: supersede el curve export: la Edge Function prediccion-riesgo/index.ts aplica
  la curva de calibración a la probabilidad cruda del RF ANTES de calcular el score
  (score = prob_calibrada*100)'
- 'AC-03: Los umbrales 33/66 de riesgo bajo/medio/alto se mantienen (mapearRiesgo
  y la Edge Function no cambian su lógica de bandas)'
- 'AC-04: tsc --noEmit 0 errores en el proyecto completo (verification hook)'
- 'AC-05: jest: los 211 tests existentes siguen pasando (verification hook)'
- 'AC-06: Smoke test real contra staging: request de prueba a la Edge Function deplpied
  devuelve score consistente con la probabilidad calibrada (|score_esperado - score_devuelto|
  < 0.5)'
- 'AC-07: APK release compilado e instalado en el teléfono con los cambios (sin regresión
  en la pantalla de resultado)'
---

## Goal

Calibrar las probabilidades del modelo de riesgo cardiovascular: hoy el score 0-100 es la probabilidad cruda del RandomForest, que no está alineada con la probabilidad real de tener riesgo (sobrestima/subestima según el umbral). Entrenar el RF calibrado con Platt (sigmoid) en ml-trainer, exportar la curva de calibración a un JSON, y aplicar esa curva en la Edge Function prediccion-riesgo antes de calcular el score. Los umbrales 33/66 y la UI no cambian.

## Requirements

- REQ-01: train.py entrena el RF igual que hoy (80 árboles, depth 10, leaf 5, balanced, seed 42), pero hace fit con CalibratedClassifierCV(method='sigmoid') para obtener probabilidades calibradas sin leakage
- REQ-02: Exportar la curva de calibración como JSON: grid de N puntos (p.ej. 101, 0.00 a 1.00) con la probabilidad calibrada correspondiente, para que la Edge Function haga interpolación lineal exacta sin replicar la sigmoide de sklearn
- REQ-03: index.ts carga el JSON de calibración (import estático como trees.json) y mapea prob_cruda -> prob_calibrada ANTES de calcular score/factores
- REQ-04: El score se calcula sobre prob_calibrada: score = round(clamp(prob_calibrada)*1000)/10; riesgo = bandas 33/66 con prob_calibrada
- REQ-05: Los factores_mas_influyentes (SHAP-univariado) se calculan sobre la prob calibrada para mantener coherencia con el score mostrado
- REQ-06: Deploy de la Edge Function a vito-db-staging + smoke test curl con JWT minted de prueba
- REQ-07: Build release APK e instalación en el teléfono

## Files in Scope

- `ml-trainer/src/train.py`
- `ml-trainer/models/risk_model_calibration.json`
- `supabase/functions/prediccion-riesgo/index.ts`

## Constraints

- No tocar el contrato de 10 features, la tabla datos_prediccion_riesgo, ni la pantalla de resultado (solo se recalibra el score del backend)
- El RandomForest base (80 árboles, depth 10, leaf 5, balanced, random_state 42) se mantiene idéntico — solo se agrega la calibración
- La curva de calibración viaja como JSON estático en la Edge Function (mismo patrón que risk_model_trees.json, sin runtime nativo)
- No cambiar los umbrales 33/66 ni el disclaimer educativo

## Acceptance Criteria

- [ ] AC-01: ml-trainer/src/train.py entrena el RF y calibra sus probabilidades con método sigmoid (Platt), exportando ml-trainer/models/risk_model_calibration.json con la curva de calibración (grid de probabilidades crudas -> calibradas)
- [ ] AC-02: supersede el curve export: la Edge Function prediccion-riesgo/index.ts aplica la curva de calibración a la probabilidad cruda del RF ANTES de calcular el score (score = prob_calibrada*100)
- [ ] AC-03: Los umbrales 33/66 de riesgo bajo/medio/alto se mantienen (mapearRiesgo y la Edge Function no cambian su lógica de bandas)
- [ ] AC-04: tsc --noEmit 0 errores en el proyecto completo (verification hook)
- [ ] AC-05: jest: los 211 tests existentes siguen pasando (verification hook)
- [ ] AC-06: Smoke test real contra staging: request de prueba a la Edge Function deplpied devuelve score consistente con la probabilidad calibrada (|score_esperado - score_devuelto| < 0.5)
- [ ] AC-07: APK release compilado e instalado en el teléfono con los cambios (sin regresión en la pantalla de resultado)

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### tsc
```bash
npx tsc --noEmit
```

Success: exit code 0 · Timeout: 120s
### jest
```bash
npx jest --passWithNoTests
```

Success: exit code 0 · Timeout: 120s
