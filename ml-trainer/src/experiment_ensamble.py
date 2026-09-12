"""
Experimento de ensamble (HU-91): ¿vale la pena correr 3 modelos en paralelo?

Compara sobre el MISMO split de train.py:
  - RF (prod, 80 árboles, depth 10, leaf 5, balanced)
  - Regresión Logística (con estandarización)
  - Gradient Boosting (HistGradientBoosting — GBM nativo sklearn)
  - MLP chico (10→8→2, bonus)

y los ensambles:
  - Suave RF+LogReg+GBM (promedio de probabilidades)  ← candidato principal
  - Suave RF+LogReg+GBM+MLP (4 modelos, bonus)
  - Duro 2/3 (mayoría de clases)
  - Consenso 3/3 (la regla "los 3 dicen riesgo → riesgo" pedida por el usuario,
    para mostrar su costo en sensibilidad)

Métricas: accuracy, ROC-AUC, sensibilidad (recall clase 1) y especificidad
(recall clase 0). El corte de implementación se decide con estos números.
"""

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import (
    HistGradientBoostingClassifier,
    RandomForestClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler

INPUT_PATH = Path("data/features.csv")
FEATURE_ORDER = [
    "age", "sex_male", "bmi", "bp_sistolica", "bp_diastolica",
    "cholesterol_ord", "diabetes", "smoking", "alcohol", "active",
]
TARGET = "cardio"
RANDOM_STATE = 42
TEST_SIZE = 0.2


def reporte(nombre, y_test, prob, clases=None):
    """Métricas estandarizadas: acc, AUC, sens, espec. `clases` override (hard)."""
    if clases is None:
        clases = (prob >= 0.5).astype(int)
    acc = accuracy_score(y_test, clases)
    auc = roc_auc_score(y_test, prob) if not np.all(prob == prob[0]) else float("nan")
    sens = recall_score(y_test, clases, pos_label=1)
    espec = recall_score(y_test, clases, pos_label=0)
    return f"{nombre:<34} acc {acc:.4f}  auc {auc:.4f}  sens {sens:.4f}  espec {espec:.4f}"


def main():
    df = pd.read_csv(INPUT_PATH)
    X = df[FEATURE_ORDER].copy()
    y = df[TARGET].astype(int)
    assert list(X.columns) == FEATURE_ORDER

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )

    # ── Escalamiento solo para modelos lineales/red ────────────────
    scaler = StandardScaler().fit(X_train)
    Xtr_s = scaler.transform(X_train)
    Xte_s = scaler.transform(X_test)

    # ── Modelos ────────────────────────────────────────────────────
    rf = RandomForestClassifier(
        n_estimators=80, max_depth=10, min_samples_leaf=5,
        class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1,
    )
    rf.fit(X_train, y_train)

    logreg = LogisticRegression(
        class_weight="balanced", max_iter=2000, random_state=RANDOM_STATE,
    )
    logreg.fit(Xtr_s, y_train)

    # GBM con pesos balanceados (sample_weight, universal en sklearn)
    gbm = HistGradientBoostingClassifier(
        max_iter=250, learning_rate=0.1, max_leaf_nodes=8,
        l2_regularization=1e-4, random_state=RANDOM_STATE,
    )
    n1 = int((y_train == 1).sum())
    n0 = int((y_train == 0).sum())
    sw = np.where(y_train == 1, len(y_train) / (2 * n1), len(y_train) / (2 * n0))
    gbm.fit(X_train, y_train, sample_weight=sw)

    mlp = MLPClassifier(
        hidden_layer_sizes=(8,), activation="relu", max_iter=600,
        early_stopping=True, n_iter_no_change=15, random_state=RANDOM_STATE,
    )
    mlp.fit(Xtr_s, y_train)

    # ── Probabilidades sobre test ───────────────────────────────────
    p_rf = rf.predict_proba(X_test)[:, 1]
    p_lr = logreg.predict_proba(Xte_s)[:, 1]
    p_gbm = gbm.predict_proba(X_test)[:, 1]
    p_mlp = mlp.predict_proba(Xte_s)[:, 1]

    c_rf = rf.predict(X_test)
    c_lr = logreg.predict(Xte_s)
    c_gbm = gbm.predict(X_test)
    c_mlp = mlp.predict(Xte_s)

    print("=== Modelos individuales ===")
    print(reporte("RF solo (prod)", y_test, p_rf))
    print(reporte("Regresión Logística", y_test, p_lr))
    print(reporte("Gradient Boosting", y_test, p_gbm))
    print(reporte("MLP chico (bonus)", y_test, p_mlp))

    print("\n=== Ensambles ===")
    p_soft3 = (p_rf + p_lr + p_gbm) / 3.0
    print(reporte("Suave RF+LR+GBM (promedio)", y_test, p_soft3))

    p_soft4 = (p_rf + p_lr + p_gbm + p_mlp) / 4.0
    print(reporte("Suave RF+LR+GBM+MLP (4)", y_test, p_soft4))

    # Duro 2/3: mayoría de clases binarias de los 3
    c_sum3 = c_rf.astype(int) + c_lr.astype(int) + c_gbm.astype(int)
    c_duro23 = (c_sum3 >= 2).astype(int)
    print(reporte("Duro 2/3 (mayoría RF+LR+GBM)", y_test, p_soft3, clases=c_duro23))

    # Consenso 3/3: riesgo SOLO si los 3 dicen riesgo (pedido original)
    c_consenso33 = (c_sum3 >= 3).astype(int)
    print(reporte("Consenso 3/3 (los 3 dicen riesgo)", y_test, p_soft3, clases=c_consenso33))

    # ── Diagnóstico: ganancia neta del suave vs RF solo ────────────
    print("\n=== Diagnóstico ===")
    print(f"Ganancia AUC suave3 vs RF solo: {roc_auc_score(y_test, p_soft3) - roc_auc_score(y_test, p_rf):+.4f}")
    print(f"Ganancia acc  suave3 vs RF solo: {accuracy_score(y_test, (p_soft3 >= 0.5)) - accuracy_score(y_test, c_rf):+.4f}")
    print("(Ganancia >= +0.005 en AUC justifica el costo; <0 → el ensamble NO conviene)")


if __name__ == "__main__":
    main()