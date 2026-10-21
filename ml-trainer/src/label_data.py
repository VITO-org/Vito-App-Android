import pandas as pd
import numpy as np

INPUT_PATH = "data/dataset.csv"
OUTPUT_PATH = "data/dataset_labeled.csv"

RISK_COLUMNS = [
    "age", "sex", "cp", "trestbps", "chol", "fbs",
    "restecg", "thalach", "exang", "oldpeak", "slope",
    "ca", "thal"
]


def label_risk(row: pd.Series) -> str:
    score = 0.0

    # Edad
    if "age" in row:
        a = row["age"]
        if a >= 60:
            score += 3
        elif a >= 50:
            score += 2
        elif a >= 40:
            score += 1

    # Presión arterial en reposo
    if "trestbps" in row:
        bp = row["trestbps"]
        if bp >= 180:
            score += 3
        elif bp >= 140:
            score += 2
        elif bp >= 130:
            score += 1

    # Colesterol
    if "chol" in row:
        c = row["chol"]
        if c >= 240:
            score += 3
        elif c >= 200:
            score += 2

    # Frecuencia cardíaca máxima
    if "thalach" in row:
        hr = row["thalach"]
        if hr < 100:
            score += 2
        elif hr < 120:
            score += 1

    # ST depression (oldpeak)
    if "oldpeak" in row:
        op = row["oldpeak"]
        if op >= 2.0:
            score += 2
        elif op >= 1.0:
            score += 1

    # Número de vasos principales (ca)
    if "ca" in row:
        ca_val = row["ca"]
        if ca_val >= 2:
            score += 3
        elif ca_val == 1:
            score += 1

    # Talasemia (thal)
    if "thal" in row:
        t = row["thal"]
        if t in (3, 7, "fixed_defect"):
            score += 3
        elif t in (2, 6, "reversible_defect"):
            score += 2

    # Sexo (1 = masculino)
    if "sex" in row and row["sex"] == 1:
        score += 1

    if score >= 10:
        return "alto"
    elif score >= 5:
        return "medio"
    return "bajo"


def main():
    df = pd.read_csv(INPUT_PATH)
    df["riesgo"] = df.apply(label_risk, axis=1)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"Etiquetado completado. {len(df)} registros.")
    print(df["riesgo"].value_counts())


if __name__ == "__main__":
    main()
