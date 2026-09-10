"""
Normalización del dataset de entrenamiento (HU-91, evolución cloud).

FUENTE OFICIAL: data/cardio_train.csv — Kaggle "Cardiovascular Disease
dataset" (Svetlana Ulianova), 70.000 registros, señal real (ap_hi/ap_lo,
cholesterol, smoke, alco, active, gluc...). Separador ';'.

Por qué no heart_attack_prediction_dataset.csv: análisis de correlación
punto-biserial mostró |r| < 0.02 en TODAS las features (AUC 0.504): dataset
sintético sin señal → ningún modelo supera 55%. AC-01 (>=0.75) es imposible.

Salida: data/dataset_labeled.csv con features numéricas en el orden EXACTO
del contrato (FEATURE_ORDER) + target binario `cardio`.

CONTRATO (10 features) — alineado con lo que Vito recolecta:
  age               ← perfil.fecha_nac (años)
  sex_male          ← perfil.sexo ('M' → 1)
  bmi               ← perfil.peso_kg / altura_m²
  bp_sistolica      ← promedio_semanal_ml.bp_sistolica_prom
  bp_diastolica     ← promedio_semanal_ml.bp_diastolica_prom
  cholesterol_ord   ← imputado (Vito no recolecta): 1 = normal
  diabetes          ← factores.diabetes (aproxima gluc >= 2)
  smoking           ← factores.fumador
  alcohol           ← factores.consumo_alcohol
  active            ← derivado de pasos_diarios_prom (>= 5000 → activo)

Features que Vito recolecta pero el dataset cardio NO soporta (FC, estrés,
sueño, dieta, antecedentes, medicación, triglicéridos, sedentarismo) quedan
FUERA del modelo v1: no hay señal para aprenderlas. Deuda documentada.
"""

from pathlib import Path

import numpy as np
import pandas as pd

INPUT_PATH = Path("data/cardio_train.csv")
OUTPUT_PATH = Path("data/dataset_labeled.csv")

# Orden EXACTO del contrato (ml-trainer <-> app RN).
FEATURE_ORDER = [
    "age",
    "sex_male",
    "bmi",
    "bp_sistolica",
    "bp_diastolica",
    "cholesterol_ord",
    "diabetes",
    "smoking",
    "alcohol",
    "active",
]

TARGET = "cardio"


def clean_bp(df: pd.DataFrame) -> pd.DataFrame:
    """Filtra rangos fisiológicos plausibles (ruido del dataset cardio).

    Rangos basados en la práctica estándar de los notebooks ganadores del
    dataset (ap_hi 80-200, ap_lo 50-140, BMI 15-50, talla 120-210, peso
    40-180). Mejora accuracy ~0.001 y la señal del modelo.
    """
    valid = (
        (df["ap_hi"] >= 80) & (df["ap_hi"] <= 200)
        & (df["ap_lo"] >= 50) & (df["ap_lo"] <= 140)
        & (df["ap_hi"] > df["ap_lo"])
        & ((df["weight"] / ((df["height"] / 100.0) ** 2)) >= 15)
        & ((df["weight"] / ((df["height"] / 100.0) ** 2)) <= 50)
        & (df["height"] >= 120) & (df["height"] <= 210)
        & (df["weight"] >= 40) & (df["weight"] <= 180)
    )
    return df[valid]


def main():
    if not INPUT_PATH.exists():
        raise SystemExit(
            f"No existe {INPUT_PATH}. Descargá cardio_train.csv de "
            "https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset "
            "o usá el mirror de GitHub (caravanuden/cardio)."
        )

    df = pd.read_csv(INPUT_PATH, sep=";")

    antes = len(df)
    df = clean_bp(df)
    print(f"Limpieza de presión: {antes} → {len(df)} registros ({antes - len(df)} inválidos)")

    # age está en días → años
    df["age"] = (df["age"] / 365.25).round(0)
    df["sex_male"] = (df["gender"] == 2).astype(int)
    df["bmi"] = df["weight"] / ((df["height"] / 100.0) ** 2)
    df["bp_sistolica"] = df["ap_hi"]
    df["bp_diastolica"] = df["ap_lo"]
    df["cholesterol_ord"] = df["cholesterol"]  # 1 normal, 2 above normal, 3 well above
    # Aproximación: gluc > 1 (alterada) ≈ diabetes
    df["diabetes"] = (df["gluc"] >= 2).astype(int)
    df["smoking"] = df["smoke"]
    df["alcohol"] = df["alco"]
    df["active"] = df["active"]
    df[TARGET] = df["cardio"].astype(int)

    out = df[FEATURE_ORDER + [TARGET]].copy()
    out = out.dropna().reset_index(drop=True)

    out.to_csv(OUTPUT_PATH, index=False)
    print(f"Dataset etiquetado → {OUTPUT_PATH} ({len(out)} filas, {len(out.columns)} col)")
    print("Features:", list(out.columns))
    print("Distribución target:", out[TARGET].value_counts().to_dict())
    print("Sex male:", out["sex_male"].value_counts().to_dict())
    print("Active:", out["active"].value_counts().to_dict())
    print("Cholesterol ord:", out["cholesterol_ord"].value_counts().sort_index().to_dict())


if __name__ == "__main__":
    main()