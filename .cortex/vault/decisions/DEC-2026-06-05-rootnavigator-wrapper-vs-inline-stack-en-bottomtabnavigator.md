---
schema_version: 1
doc_type: decision
title: RootNavigator wrapper vs inline stack en BottomTabNavigator
created_at: '2026-06-05T22:28:39.599256Z'
updated_at: '2026-06-05T22:28:39.599256Z'
tags:
- architecture
- navigation
- react-navigation
status: active
links:
- src/navigation/RootNavigator.tsx
- src/navigation/BottomTabNavigator.tsx
- App.tsx
vault_scope: local
fingerprint: 9f49ea60f1de3d9435b57bbb241ce6548bfaf2bc336b1f616a1e0804a291d3ad
reversible_within_days: 0
---

## Context

La spec de HU-32 indicaba modificar BottomTabNavigator.tsx para agregar el stack navigator de DetalleSignoScreen dentro del mismo archivo. Durante la implementación se optó por crear un RootNavigator.tsx separado que envuelve el BottomTabNavigator existente como screen 'MainTabs' dentro de un NativeStack, agregando 'DetalleSigno' como segunda ruta.

## Decision

Se creó un archivo separado src/navigation/RootNavigator.tsx con createNativeStackNavigator conteniendo MainTabs (BottomTabNavigator) y DetalleSigno (DetalleSignoScreen). App.tsx importa RootNavigator en vez de BottomTabNavigator directamente.

## Alternative Rejected



## Reason



