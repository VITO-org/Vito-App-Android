---
schema_version: 1
doc_type: hu
title: 'HU-42: Alerta por frecuencia cardíaca fuera de rango'
created_at: '2026-08-21T23:24:25.387727Z'
updated_at: '2026-08-21T23:24:25.387727Z'
tags:
- hu-42
- alertas
- frecuencia-cardiaca
- taquicardia
- bradicardia
- detector
- engine
status: deuda-tecnica
links: []
vault_scope: local
fingerprint: 60891c9df2939059878da8d980565af64312cde88c177ff3e4849ebc1cabb6a7
external_id: SCRUM-91
source: jira
kind: story
assignee: null
external_url: https://vitoproyecto-1775921969007.atlassian.net/browse/SCRUM-91
synced_at: '2026-08-21T23:24:25Z'
---

# HU-42: Alerta por frecuencia cardíaca fuera de rango

## User Story

> **Como** sistema
> **Quiero** notificar cuando la frecuencia cardíaca del usuario supere o caiga por debajo de sus límites personalizados
> **Para** evaluar riesgo cardíaco de forma oportuna

## Acceptance Criteria

- [ ] CA-01: El sistema detecta FC > umbral superior (taquicardia) o FC < umbral inferior (bradicardia) del perfil del usuario.
- [ ] CA-02: Valores por defecto configurables: taquicardia >100 lpm, bradicardia <50 lpm.
- [ ] CA-03: La alerta distingue explícitamente entre taquicardia y bradicardia.
- [ ] CA-04: La alerta incluye la tendencia de los últimos 5 minutos (subiendo / bajando / estable).
- [ ] CA-05: No se generan alertas duplicadas si la condición persiste sin recuperación (máx. 1 alerta por episodio continuo).

## Tasks

- [ ] Implementar módulo de detección de FC con clasificación de taquicardia y bradicardia.
- [ ] Implementar cálculo de tendencia de los últimos 5 minutos.
- [ ] Implementar duplicación de alertas por episodio continuo.
- [ ] Habilitar configuración de umbrales por defecto desde el perfil del paciente.

## Definition of Done

- [ ] Módulo de detección FC implementado con cobertura de test ≥80%.
- [ ] Lógica de deduplicación de alertas verificada con escenarios de episodio continuo.
- [ ] Campo de tendencia calculado y visible en la notificación.
- [ ] Umbrales por defecto y personalizados configurables desde el perfil del paciente.
- [ ] Aprobación clínica de valores de referencia.

## Implementation Notes

- Estructura esperada: reutilizar la infraestructura del `AlertEngine` existente (`src/services/alerts/`), siguiendo el patrón ya implementado para SpO2 (HU-41) y presión arterial (HU-43): detector puro → entry point en engine → integración en HealthProvider → UI en AlertasScreen.
- El motor ya cuenta con mecanismo de dedup por episodio (reutilizable para CA-05) y escalación por timeout.

## Metadata

- **External ID:** `SCRUM-91`
- **Source:** jira
- **Kind:** story
- **Estado Jira:** Deuda Técnica
- **Prioridad:** Medium
- **Creado:** 2026-07-04
- **Última actualización:** 2026-08-20
