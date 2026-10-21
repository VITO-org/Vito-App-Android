---
schema_version: 1
doc_type: hu
title: 'SCRUM-86: HU-34 Visualizar sugerencias de Vititto'
created_at: '2026-09-07T22:35:33.030657Z'
updated_at: '2026-09-07T22:35:33.030657Z'
tags:
- hu
- jira
- story
status: backlog
links: []
vault_scope: local
fingerprint: e35eb9d3fe12bcc15977b27ed16f2d2728d3735e9044164f5138807792759e78
external_id: SCRUM-86
source: jira
kind: story
assignee: Emmanuel Molina
external_url: https://vitoproyecto-1775921969007.atlassian.net/browse/SCRUM-86
synced_at: '2026-09-07T22:35:33.020540Z'
---

## Description

Como usuario, quiero ver sugerencias de salud personalizadas en mi dashboard, para saber qué acciones puedo tomar para mejorar o mantener mi estado de salud.

Criterios de aceptación

- CA-01: Las sugerencias se muestran en el dashboard debajo de la sección de signos vitales.
- CA-02: Se presentan ordenadas por nivel de importancia, priorizando las relacionadas con signos vitales fuera de rango.
- CA-03: Cada sugerencia muestra un ícono representativo, un título corto y una etiqueta de prioridad (Alta / Media / Baja).
- CA-04: Al tocar una sugerencia se muestra su descripción detallada, el motivo y acciones concretas recomendadas.
- CA-05: El usuario puede marcar una sugerencia como "Vista" o "Hecha".
- CA-06: Las sugerencias se actualizan al menos una vez por día o ante cambios relevantes en los datos del usuario.
- CA-07: Si no hay sugerencias activas se muestra el mensaje "Todo en orden, seguí así".
Tareas

- Diseñar componentes de tarjetas de sugerencias con ordenamiento por prioridad.
- Implementar modal o pantalla de detalle de sugerencia.
- Implementar acciones "Vista" y "Hecha".
- Implementar lógica de actualización diaria de sugerencias.
Definición de done

- Las sugerencias se muestran siempre después de los signos vitales.
- El ordenamiento por prioridad es correcto y coherente con los datos del usuario.
- El detalle de cada sugerencia es accesible y comprensible.
- Las acciones "Vista" y "Hecha" actualizan el estado correctamente.
- El mensaje de estado positivo se muestra cuando no hay sugerencias activas.

## Acceptance Criteria

- [ ] CA-01: Las sugerencias se muestran en el dashboard debajo de la sección de signos vitales.
- [ ] CA-02: Se presentan ordenadas por nivel de importancia, priorizando las relacionadas con signos vitales fuera de rango.
- [ ] CA-03: Cada sugerencia muestra un ícono representativo, un título corto y una etiqueta de prioridad (Alta / Media / Baja).
- [ ] CA-04: Al tocar una sugerencia se muestra su descripción detallada, el motivo y acciones concretas recomendadas.
- [ ] CA-05: El usuario puede marcar una sugerencia como "Vista" o "Hecha".
- [ ] CA-06: Las sugerencias se actualizan al menos una vez por día o ante cambios relevantes en los datos del usuario.
- [ ] CA-07: Si no hay sugerencias activas se muestra el mensaje "Todo en orden, seguí así".
- [ ] Diseñar componentes de tarjetas de sugerencias con ordenamiento por prioridad.
- [ ] Implementar modal o pantalla de detalle de sugerencia.
- [ ] Implementar acciones "Vista" y "Hecha".
- [ ] Implementar lógica de actualización diaria de sugerencias.
- [ ] Las sugerencias se muestran siempre después de los signos vitales.
- [ ] El ordenamiento por prioridad es correcto y coherente con los datos del usuario.
- [ ] El detalle de cada sugerencia es accesible y comprensible.
- [ ] Las acciones "Vista" y "Hecha" actualizan el estado correctamente.
- [ ] El mensaje de estado positivo se muestra cuando no hay sugerencias activas.

## Metadata

- **External ID:** `SCRUM-86`
- **Source:** jira
- **Kind:** story
- **Assignee:** Emmanuel Molina- **External URL:** https://vitoproyecto-1775921969007.atlassian.net/browse/SCRUM-86- **Last sync:** 2026-09-07 22:35:33.020540+00:00