---
schema_version: 1
doc_type: decision
title: Selectores de opciones → Modal nativo (sin librerías de picker)
created_at: '2026-08-11T20:01:55.057235Z'
updated_at: '2026-08-11T20:01:55.057235Z'
tags:
- hu-25
- scrum-79
- decision
- ux
- react-native
status: active
links:
- '[[2026-08-11_hu-25-configuracion-selector-desplegable-de-intervalo-y-agrupacion-de-cards-de-sincronizacion-scrum-79]]'
vault_scope: local
fingerprint: 7db8aea04b4afdaa19e682454f9ffb59b2b5021c47a56962b5de531a61443589
reversible_within_days: 0
---

## Context

Al refinar el selector de intervalo de sincronización en ConfiguracionScreen (HU-25, SCRUM-79) se evaluó cómo presentar opciones discretas. La alternativa con librería (@react-native-picker/picker) requería setup nativo en el build (autolinking + posible pod/agradación de RN) para UNA lista corta en UNA pantalla. El repo ya tenía el patrón de Modal nativo funcionando en RegistrarSintomaScreen.

## Decision

Usar Modal de React Native (bottom-sheet con lista de opciones, overlay que cierra al tocar fuera, onRequestClose para back de Android, opción actual marcada con ✓). NO agregar @react-native-picker/picker ni ninguna dependencia nueva a package.json. Este patrón queda como convención del repo para selectores de opciones discretas.

## Alternative Rejected



## Reason



