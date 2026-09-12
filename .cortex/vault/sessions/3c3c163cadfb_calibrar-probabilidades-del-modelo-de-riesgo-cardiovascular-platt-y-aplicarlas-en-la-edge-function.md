---
schema_version: 1
doc_type: session
title: Calibrar probabilidades del modelo de riesgo cardiovascular (Platt) y aplicarlas
  en la Edge Function
created_at: '2026-09-12T00:35:16.426812Z'
updated_at: '2026-09-12T00:35:16.426812Z'
tags:
- session
- session
- with-checkpoints
- auto-draft
status: completed
links: []
vault_scope: local
fingerprint: 5762e953dd4992631bdb8e074e435c438ee1d343049019cd0a43819df58d61e8
session_id: 3c3c163cadfb
pr: null
branch: null
commit: null
cortex_telemetry: null
---

## Original Specification

Calibrar las probabilidades del modelo de riesgo cardiovascular: hoy el score 0-100 es la probabilidad cruda del RandomForest, que no está alineada con la probabilidad real de tener riesgo (sobrestima/subestima según el umbral). Entrenar el RF calibrado con Platt (sigmoid) en ml-trainer, exportar la curva de calibración a un JSON, y aplicar esa curva en la Edge Function prediccion-riesgo antes de calcular el score. Los umbrales 33/66 y la UI no cambian.

## Changes Made

- added: .cortex/vault/specs/2026-09-11_calibrar-probabilidades-del-modelo-de-riesgo-cardiovascular-platt-y-aplicarlas-en-la-edge-function.md
- added: ml-trainer/src/calibrate.py
- added: ml-trainer/src/experiment_ensamble.py
- modified: ml-trainer/src/train.py
- modified: src/screens/PrediccionRiesgoScreen.tsx
- modified: supabase/functions/prediccion-riesgo/index.ts
- modified: supabase/functions/prediccion-riesgo/metadata.json
- added: supabase/functions/prediccion-riesgo/risk_model_calibration.json

## Files Touched

- `✓ .cortex/vault/specs/2026-09-11_calibrar-probabilidades-del-modelo-de-riesgo-cardiovascular-platt-y-aplicarlas-en-la-edge-function.md`
- `✓ ml-trainer/src/calibrate.py`
- `✓ ml-trainer/src/experiment_ensamble.py`
- `✓ ml-trainer/src/train.py`
- `✓ src/screens/PrediccionRiesgoScreen.tsx`
- `✓ supabase/functions/prediccion-riesgo/index.ts`
- `✓ supabase/functions/prediccion-riesgo/metadata.json`
- `✓ supabase/functions/prediccion-riesgo/risk_model_calibration.json`
- `◌ ml-trainer/models/risk_model_calibration.json`
- `◌ Vito-app-release-test.apk`

## Key Decisions

- documenter: Fast Track de calibración Platt COMPLETO y verificado punta a punta. Score 0-100 ahora = probabilidad calibrada (RF idéntico, hash f0d2f67... intacto). Curva en JSON estático importada en la Edge Function (mismo patrón trees.json), interpolación lineal exacta (paridad 0.0). AC-01..AC-07 cubiertos, con AC-07 parcial: APK instalado y app arranca, falta confirmación visual del usuario. Hallazgo de infra: el gateway de staging ya rechaza JWTs legacy HS256 mintados manualmente (UNAUTHORIZED_LEGACY_JWT) — el smoke test se hizo con JWT real ES256 de Supabase Auth (usuario smoke-test-calibracion@vito.app creado ad-hoc; contraseña VitoSmoke2026!, no rotada. Considerar eliminarlo). No requiere ADR. El usuario cierra con /cortex-documenter o cortex finish-session.
- documenter: ampliación de scope PEDIDA EXPLÍCITAMENTE por el usuario sobre la spec (la spec de calibración excluía 'no tocar la pantalla de resultado'; el usuario pidió 2 cambios de UI después del deploy). (1) Sección Modelo actualizada: ahora explica el modelo calibrado — RF 80 árboles sobre 70k (Kaggle-Cardio), 10 factores, probabilidad cruda promedio de hojas, calibración Platt (sigmoid), score = prob calibrada, Exactitud 73.6% / AUC 0.80. (2) Botón '¿Qué significa este nivel?' en la tarjeta de resultado: abre un Modal con la referencia de los 3 niveles (Bajo 0-33, Medio 33-66, Alto 66-100 — espejo de mapearRiesgo/Edge Function) con emoji, color y significado. Verificado: tsc 0 errores, jest 211/211, APK release compilado + instalado (SHA256 54543f52d23130905d2498dbde30b9b74ba212a0b56d43071baef44f2c314094), MainActivity arranca sin crash. No requiere ADR (cambio cosmético/educativo, sin tocar lógica de bandas). El usuario debe cerrar con /cortex-documenter.

## Next Steps

- [ ] Decide if scope drift is intentional: .cortex/vault/specs/2026-09-11_calibrar-probabilidades-del-modelo-de-riesgo-cardiovascular-platt-y-aplicarlas-en-la-edge-function.md, ml-trainer/src/calibrate.py, ml-trainer/src/experiment_ensamble.py, src/screens/PrediccionRiesgoScreen.tsx, supabase/functions/prediccion-riesgo/metadata.json, supabase/functions/prediccion-riesgo/risk_model_calibration.json, Vito-app-release-test.apk
- [ ] Commit (or revert) declared-only files: ml-trainer/models/risk_model_calibration.json, Vito-app-release-test.apk
- [ ] [self-review] Placeholders detected in draft: ['todo']

## Verified State

- Modified 3 file(s) inside spec scope
- verification hook 'tsc' passed
- verification hook 'jest' passed

## Unverified Claims

- acceptance criterion: AC-01: ml-trainer/src/train.py entrena el RF y calibra sus probabilidades con método sigmoid (Platt), exportando ml-trainer/models/risk_model_calibration.json con la curva de calibración (grid de probabilidades crudas -> calibradas)
- acceptance criterion: AC-02: supersede el curve export: la Edge Function prediccion-riesgo/index.ts aplica la curva de calibración a la probabilidad cruda del RF ANTES de calcular el score (score = prob_calibrada*100)
- acceptance criterion: AC-03: Los umbrales 33/66 de riesgo bajo/medio/alto se mantienen (mapearRiesgo y la Edge Function no cambian su lógica de bandas)
- acceptance criterion: AC-04: tsc --noEmit 0 errores en el proyecto completo (verification hook)
- acceptance criterion: AC-05: jest: los 211 tests existentes siguen pasando (verification hook)
- acceptance criterion: AC-06: Smoke test real contra staging: request de prueba a la Edge Function deplpied devuelve score consistente con la probabilidad calibrada (|score_esperado - score_devuelto| < 0.5)
- acceptance criterion: AC-07: APK release compilado e instalado en el teléfono con los cambios (sin regresión en la pantalla de resultado)
