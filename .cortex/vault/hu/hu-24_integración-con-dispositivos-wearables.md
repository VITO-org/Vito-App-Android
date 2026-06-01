# HU-24: Integración con dispositivos wearables

> **Estado:** 🟡 En desarrollo — Base completada (Health Connect SDK integrado). Pendiente flujo de conexión UI y source tagging.

**Release:** RELEASE 1
**Sprint:** Sprint 1 QA+Analisis (26 may - 2 jun), Sprint 3 Desarrollo (10 jun - 16 jun)
**Épica:** Épica 2: Registro e Integración de Datos
**Desarrolladores:** Flor Gonzalez, Emma, Cristian, Nico

---

## Goal

Integración con dispositivos wearables

## User Story

> **Como** usuario
> **Quiero** conectar dispositivos wearables
> **Para** capturar automáticamente mis signos vitales

## Requirements

1. Integración con dispositivos wearables.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [x] CA-01: El usuario puede conectar dispositivos compatibles desde la app.
  - *Health Connect SDK integrado como middleware. Cualquier wearable que sincronice con HC queda conectado automáticamente.*
- [x] CA-02: El sistema recibe datos biométricos del dispositivo de forma automática.
  - *HealthDataProvider.loadTodayData() lee 6 tipos de records (Steps, Distance, Calories, Sleep, HeartRate, Exercise).*
- [ ] CA-03: Cada dato almacena su origen (dispositivo o manual).
  - *Pendiente: extraer metadata.sourceDevice del Health Connect SDK y mostrarlo en el dashboard.*

## Tasks

- [x] Integrar Health Connect (Android).
  - *VitoHealthModule.kt + HealthDataProvider.kt implementados con 4 métodos bridge.*
- [ ] ~Integrar Apple Health (iOS).~ No aplica (proyecto Android).
- [ ] Diseñar el flujo de conexión de dispositivos.
  - *Pendiente: mejorar StatusBanner/PermissionButton para mostrar el estado de conexión del wearable.*

## Definition of Done

- [x] La conexión con Health Connect funciona en Android.
- [ ] Los datos biométricos se sincronizan automáticamente y quedan registrados con la fuente correcta.
- [ ] El flujo de conexión y desconexión de dispositivos es claro y sin pérdida de datos.
- [ ] Las pruebas cubren conexión exitosa, desconexión y recepción de datos reales o simulados.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-24, release-release-1, epic-épica-2, dev-flor-gonzalez, dev-emma, dev-cristian, dev-nico
