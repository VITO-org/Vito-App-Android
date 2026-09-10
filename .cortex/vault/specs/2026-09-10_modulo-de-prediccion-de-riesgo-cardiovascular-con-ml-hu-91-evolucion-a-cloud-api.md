---
schema_version: 1
doc_type: spec
title: Modulo de prediccion de riesgo cardiovascular con ML (HU-91 evolucion a cloud
  API)
created_at: '2026-09-10T19:53:28.758732Z'
updated_at: '2026-09-10T19:53:28.758732Z'
tags:
- spec
- hu-91
- ml
- edge-function
- onnx
- vito-prediction
- supabase
- prediccion-riesgo
status: draft
links: []
vault_scope: local
fingerprint: 9d7a15fcaec198690d2b01781855a87040ef1f3531cb12afff5e09d53bca5f36
verification_hooks:
- name: typescript
  command: npx tsc --noEmit
  required: true
  success_criteria: exit code 0
  timeout_seconds: 180
- name: jest
  command: npx jest
  required: true
  success_criteria: exit code 0
  timeout_seconds: 300
- name: train-model
  command: .ml-trainer-venv/bin/python ml-trainer/src/train.py
  required: true
  success_criteria: exit code 0 y genera ml-trainer/models/risk_model.onnx con accuracy
    >= 0.75
  timeout_seconds: 600
goal: 'Llevar a producción el módulo de predicción de riesgo cardiovascular que quedó
  a medio camino en HU-91: corregir el pipeline ml-trainer (hoy desalineado con su
  propio dataset), entrenar un modelo sklearn, exportarlo a ONNX y servirlo como API
  gratuita vía Supabase Edge Function (Deno). En la app, agregar el botón "Evaluar
  riesgo cardiovascular" en Perfil que recopila los datos del usuario (factores_riesgo_cardiaco
  + promedio_semanal_ml + perfil), llama a la Edge Function y vuelca el resultado
  en la tabla prediccion_riesgo (ya existente), mostrando riesgo bajo/medio/alto con
  disclaimer educativo.'
files_in_scope:
- ml-trainer/src/label_data.py
- ml-trainer/src/features.py
- ml-trainer/src/train.py
- ml-trainer/src/evaluate.py
- ml-trainer/requirements.txt
- ml-trainer/models/risk_model.onnx
- ml-trainer/models/metadata.json
- supabase/functions/prediccion-riesgo/index.ts
- supabase/functions/prediccion-riesgo/deno.json
- src/services/supabase/api.ts
- src/services/supabase/models.ts
- src/screens/PerfilScreen.tsx
- src/navigation/RootNavigator.tsx
- __tests__/prediccionRiesgo.test.ts
constraints:
- 'CON-01: NO se agregan dependencias nuevas a la app RN: el fetch a la Edge Function
  usa fetch nativo + anon key existente; los tipos vienen de modelos.ts ya existentes
  (PrediccionRiesgo).'
- 'CON-02: El schema de Supabase NO se modifica: las 3 tablas ML (factores_riesgo_cardiaco,
  promedio_semanal_ml, prediccion_riesgo) ya existen en prod; solo se inserta/lee.'
- 'CON-03: El modelo y la Edge Function se desarrollan y verifican localmente; el
  deploy efectivo a Supabase (proyecto dev 2do, y luego prod) lo ejecuta el usuario
  con supabase CLI — yo no tengo credenciales. La spec entrega código listo para deploy
  + instrucciones.'
- 'CON-04: Python 3.14 del sistema puede no tener wheels para TF/xgboost/skl2onnx:
  usar venv con Python 3.11/3.12 (pyenv/homebrew) si fuese necesario. NO esforzarse
  en instalar TensorFlow: el export es ONNX vía skl2onnx, sin TF.'
- 'CON-05: El dataset es sintético (Kaggle ''Heart Attack Prediction Dataset''): sus
  predicciones NO son evidencia clínica; el disclaimer educativo es obligatorio y
  el resultado debe tratarse como informativo.'
