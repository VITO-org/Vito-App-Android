# HU-42: Alerta por frecuencia cardíaca fuera de rango

**Release:** R2
**Sprint:** S9
**Épica:** Épica 4: Sistema de Alertas Inteligentes
**Desarrolladores:** Flor Galarza, Emma

---

## Goal

Alerta por frecuencia cardíaca fuera de rango

## User Story

> **Como** sistema
> **Quiero** notificar cuando la frecuencia cardíaca del usuario supere o caiga por debajo de sus límites personalizados
> **Para** evaluar riesgo cardíaco de forma oportuna

## Requirements

1. Alerta por frecuencia cardíaca fuera de rango.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El sistema detecta FC \> umbral superior (taquicardia) o FC \< umbral inferior (bradicardia) del perfil del usuario.
- [ ] CA-02: Valores por defecto configurables: taquicardia \>100 lpm, bradicardia \<50 lpm.
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


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-42, release-release-2, epic-épica-4, dev-flor-galarza, dev-emma
