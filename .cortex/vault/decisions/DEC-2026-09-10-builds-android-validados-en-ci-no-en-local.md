---
schema_version: 1
doc_type: decision
title: Builds Android validados en CI, no en local
created_at: '2026-09-10T02:49:08.970745Z'
updated_at: '2026-09-10T02:49:08.970745Z'
tags:
- decision
- ci
- android
- build
status: active
links:
- 2026-09-08_hu-51-completar-push-notifications-deep-link-horario-silencioso-log-de-delivery
vault_scope: local
fingerprint: 412d77395e8f6a9b6e88e60b77f3b8e912d8ddf15426dd77e9ee7e8a4f0cf7f6
reversible_within_days: 0
---

## Context

Durante HU-51 el usuario decidió explícitamente no compilar Android en local (gradle lento, entorno WSL) y delegar los builds al workflow build-android-dev.yml (assembleRelease con debug keystore, artifact VitoHealth-Preview). Esto deja el hook assembleDebug de las specs sin correr en local.

## Decision

Los builds Android se validan en CI (GitHub Actions), no en local. Los agents no deben correr ./gradlew en la máquina del usuario salvo pedido explícito; el hook de build se considera cumplido con el artifact del CI en verde sobre el push correspondiente.

## Alternative Rejected



## Reason



