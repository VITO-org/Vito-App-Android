---
schema_version: 1
doc_type: decision
title: Pasos acumulativos se agregan con MAX, no con SUMA
created_at: '2026-10-05T23:21:43.915074Z'
updated_at: '2026-10-05T23:21:43.915074Z'
tags:
- pasos
- acumulativo
- agregacion
status: active
links:
- '[[2026-10-05_fix-pasos-acumulativos-que-se-inflan-con-cada-refresh]]'
vault_scope: local
fingerprint: 424c8a0b6e9dbe31dd1ffefa5f024564ff91c4b591ff38498716174c9194286b
reversible_within_days: 0
---

## Context

actividad_pasos en datos_reloj guarda el total acumulado del día al momento de la lectura (Health Connect COUNT_TOTAL). Cada refresh inserta una fila nueva con el total. Sumarlas infla (3470->10977). Alternativa rechazada: SUMA de lecturas (asumía incrementales). No cumple los 3 criterios ADR (fácil de revertir), por eso queda como decision, no ADR.

## Decision

Agregar contadores acumulativos diarios (pasos, y por extensión distancia/calorías si se usan) con ULTIMO/MAX por día, nunca con SUMA. Referencia: sleephours ya usaba MAX por día.

## Alternative Rejected



## Reason



