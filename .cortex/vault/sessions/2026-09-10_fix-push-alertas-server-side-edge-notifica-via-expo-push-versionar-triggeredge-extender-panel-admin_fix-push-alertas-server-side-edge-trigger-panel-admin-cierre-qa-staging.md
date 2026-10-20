---
schema_version: 1
doc_type: session
title: 'Fix push alertas server-side: edge + trigger + panel-admin (cierre QA staging)'
created_at: '2026-09-11T15:24:53.975806Z'
updated_at: '2026-09-11T15:24:53.975806Z'
tags:
- push
- edge-function
- expo
- quiet-hours
- panel-admin
- scrum-95
- staging-qa
status: auto-draft
links:
- 2026-09-10_fix-push-alertas-server-side-edge-notifica-via-expo-push-versionar-triggeredge-extender-panel-admin
- HU-BUG-PUSH-SERVER-01
vault_scope: local
fingerprint: 2f2807b2f6bba85143d8dcfaaf8d82ae33b8bebbc7076007974bab9abb0779c0
session_id: 2026-09-10_fix-push-alertas-server-side-edge-notifica-via-expo-push-versionar-triggeredge-extender-panel-admin
pr: null
branch: null
commit: null
cortex_telemetry: null
---

## Original Specification

Corregir el bug HU-BUG-PUSH-SERVER-01: las alertas generadas server-side (trigger + Edge Function evaluar-evento) deben disparar push en el dispositivo aunque la app esté cerrada, con filtro quiet-hours y delivery log, versionando trigger+edge en el repo y extendiendo panel-admin para QA.

## Changes Made

(none)

## Files Touched

(none)

## Key Decisions

(none)

## Next Steps

(none)

