---
id: HU-92
title: Diseño de modelo de datos orientado a ML
épica: Épica 9: Inteligencia Artificial y Ciencia de Datos
sprint: S2
inicio: 03/06/2026
fin: 09/06/2026
release: Release 1
capa: Back / IA
devs: Flor Galarza · Nico
estado: done
---

# HU-92: Diseño de modelo de datos orientado a ML

**Goal:** Estructurar la base de datos en Supabase para almacenar los datos del smartwatch, los factores de riesgo del usuario y las predicciones del modelo ML, de forma que el pipeline de Python pueda consumirlos como features.

## User Story

> **Como** sistema
> **Quiero** tener una base de datos con tablas orientadas a ML
> **Para** que el pipeline de entrenamiento y predicción pueda consumir datos estructurados

## Cambios realizados en la BD

### Tablas modificadas

| Tabla | Cambio |
|-------|--------|
| `datos_clinicos_config` | Renombrada a `datos_reloj`. Se sacaron `peso_kg`, `altura_cm` (pasaron a `perfil_usuario`). Se agregaron `nivel_estres`, `actividad_pasos`, `horas_sueno`. |
| `perfil_usuario` | Se agregaron `peso_kg DECIMAL(5,2)` y `altura_cm DECIMAL(5,2)`. |

### Tablas eliminadas

| Tabla | Motivo |
|-------|--------|
| `signo_vital` | Reemplazada por `datos_reloj` (lecturas cada 30s) + `promedio_semanal_ml` (agregación semanal). |
| Enums `fuente_dato`, `tipo_metrica` | Ya no se usan. |

### Tablas nuevas

| Tabla | Propósito |
|-------|-----------|
| `factores_riesgo_cardiaco` | Formulario opcional con antecedentes, diabetes, fumador, dieta, etc. |
| `promedio_semanal_ml` | Promedios semanales de smartwatch calculados por el pipeline Python. |
| `prediccion_riesgo` | Resultados del modelo: riesgo, score, factores más influyentes. |

## Arquitectura de datos

```
perfil_usuario (edad, sexo, peso, altura)
      │
      ├── datos_reloj (cada 30s: PA, FC, SpO2, estrés, pasos, sueño)
      │         │
      │         ▼ pipeline Python ──► promedio_semanal_ml (features semanales)
      │
      └── factores_riesgo_cardiaco (formulario opcional)
                │
                ▼
         modelo TFLite ──► prediccion_riesgo (resultado)
```

## Acceptance Criteria

- [x] CA-01: La tabla `datos_reloj` almacena lecturas del smartwatch cada 30 segundos con las columnas definidas.
- [x] CA-02: La tabla `promedio_semanal_ml` almacena promedios semanales calculados por el pipeline Python.
- [x] CA-03: La tabla `factores_riesgo_cardiaco` guarda los datos del formulario opcional del usuario.
- [x] CA-04: La tabla `prediccion_riesgo` guarda los resultados del modelo con score y factores influyentes.
- [x] CA-05: `perfil_usuario` incluye peso_kg y altura_cm; `datos_reloj` no los incluye.
- [x] CA-06: La tabla `signo_vital` fue eliminada (reemplazada por `datos_reloj` + `promedio_semanal_ml`).

## Tags

hu-hu-92, release-release-1, epic-épica-9, dev-flor-galarza, dev-nico
