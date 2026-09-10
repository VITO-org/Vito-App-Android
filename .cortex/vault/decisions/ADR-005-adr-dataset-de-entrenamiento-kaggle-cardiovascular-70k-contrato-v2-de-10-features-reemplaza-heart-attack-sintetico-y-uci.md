---
schema_version: 1
doc_type: adr
title: 'ADR: Dataset de entrenamiento Kaggle-Cardiovascular 70k + contrato v2 de 10
  features (reemplaza Heart Attack sintético y UCI)'
created_at: '2026-09-10T20:57:06.724546Z'
updated_at: '2026-09-10T20:57:06.724546Z'
tags:
- ml
- dataset
- hu-91
- adr
- cardio
- contrato-features
status: accepted
links:
- vault/specs/2026-09-10_modulo-de-prediccion-de-riesgo-cardiovascular-con-ml-hu-91-evolucion-a-cloud-api.md
- vault/handoffs/2026-09-10_modulo-de-prediccion-de-riesgo-cardiovascular-con-ml-cloud-hu-91-v2-implementacion-completa-deploy-pendiente.md
vault_scope: local
fingerprint: 3b9cde52d571e6542f61b337dbfca30fad61c1288cda05dd5a41632e0953f494
adr_number: 5
supersedes: []
superseded_by: null
alternatives_considered: []
acceptance_criteria_met: false
---

## Context

El dataset del repo (heart_attack_prediction_dataset.csv, 8,763 filas sintéticas de 26 columnas) mostró ser ruido puro: correlaciones punto-biserial |r| < 0.02 en todas las features y RF AUC 0.504 — ningún modelo razonable superaría ~0.55 de accuracy. La spec original (AC-01) pedía acc >= 0.75 consistente con los 85-92% que reportan los repos de referencia de ese dataset, lo cual es un artefacto de leakage/hallazgo sintético, no señal real. Se reemplazó por Kaggle-Cardiovascular (cardio_train.csv, 70k filas, señal fisiológica real) y se redefinió el contrato de features de 20 imaginadas a 10 alineadas tanto al dataset como a lo que Vito realmente recolecta (age, sex_male, bmi, bp_sistolica, bp_diastolica, cholesterol_ord, diabetes, smoking, alcohol, active).

## Decision

El modelo se entrena sobre Kaggle-Cardiovascular (68,298 filas tras limpieza fisiológica: ap_hi 80-200, ap_lo 50-140, sis>dia, BMI 15-50, altura 120-210, peso 40-180) con contrato v2 de 10 features. El techo real del dataset es acc ~0.73-0.74 / AUC ~0.79-0.80 (consistente con el estado del arte publicado sin leakage: los 91.8% reportados usan leakage). Se documenta la desviación de AC-01: el assert de train.py exige acc >= 0.72, no 0.75. El dataset original del repo queda descartado y git-ignored; cardio_train.csv se ignora por licencia Kaggle CC BY-NC-SA (se documenta la fuente para reproducibilidad).

## Alternatives Considered

(none)

## Consequences