- 'CON-06: La rama de trabajo es vito-prediction (ya creada desde dev c9ceb0f). NO
  tocar main/dev directamente.'
- 'CON-07: HU-91 del vault queda obsoleta en su arquitectura (TFLite on-device) →
  el documenter al cierre debe anotar la evolución a cloud API en la nota de sesión/ADR.'
- 'CON-08: modelos/ y data/*.csv del pipeline se versionan solo si no son sensibles:
  el dataset sintético es público (Kaggle) así que puede quedar; el .onnx final SÍ
  va al repo (lo necesita la Edge Function); metadata.json documenta features y accuracy.'
acceptance_criteria:
- 'AC-01: python3 ml-trainer/src/train.py (venv con deps instaladas) corre sin errores,
  genera ml-trainer/models/risk_model.onnx (< 10MB) + metadata.json, y reporta accuracy
  >= 0.75 en test set (consistente con los 85-92% reportados por los repos de referencia).'
- 'AC-02: label_data.py/features.py/train.py leen el dataset real de 25 columnas sin
  KeyError; se eliminó toda referencia a columnas UCI inexistentes; Blood Pressure
  se parsea a sistólica/diastólica.'
- 'AC-03: La Edge Function responde 200 con {riesgo, score 0-100, modelo_version,
  factores_mas_influyentes} ante JWT válido, y 401 ante JWT inválido/ausente. El ONNX
  cargado en el deploy pesa < 10MB y el cold start es aceptable (< 5s).'
- 'AC-04: El resultado se persiste en prediccion_riesgo respetando el schema exacto
  (riesgo IN bajo/medio/alto, score 0-100, modelo_version VARCHAR(20), factores_mas_influyentes
  JSONB, datos_entrada VARCHAR(64)) — sin migraciones nuevas en prod.'
- 'AC-05: PerfilScreen muestra el botón ''Evaluar riesgo cardiovascular'': con datos
  completos muestra el resultado navegando por la rama de navegación; con datos faltantes
  imputa defaults y lo documenta en la UI, sin crashear (CA-07 herencia HU-91: imputación
  por defecto).'
- 'AC-06: El resultado en UI incluye SIEMPRE el disclaimer educativo (no es diagnóstico).
  Usa los mismos estilos/colores warning del sistema de alertas.'
- 'AC-07: npx tsc --noEmit da 0 errores y npx jest todo verde (tests nuevos del servicio
  de features incluidos).'
- 'AC-08: push de la rama vito-prediction con los cambios; el deploy de la Edge Function
  queda documentado (pasos: supabase link + supabase functions deploy prediccion-riesgo)
  aunque el deploy efectivo lo haga el usuario cuando tenga el 2do proyecto dev creado.'
---

## Goal

Llevar a producción el módulo de predicción de riesgo cardiovascular que quedó a medio camino en HU-91: corregir el pipeline ml-trainer (hoy desalineado con su propio dataset), entrenar un modelo sklearn, exportarlo a ONNX y servirlo como API gratuita vía Supabase Edge Function (Deno). En la app, agregar el botón "Evaluar riesgo cardiovascular" en Perfil que recopila los datos del usuario (factores_riesgo_cardiaco + promedio_semanal_ml + perfil), llama a la Edge Function y vuelca el resultado en la tabla prediccion_riesgo (ya existente), mostrando riesgo bajo/medio/alto con disclaimer educativo.

## Requirements

