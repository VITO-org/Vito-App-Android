---
id: HU-91
title: Predicción de Riesgo Cardiovascular con ML
épica: Épica 9: Inteligencia Artificial y Ciencia de Datos
sprint: S2
inicio: 03/06/2026
fin: 09/06/2026
release: Release 1
capa: IA
devs: Flor Galarza · Emma · Nico
estado: doing
---

# HU-91: Predicción de Riesgo Cardiovascular con ML

## Goal

Desarrollar un modelo de Machine Learning que prediga el riesgo (alto / medio / bajo) de que una persona desarrolle una enfermedad cardíaca en su vida, basado en signos vitales y datos clínicos. El modelo corre on-device en Android mediante TFLite.

## User Story

> **Como** sistema
> **Quiero** clasificar el riesgo cardiovascular de cada usuario en alto/medio/bajo
> **Para** que tanto el usuario como el profesional clínico puedan tomar acciones preventivas

## Requirements

1. Predicción de riesgo cardiovascular en 3 clases (alto / medio / bajo).
2. El modelo debe correr on-device (TFLite) sin depender de conexión a internet.
3. Integración con la app Android vía native module Kotlin.
4. El resultado debe mostrarse en el dashboard del usuario.

## Constraints

1. Compatibilidad con Android 14+ (API 34+).
2. La app debe mantener la arquitectura React Native + Native Modules.
3. Los datos sensibles deben manejarse de forma segura.
4. El modelo debe ser liviano para correr en dispositivo móvil.

## Acceptance Criteria

- [ ] CA-01: El modelo recibe como entrada datos del perfil del usuario (edad, sexo, colesterol, presión arterial, frecuencia cardíaca, diabetes, antecedentes familiares, fumador, obesidad, consumo de alcohol, horas de ejercicio, dieta, problemas cardíacos previos, uso de medicación, nivel de estrés, horas sedentarias, BMI, triglicéridos, días de actividad física, horas de sueño) y devuelve una clasificación de riesgo cardiovascular (alto/medio/bajo) con una probabilidad asociada.
- [ ] CA-02: El modelo alcanza al menos 75% de precisión en el conjunto de prueba.
- [ ] CA-03: La inferencia completa en dispositivo tarda menos de 500ms.
- [ ] CA-04: El modelo exportado a TFLite ocupa menos de 10MB.
- [ ] CA-05: Los resultados se muestran en una pantalla/card dentro de la app.
- [ ] CA-06: Los datos del smartwatch (presión arterial, FC, estrés, sueño, actividad física) y los datos del perfil (edad, sexo, colesterol, BMI, triglicéridos) se combinan como features para la predicción; ninguno es excluyente.
- [ ] CA-07: Las features opcionales del formulario (antecedentes familiares, diabetes, fumador, obesidad, alcohol, dieta, problemas previos, medicación) pueden faltar sin que el modelo falle — se imputan con valores por defecto.

## Tasks

- [x] Adquirir dataset de signos vitales para entrenamiento.
- [x] Crear estructura del proyecto ML (ml-trainer/).
- [ ] Realizar EDA y feature engineering.
- [ ] Etiquetar dataset con clases de riesgo (alto/medio/bajo).
- [ ] Entrenar modelo clasificador.
- [ ] Evaluar métricas (precisión, recall, F1).
- [ ] Exportar modelo a formato TFLite.
- [ ] Integrar TFLite en native module Kotlin.
- [ ] Crear bridge React Native para inferencia on-device.
- [ ] Mostrar resultado de riesgo en UI.

## Files in Scope

- `ml-trainer/` — Pipeline completo de entrenamiento
- `ml-trainer/data/heart_attack_prediction_dataset.csv` — Dataset
- `android/app/src/main/java/com/vito/healthconnect/nativeModule/RiskPredictor.kt` — Native inference
- `android/app/src/main/java/com/vito/healthconnect/nativeModule/VitoHealthModule.kt` — Bridge RN

## Definition of Done

- [ ] Dataset etiquetado y listo para entrenamiento.
- [ ] Modelo entrenado con métricas documentadas.
- [ ] Modelo exportado a TFLite.
- [ ] Inferencia on-device funcionando desde la app.
- [ ] Riesgo cardiovascular visible en dashboard.
- [ ] Tests unitarios del módulo de predicción.

## Tags

hu-hu-91, release-release-1, epic-épica-9, dev-flor-galarza, dev-emma, dev-nico
