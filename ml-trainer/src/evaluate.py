import pandas as pd
import numpy as np
import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import os
from pathlib import Path

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
    roc_auc_score,
    precision_recall_fscore_support,
)

INPUT_PATH = "data/features.csv"
MODEL_DIR = "models"
REPORT_DIR = os.path.join(MODEL_DIR, "reports")
METADATA_PATH = os.path.join(MODEL_DIR, "metadata.json")

TARGET_COL = "riesgo"
FEATURE_DROP = [TARGET_COL, "id", "patient_id", "timestamp"]


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


def plot_feature_importance(model, feature_names: list[str], top_n: int = 15, path: str = None):
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
    os.makedirs(REPORT_DIR, exist_ok=True)

    df = pd.read_csv(INPUT_PATH)
    drop_cols = [c for c in FEATURE_DROP if c in df.columns]
    X = df.drop(columns=drop_cols)
    y = df[TARGET_COL]
    X = X.select_dtypes(include=[np.number]).fillna(0)

    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y_encoded
    )

    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=4,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)

    y_pred = rf.predict(X_test)

    report = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred)

    print("=== Reporte de Clasificación ===")
    print(classification_report(y_test, y_pred))

    # Matriz de confusión
    plot_confusion_matrix(y_test, y_pred, le.classes_.tolist(),
                          os.path.join(REPORT_DIR, "confusion_matrix.png"))

    # Feature importance
    plot_feature_importance(rf, X.columns.tolist(),
                            path=os.path.join(REPORT_DIR, "feature_importance.png"))

    # Cross-validation
    cv_scores = cross_val_score(rf, X_scaled, y_encoded, cv=5, scoring="accuracy")
    print(f"\nCross-validation (5-folds): mean={cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Guardar reporte como JSON
    report_path = os.path.join(REPORT_DIR, "evaluation_report.json")
    with open(report_path, "w") as f:
        json.dump({
            "classification_report": report,
            "confusion_matrix": cm.tolist(),
            "cv_mean_accuracy": round(float(cv_scores.mean()), 4),
            "cv_std_accuracy": round(float(cv_scores.std()), 4),
        }, f, indent=2)

    print(f"\nReportes guardados en {REPORT_DIR}/")


if __name__ == "__main__":
    main()