- REQ-01: Corregir el pipeline ml-trainer para que lea el dataset real data/heart_attack_prediction_dataset.csv (8,763 filas, 25 columnas, target binario Heart Attack Risk). Los scripts actuales (label_data.py, features.py, train.py) referencian columnas del UCI Cleveland (cp, trestbps, thalach, oldpeak, ca, thal) que no existen en este dataset: deben alinearse a las columnas reales (Age, Sex, Cholesterol, Blood Pressure '158/88', Heart Rate, Diabetes, Family History, Smoking, Obesity, Alcohol Consumption, Exercise Hours Per Week, Diet, Previous Heart Problems, Medication Use, Stress Level, Sedentary Hours Per Day, Income, BMI, Triglycerides, Physical Activity Days Per Week, Sleep Hours Per Day, Country, Continent, Hemisphere).
- REQ-02: Definir el mapeo de features entre lo que Vito recolecta y las columnas del dataset de entrenamiento: Blood Pressure (string) → bp_sistolica/bp_diastolica del promedio_semanal_ml; Heart Rate → frec_cardiaca_prom; Diabetes/Family History/Smoking/Obesity/Alcohol/Diet/Previous Heart Problems/Medication → factores_riesgo_cardiaco; Exercise Hours → actividad/pasos; Sleep Hours → horas_sueno_prom; BMI → perfil (peso/altura). Las columnas sin equivalente (Income, Country, Continent, Hemisphere, Triglycerides) se dropean o imputan con media, documentando la decisión en metadata.
- REQ-03: Entrenar modelo de clasificación con sklearn (RandomForest + LogReg como baseline) sobre el target binario Heart Attack Risk, con train/test split estratificado 80/20, y derivar el riesgo de 3 niveles (bajo/medio/alto) que exige el schema prediccion_riesgo a partir de la probabilidad (p.ej. bandas 0-33/33-66/66-100 sobre score 0-100).
- REQ-04: Exportar el modelo a ONNX (skl2onnx) en ml-trainer/models/risk_model.onnx + metadata.json con features, classes, accuracy y scaler params, reemplazando el export TFLite que hacía train.py (arquitectura HU-91 era on-device; ahora es cloud API).
- REQ-05: Implementar Edge Function Supabase supabase/functions/prediccion-riesgo/index.ts en Deno: recibe features JSON, valida el JWT del usuario (verificar JWT_SECRET y claim sub), ejecuta el modelo ONNX (onnxruntime deno), mapea score/riesgo 0-100, hace UPSERT en prediccion_riesgo (id_usuario, riesgo, score, modelo_version, factores_mas_influyentes, datos_entrada), y devuelve {riesgo, score, modelo_version, factores_mas_influyentes}.
- REQ-06: Integrar la app: botón 'Evaluar riesgo cardiovascular' en PerfilScreen que (a) junta factores_riesgo_cardiaco + promedio_semanal_ml (o últimos datos) + perfil, (b) arma el payload de features con imputación de defaults cuando faltan, (c) llama a la Edge Function vía fetch con anon key, (d) guarda/lee el resultado y navega a una pantalla de resultado mostrando riesgo bajo/medio/alto con score, factores más influyentes y disclaimer educativo 'evaluación educativa, no diagnóstico'.
- REQ-07: Agregar tests del servicio de features/imputación (función pura armable a mano) y mantener gates: tsc 0 errores y jest en verde.

## Files in Scope

- `ml-trainer/src/label_data.py`
- `ml-trainer/src/features.py`
- `ml-trainer/src/train.py`
- `ml-trainer/src/evaluate.py`
- `ml-trainer/requirements.txt`
- `ml-trainer/models/risk_model.onnx`
- `ml-trainer/models/metadata.json`
- `supabase/functions/prediccion-riesgo/index.ts`
- `supabase/functions/prediccion-riesgo/deno.json`
- `src/services/supabase/api.ts`
- `src/services/supabase/models.ts`
- `src/screens/PerfilScreen.tsx`
- `src/navigation/RootNavigator.tsx`
- `__tests__/prediccionRiesgo.test.ts`

## Constraints

