---
schema_version: 1
doc_type: adr
title: Dónde persiste la configuración de sincronización (perfil_usuario vs tabla
  de settings)
created_at: '2026-08-08T14:20:46.526099Z'
updated_at: '2026-08-08T14:20:46.526099Z'
tags:
- hu-25
- scrum-79
- sincronizacion
- perfil-usuario
status: accepted
links:
- vault/specs/2026-08-08_hu-25-sincronizacion-de-datos-de-salud-scrum-79.md
- vault/hu/hu-92_diseno-modelo-datos-ml.md
vault_scope: local
fingerprint: 5b23393b136ad104a7caf22abb6db6bddeecddb8929decf43794c1af348e9c61
adr_number: 1
supersedes: []
superseded_by: null
alternatives_considered: []
acceptance_criteria_met: false
---

## Context

La spec R1 de HU-25 indicaba persistir el intervalo de sincronización en `datos_clinicos_config.intervalo_sync_min`. Sin embargo, la tabla `datos_clinicos_config` fue renombrada a `datos_reloj` en HU-92 (vault/hu/hu-92_diseno-modelo-datos-ml.md) y está prohibida en el repo: no existe tal tabla en el schema actual y el código que la usaba (`updateClinicalConfig`, `upsertDatosClinicosConfig`, `DatosClinicosConfig`) es código muerto pre-HU-92. Alternativa considerada: crear una tabla genérica de settings (clave-valor).

## Decision

El intervalo de sincronización vive en `perfil_usuario.intervalo_sync_min` (INTEGER NULL), default 10 min en la app con clamp mínimo de 60s. Se rechaza la tabla de settings genérica por sobrediseño: hay una sola config de sync y una sola fila de perfil por usuario; columna denormalizada + getProfile() ya existente = costo mínimo. La migración agrega la columna nullable para no romper lecturas previas a la migración.

## Alternatives Considered

(none)

## Consequences


