# HU-63: Visualizar recomendaciones de salud personalizadas

**Release:** RELEASE 4
**Sprint:** Sprint 15 QA+Analisis (2 sep - 8 sep), Sprint 17 Desarrollo (16 sep - 22 sep)
**Épica:** Épica 6: Inteligencia Artificial Aplicada
**Desarrolladores:** Flor Gonzalez, Emma

---

## Goal

Visualizar recomendaciones de salud personalizadas

## User Story

> **Como** usuario
> **Quiero** recibir recomendaciones personalizadas según mis datos de actividad, peso y hábitos
> **Para** mejorar mi salud mediante sugerencias simples y aplicables

## Requirements

1. Visualizar recomendaciones de salud personalizadas.
2. La funcionalidad debe estar disponible para usuarios autenticados.
3. Los datos deben persistirse correctamente.
4. La UI debe seguir los lineamientos del theme definido.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.

## Acceptance Criteria

- [ ] CA-01: El dashboard muestra una sección llamada "Recomendaciones para vos" indicando que están personalizadas según la actividad y el peso del usuario.
- [ ] CA-02: Las recomendaciones se presentan en tarjetas horizontales con: etiqueta temporal (Hoy / Semana / Ahora), ícono representativo, mensaje breve y título destacado de recomendación.
- [ ] CA-03: El usuario puede desplazarse horizontalmente para ver más recomendaciones.
- [ ] CA-04: Existe una acción principal "Aplicar sugerencias".
- [ ] CA-05: Las recomendaciones se generan a partir de datos como: pasos, actividad física, peso, hábitos alimenticios y sueño.
- [ ] CA-06: Si no hay datos suficientes, se muestra el mensaje "Registrá más datos para recibir sugerencias personalizadas."

## Tasks

- [ ] Diseñar componentes de tarjetas horizontales de recomendaciones.
- [ ] Implementar lógica de generación de recomendaciones basada en datos del usuario.
- [ ] Implementar estado vacío por datos insuficientes.

## Definition of Done

- [ ] La sección de recomendaciones se visualiza correctamente dentro del dashboard.
- [ ] Las tarjetas se muestran en formato horizontal con scroll.
- [ ] El usuario puede ver recomendaciones simuladas o reales.
- [ ] El botón "Aplicar sugerencias" está disponible.
- [ ] El sistema diferencia recomendaciones diarias, semanales o inmediatas.
- [ ] La sección mantiene coherencia visual con el resto de la pantalla.
- [ ] Las pruebas validan recomendaciones con datos disponibles y mensaje de datos insuficientes.


## Files in Scope

*(A definir durante la implementación)*

## Tags

hu-hu-63, release-release-4, epic-épica-6, dev-flor-gonzalez, dev-emma
