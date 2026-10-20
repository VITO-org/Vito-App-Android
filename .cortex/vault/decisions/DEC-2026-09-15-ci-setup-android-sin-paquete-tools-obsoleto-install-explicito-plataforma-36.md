---
schema_version: 1
doc_type: decision
title: CI setup-android sin paquete tools obsoleto + install explicito plataforma
  36
created_at: '2026-09-15T17:00:44.260981Z'
updated_at: '2026-09-15T17:00:44.260981Z'
tags:
- ci
- android
- setup-android
- SCRUM-191
status: active
links:
- https://github.com/VITO-org/Vito-App-Android/pull/28
- '[[2026-09-15_scrum-191-bug-hu-37-tap-alerta-dashboard-no-navega-a-detalle]]'
vault_scope: local
fingerprint: 00eef4c08db8331e66f52f44a38380dd186d2a1e04e432e017b5cd83fb778e0e
reversible_within_days: 0
---

## Context

CI - Jira Sync (PR to Dev) fallaba en android-build con setup-android@v3 y luego@v4: sdkmanager intentaba instalar paquete obsoleto tools -> Failed to find package tools, exit 1. Sugerencia Copilot (v3->v4) insuficiente porque el default packages='tools platform-tools' se mantiene en v4.

## Decision

Mantener android-actions/setup-android@v4 pero con packages:'' (saltea tools) + paso explicito sdkmanager --install platform-tools platforms;android-36 build-tools;35.0.0 (compileSdk 36 / buildTools 35.0.0). Alternativa descartada: eliminar el step y usar SDK preinstalado (como hace build-android-dev.yml) para no tocar mas el workflow en este PR.

## Alternative Rejected



## Reason



