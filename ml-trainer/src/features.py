"""
Feature engineering para el pipeline de VITO (HU-91, evolución cloud).

Lee data/dataset_labeled.csv (salida de label_data.py) y genera
data/features.csv con EXACTAMENTE las 10 features del contrato (FEATURE_ORDER
de src/services/prediccionRiesgo.ts) + target binario `cardio`.

CONTRATO DE ORDEN: el modelo ONNX NO expone nombres, solo índices. Índice 0 =
age, índice 9 = active, etc. No se agregan features derivadas fuera del
contrato: la app RN solo puede enviar lo que el contrato define.
"""

from pathlib import Path

import numpy as np
import pandas as pd

INPUT_PATH = Path("data/dataset_labeled.csv")
OUTPUT_PATH = Path("data/features.csv")

# Mismo orden que label_data.py / src/services/prediccionRiesgo.ts
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


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Valida integridad y reordena según el contrato."""
    missing = [c for c in FEATURE_ORDER if c not in df.columns]
    if missing:
        raise SystemExit(f"Faltan features del contrato: {missing}")

    out = df[FEATURE_ORDER + [TARGET]].copy()
    return out


def main():
    if not INPUT_PATH.exists():
        raise SystemExit(f"No existe {INPUT_PATH}. Corré primero label_data.py")

    df = pd.read_csv(INPUT_PATH)
    features = engineer_features(df)

    nulls = features.isnull().sum()
    null_cols = nulls[nulls > 0]
    if not null_cols.empty:
        print("⚠️ Columnas con nulls:", null_cols.to_dict())

    features.to_csv(OUTPUT_PATH, index=False)
    print(f"Features → {OUTPUT_PATH} ({features.shape[0]} filas, {features.shape[1]} col)")
    print("Columnas:", list(features.columns))
    print("Target:", features[TARGET].value_counts().to_dict())


if __name__ == "__main__":
    main()