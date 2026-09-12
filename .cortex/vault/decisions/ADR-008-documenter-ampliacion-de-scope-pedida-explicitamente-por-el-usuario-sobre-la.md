---
schema_version: 1
doc_type: adr
title: 'documenter: ampliación de scope PEDIDA EXPLÍCITAMENTE por el usuario sobre
  la...'
created_at: '2026-09-12T00:35:16.572879Z'
updated_at: '2026-09-12T00:35:16.572879Z'
tags:
- adr
status: proposed
links: []
vault_scope: local
fingerprint: 707155678cceb3a7c09fe2a36b3917d99f7094d0e1226796e228379469eb76ab
adr_number: 8
supersedes: []
superseded_by: null
alternatives_considered: []
acceptance_criteria_met: false
---

## Context

Checkpoint #1 note mentions decision signal(s): \bADR\b

## Decision

documenter: ampliación de scope PEDIDA EXPLÍCITAMENTE por el usuario sobre la spec (la spec de calibración excluía 'no tocar la pantalla de resultado'; el usuario pidió 2 cambios de UI después del deploy). (1) Sección Modelo actualizada: ahora explica el modelo calibrado — RF 80 árboles sobre 70k (Kaggle-Cardio), 10 factores, probabilidad cruda promedio de hojas, calibración Platt (sigmoid), score = prob calibrada, Exactitud 73.6% / AUC 0.80. (2) Botón '¿Qué significa este nivel?' en la tarjeta de resultado: abre un Modal con la referencia de los 3 niveles (Bajo 0-33, Medio 33-66, Alto 66-100 — espejo de mapearRiesgo/Edge Function) con emoji, color y significado. Verificado: tsc 0 errores, jest 211/211, APK release compilado + instalado (SHA256 54543f52d23130905d2498dbde30b9b74ba212a0b56d43071baef44f2c314094), MainActivity arranca sin crash. No requiere ADR (cambio cosmético/educativo, sin tocar lógica de bandas). El usuario debe cerrar con /cortex-documenter.

## Alternatives Considered

(none)

## Consequences



