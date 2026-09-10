"""
Evaluación del modelo de riesgo cardiovascular (HU-91, evolución cloud).

Lee data/features.csv (target cardio binario), carga el joblib de train.py si
existe (si no, re-entrena) y produce reportes + plots en models/reports/.
Umbrales de riesgo bajo/medio/alto: 33/66 sobre score 0-100 (mapearRiesgo()).
"""

import json
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import cross_val_score, train_test_split

INPUT_PATH = Path("data/features.csv")
MODEL_DIR = Path("models")
REPORT_DIR = MODEL_DIR / "reports"
JOBLIB_MODEL_PATH = MODEL_DIR / "risk_model.joblib"

TARGET = "cardio"

FEATURE_ORDER = [
    "age", "sex_male", "bmi", "bp_sistolica", "bp_diastolica",
    "cholesterol_ord", "diabetes", "smoking", "alcohol", "active",
]


def plot_confusion_matrix(y_true, y_pred, labels, path: str):
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=labels)
    fig, ax = plt.subplots(figsize=(6, 5))
    disp.plot(ax=ax, cmap="Blues", values_format="d")
    plt.title("Matriz de Confusión - Riesgo Cardiovascular")
    plt.tight_layout()
    plt.savefig(path)
    plt.close()
    print(f"Matriz guardada en {path}")


def plot_feature_importance(model, feature_names, top_n=15, path=None):
    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1][:top_n]

    plt.figure(figsize=(10, 6))
    plt.barh(range(top_n), importances[indices][::-1], align="center")
    plt.yticks(range(top_n), [feature_names[i] for i in indices[::-1]])
    plt.xlabel("Importancia")
    plt.title(f"Top {top_n} Features más importantes")
    plt.tight_layout()
    if path:
        plt.savefig(path)
        plt.close()
    print(f"Feature importance guardada en {path}")


def main():
    if not INPUT_PATH.exists():
        raise SystemExit(f"No existe {INPUT_PATH}. Corré primero label_data.py + features.py")

    REPORT_DIR.mkdir(exist_ok=True)

    df = pd.read_csv(INPUT_PATH)
    X = df[FEATURE_ORDER].copy()
    y = df[TARGET].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    if JOBLIB_MODEL_PATH.exists():
        rf = joblib.load(JOBLIB_MODEL_PATH)
        print(f"Modelo cargado desde {JOBLIB_MODEL_PATH}")
    else:
        rf = RandomForestClassifier(
            n_estimators=300,
            max_depth=14,
            min_samples_leaf=3,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )
        rf.fit(X_train, y_train)
        print("Modelo re-entrenado (no existía el joblib).")

    y_pred = rf.predict(X_test)
    y_prob = rf.predict_proba(X_test)[:, 1]

    print("=== Reporte de Clasificación (test) ===")
    print(classification_report(y_test, y_pred, digits=4))
    print(f"ROC-AUC: {roc_auc_score(y_test, y_prob):.4f}")

    plot_confusion_matrix(y_test, y_pred, [0, 1],
                          str(REPORT_DIR / "confusion_matrix.png"))
    plot_feature_importance(rf, FEATURE_ORDER,
                            path=str(REPORT_DIR / "feature_importance.png"))

    cv_scores = cross_val_score(rf, X, y, cv=5, scoring="accuracy")
    print(f"\nCross-validation (5-folds): mean={cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    report = classification_report(y_test, y_pred, output_dict=True)
    with open(REPORT_DIR / "evaluation_report.json", "w") as f:
        json.dump({
            "classification_report": report,
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
            "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
            "cv_mean_accuracy": round(float(cv_scores.mean()), 4),
            "cv_std_accuracy": round(float(cv_scores.std()), 4),
            "feature_importance": {
                f: round(float(imp), 4) for f, imp in
                zip(FEATURE_ORDER, rf.feature_importances_)
            },
        }, f, indent=2)
    print(f"\nReportes guardados en {REPORT_DIR}/")


if __name__ == "__main__":
    main()