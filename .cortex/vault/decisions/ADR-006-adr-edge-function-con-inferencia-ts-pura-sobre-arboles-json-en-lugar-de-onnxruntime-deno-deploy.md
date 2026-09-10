---
schema_version: 1
doc_type: adr
title: 'ADR: Edge Function con inferencia TS pura sobre árboles JSON en lugar de onnxruntime
  (Deno Deploy)'
created_at: '2026-09-10T20:57:10.317714Z'
updated_at: '2026-09-10T20:57:10.317714Z'
tags:
- edge-function
- deno
- runtime
- hu-91
- adr
- trees-json
status: accepted
links:
- vault/specs/2026-09-10_modulo-de-prediccion-de-riesgo-cardiovascular-con-ml-hu-91-evolucion-a-cloud-api.md
- vault/handoffs/2026-09-10_modulo-de-prediccion-de-riesgo-cardiovascular-con-ml-cloud-hu-91-v2-implementacion-completa-deploy-pendiente.md
vault_scope: local
fingerprint: 8712ad88f3094ed1a1febf9bbe01612e25d385d31fb9aa7cb1874d62a4f27517
adr_number: 6
supersedes: []
superseded_by: null
alternatives_considered: []
acceptance_criteria_met: false
---

## Context

La spec original (propuesta A confirmada) asumía ejecutar el modelo ONNX dentro de la Edge Function con onnxruntime (npm:onnxruntime-node). Durante implementación se detectó que onnxruntime-node usa bindings nativos (.node) que son poco confiables en Deno Deploy: problemas conocidos de compatibilidad de binarios nativos, cold starts penalizados y fallas intermitentes. Se necesitaba un runtime determinista y testable para servir el RandomForest (acc 0.7357/AUC 0.8008).

## Decision

El modelo se exporta además como risk_model_trees.json (3MB): los 80 árboles del RandomForest serializados (feature/threshold/left/right/value por nodo) y la Edge Function vota árbol por árbol en TypeScript puro (sin dependencias nativas ni WASM). La paridad se validó contra sklearn predict_proba con max abs diff 6.4e-08 sobre 20 filas reales. El ONNX (2.9MB) sigue generándose como artefacto canónico en ml-trainer/models/ pero NO viaja a la función; la prueba de que la función puede prescindir de onnxruntime elimina el riesgo de deploy.

## Alternatives Considered

(none)

## Consequences



