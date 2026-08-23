---
schema_version: 1
doc_type: decision
title: Custom SVG chart con PanResponder vs librería externa de gráficos
created_at: '2026-06-05T22:28:44.849706Z'
updated_at: '2026-06-05T22:28:44.849706Z'
tags:
- architecture
- chart
- svg
- react-native-svg
status: active
links:
- src/components/LineChart.tsx
vault_scope: local
fingerprint: f3145225eb267f2bf5793c298e3238c8d8c9bd074c5aa884a7f7026940f6425a
reversible_within_days: 0
---

## Context

HU-32 requería un gráfico de línea interactivo con zoom/pan, 3 vistas, valores anormales destacados. Las alternativas eran: (A) custom chart con react-native-svg + PanResponder, (B) victory-native, (C) react-native-chart-kit. Se evaluaron según peso de bundle, compatibilidad con RN 0.76+ Bridgeless, y control visual del theme VITO.

## Decision

Se implementó LineChart.tsx como componente SVG custom usando react-native-svg para el renderizado y PanResponder nativo para gestos (pan horizontal + pinch zoom). Sin librerías externas de gráficos.

## Alternative Rejected



## Reason