- CON-01: NO se agregan dependencias nuevas a la app RN: el fetch a la Edge Function usa fetch nativo + anon key existente; los tipos vienen de modelos.ts ya existentes (PrediccionRiesgo).
- CON-02: El schema de Supabase NO se modifica: las 3 tablas ML (factores_riesgo_cardiaco, promedio_semanal_ml, prediccion_riesgo) ya existen en prod; solo se inserta/lee.
- CON-03: El modelo y la Edge Function se desarrollan y verifican localmente; el deploy efectivo a Supabase (proyecto dev 2do, y luego prod) lo ejecuta el usuario con supabase CLI — yo no tengo credenciales. La spec entrega código listo para deploy + instrucciones.
- CON-04: Python 3.14 del sistema puede no tener wheels para TF/xgboost/skl2onnx: usar venv con Python 3.11/3.12 (pyenv/homebrew) si fuese necesario. NO esforzarse en instalar TensorFlow: el export es ONNX vía skl2onnx, sin TF.
- CON-05: El dataset es sintético (Kaggle 'Heart Attack Prediction Dataset'): sus predicciones NO son evidencia clínica; el disclaimer educativo es obligatorio y el resultado debe tratarse como informativo.
- CON-06: La rama de trabajo es vito-prediction (ya creada desde dev c9ceb0f). NO tocar main/dev directamente.
- CON-07: HU-91 del vault queda obsoleta en su arquitectura (TFLite on-device) → el documenter al cierre debe anotar la evolución a cloud API en la nota de sesión/ADR.
- CON-08: modelos/ y data/*.csv del pipeline se versionan solo si no son sensibles: el dataset sintético es público (Kaggle) así que puede quedar; el .onnx final SÍ va al repo (lo necesita la Edge Function); metadata.json documenta features y accuracy.

## Acceptance Criteria

- [ ] AC-01: python3 ml-trainer/src/train.py (venv con deps instaladas) corre sin errores, genera ml-trainer/models/risk_model.onnx (< 10MB) + metadata.json, y reporta accuracy >= 0.75 en test set (consistente con los 85-92% reportados por los repos de referencia).
- [ ] AC-02: label_data.py/features.py/train.py leen el dataset real de 25 columnas sin KeyError; se eliminó toda referencia a columnas UCI inexistentes; Blood Pressure se parsea a sistólica/diastólica.
- [ ] AC-03: La Edge Function responde 200 con {riesgo, score 0-100, modelo_version, factores_mas_influyentes} ante JWT válido, y 401 ante JWT inválido/ausente. El ONNX cargado en el deploy pesa < 10MB y el cold start es aceptable (< 5s).
- [ ] AC-04: El resultado se persiste en prediccion_riesgo respetando el schema exacto (riesgo IN bajo/medio/alto, score 0-100, modelo_version VARCHAR(20), factores_mas_influyentes JSONB, datos_entrada VARCHAR(64)) — sin migraciones nuevas en prod.
- [ ] AC-05: PerfilScreen muestra el botón 'Evaluar riesgo cardiovascular': con datos completos muestra el resultado navegando por la rama de navegación; con datos faltantes imputa defaults y lo documenta en la UI, sin crashear (CA-07 herencia HU-91: imputación por defecto).
- [ ] AC-06: El resultado en UI incluye SIEMPRE el disclaimer educativo (no es diagnóstico). Usa los mismos estilos/colores warning del sistema de alertas.
- [ ] AC-07: npx tsc --noEmit da 0 errores y npx jest todo verde (tests nuevos del servicio de features incluidos).
- [ ] AC-08: push de la rama vito-prediction con los cambios; el deploy de la Edge Function queda documentado (pasos: supabase link + supabase functions deploy prediccion-riesgo) aunque el deploy efectivo lo haga el usuario cuando tenga el 2do proyecto dev creado.

## Verification Hooks

Commands that objectively prove the work is done. Run by
`cortex finish-session` (Pluggable Middle, Phase 01).

### typescript
```bash
npx tsc --noEmit
```

Success: exit code 0 · Timeout: 180s
### jest
```bash
npx jest
```

Success: exit code 0 · Timeout: 300s
### train-model
```bash
.ml-trainer-venv/bin/python ml-trainer/src/train.py
```

Success: exit code 0 y genera ml-trainer/models/risk_model.onnx con accuracy >= 0.75 · Timeout: 600s
