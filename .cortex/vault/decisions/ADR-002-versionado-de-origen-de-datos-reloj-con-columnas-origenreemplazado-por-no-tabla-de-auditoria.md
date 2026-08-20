---
schema_version: 1
doc_type: adr
title: Versionado de origen de datos_reloj con columnas origen/reemplazado_por (no
  tabla de auditoría)
created_at: '2026-08-08T14:20:49.299593Z'
updated_at: '2026-08-08T14:20:49.299593Z'
tags:
- hu-25
- scrum-79
- sincronizacion
- versionado
- datos-reloj
status: accepted
links:
- vault/specs/2026-08-08_hu-25-sincronizacion-de-datos-de-salud-scrum-79.md
vault_scope: local
fingerprint: cf8b76296a85176e9335f549c4f34fda2f39899f183fa5614b33f78cb5ab01b0
adr_number: 2
supersedes: []
superseded_by: null
alternatives_considered: []
acceptance_criteria_met: false
---

## Context

HU-25 requiere auditar la procedencia de cada registro de datos_reloj y registrar qué registro ganó un conflicto wearable vs manual (CA-02/CA-03). Alternativas: (a) tabla de auditoría normalizada (ej. registro_origen_historico) que permitiría historial completo por registro y múltiples reemplazos; (b) columnas denormalizadas en datos_reloj (origen + reemplazado_por self-FK).

## Decision

Se usan columnas en `datos_reloj`: `origen TEXT NOT NULL DEFAULT 'wearable'` y `reemplazado_por UUID REFERENCES datos_reloj(id) ON DELETE SET NULL`. Se rechaza la tabla de auditoría por sobrediseño: el único conflicto posible hoy es wearable vs manual (2 fuentes), el default 'wearable' cubre las filas históricas (única fuente implementada: Health Connect), y el contrato de lectura existente (getDatosReloj/Historial/Inicio/ML) no cambia porque ambas columnas son nullable. Si mañana hay N fuentes o historial de reemplazos, migrar a tabla de auditoría.

## Alternatives Considered

(none)

## Consequences


