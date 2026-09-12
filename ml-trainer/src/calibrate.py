"""
Calibración de probabilidades del RF de riesgo cardiovascular (HU-91, palanca 3).

Reentrena el RandomForest IDÉNTICO a train.py (misma seed, mismos hiperparámetros,
mismo split → mismo risk_model_trees.json determinístico) y agrega la calibración
con Platt (sigmoid) vía CalibratedClassifierCV(method='sigmoid', cv=5) — la curva
se aprende OUT-OF-FOLD (sin leakage) sobre los 5 folds del train set.

Exporta:
  models/risk_model_calibration.json → curva de calibración (grid) para la
  Edge Function: { method, grid: [101], values: [101], folds: [a,b]x5 }.
  grid = probabilidad cruda 0..1, values = probabilidad calibrada (promedio
  de las 5 sigmoides de los folds). La Edge Function interpola linealmente
  sobre el grid (sin replicar la sigmoide de sklearn).

Objetivo: el score 0-100 pasa a ser la PROBABILIDAD CALIBRADA. NO cambia
risk_model_trees.json (se verifica hash idéntico al deployado). Métricas
reportadas: Brier y ECE (expected calibration error) antes/después en test.
"""

import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import brier_score_loss
from sklearn.model_selection import train_test_split

INPUT_PATH = Path("data/features.csv")
MODEL_DIR = Path("models")
TREES_PATH = MODEL_DIR / "risk_model_trees.json"
OUT_PATH = MODEL_DIR / "risk_model_calibration.json"

FEATURE_ORDER = [
    "age", "sex_male", "bmi", "bp_sistolica", "bp_diastolica",
    "cholesterol_ord", "diabetes", "smoking", "alcohol", "active",
]
TARGET = "cardio"
RANDOM_STATE = 42
BASELINE_TREES_HASH = "f0d2f673e5c7bf0615b35739d5deee011b6b65286b48106ffe4055f60347c181"
N_GRID = 101  # 0.00, 0.01, ..., 1.00
N_FOLDS = 5


def ece(y_true, prob, n_bins=10):
    """Expected Calibration Error: |acc_bin - mean_prob_bin| ponderado."""
    bins = np.linspace(0, 1, n_bins + 1)
    total = 0.0
    for i in range(n_bins):
        lo, hi = bins[i], bins[i + 1]
        mask = (prob > lo) & (prob <= hi)
        if np.sum(mask) == 0:
            continue
        acc = y_true[mask].mean()
        conf = prob[mask].mean()
        total += np.sum(mask) * abs(acc - conf)
    return total / len(y_true)


def serializar_arboles(modelo):
    """Idéntico a train.py (json.dump default → mismo hash byte a byte)."""
    trees = []
    for est in modelo.estimators_:
        t = est.tree_
        trees.append({
            "feature": [int(f) for f in t.feature.tolist()],
            "threshold": [round(float(x), 6) for x in t.threshold.tolist()],
            "left": [int(c) for c in t.children_left.tolist()],
            "right": [int(c) for c in t.children_right.tolist()],
            "value": [
                [round(float(v0), 6), round(float(v1), 6)]
                for v0, v1 in t.value.reshape(-1, 2).tolist()
            ],
        })
    return json.dumps({"n_features": modelo.n_features_in_, "trees": trees})


def main():
    df = pd.read_csv(INPUT_PATH)
    X = df[FEATURE_ORDER].copy()
    y = df[TARGET].astype(int)
    assert list(X.columns) == FEATURE_ORDER

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    # ── RF idéntico al de producción ─────────────────────────────
    rf = RandomForestClassifier(
        n_estimators=80,
        max_depth=10,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)

    # Verificar hash byte-idéntico contra el trees.json deployado
    h = hashlib.sha256(serializar_arboles(rf).encode()).hexdigest()
    print(f"trees.json hash (reproducido): {h}")
    print(f"trees.json hash (repository):  {BASELINE_TREES_HASH}")
    if h != BASELINE_TREES_HASH:
        print("⚠️  EL HASH NO COINCIDE — el RF cambió (¿features/split/datos distintos?).")
        raise SystemExit(1)
    print("✅ RF reproducido byte-idéntico (mismo trees.json).")

    # ── Calibración Platt OOF (cv=5): curva aprendida sin leakage ──
    # Cada fold re-entrena el RF con los mismos hiperparámetros (clone) y
    # ajusta su sigmoide sobre las predicciones out-of-fold.
    calibrated = CalibratedClassifierCV(
        estimator=rf, method="sigmoid", cv=N_FOLDS
    ).fit(X_train, y_train)

    folds = []
    for cc in calibrated.calibrated_classifiers_:
        sig = cc.calibrators[0]  # _SigmoidCalibration (clase 0 / "no riesgo")
        folds.append({"a": float(sig.a_), "b": float(sig.b_)})
    print(f"\nSigmoide por fold (a, b):")
    for i, f in enumerate(folds):
        print(f"  fold {i}: a={f['a']:.5f}  b={f['b']:.5f}")
    a_mean = float(np.mean([f["a"] for f in folds]))
    b_mean = float(np.mean([f["b"] for f in folds]))
    print(f"  media: a={a_mean:.5f}  b={b_mean:.5f}")

    # ── Grid crudo → calibrado ────────────────────────────────
    # OJO convención sklearn: el sigmoid se entrena sobre la prob de la clase 0
    # (p0 = 1 - p_riesgo), con a<0 y b>0. Verificado empíricamente contra
    # predict_proba: p_cal_riesgo = 1 - sigmoid(a*p_cruda + b) (H2, err ≈ 0.008
    # = ruido de folds; H1 1-sigmoid(a*(1-p)+b) da err ≈ 0.48 → NO).
    grid = np.linspace(0, 1, N_GRID)
    values = np.mean(
        [1.0 - 1.0 / (1.0 + np.exp(-(f["a"] * grid + f["b"]))) for f in folds],
        axis=0,
    )

    # ── Métricas: Brier + ECE antes/después (test set) ───────────
    p_raw = rf.predict_proba(X_test)[:, 1]
    p_cal = calibrated.predict_proba(X_test)[:, 1]

    brier_raw = brier_score_loss(y_test, p_raw)
    brier_cal = brier_score_loss(y_test, p_cal)
    ece_raw = ece(y_test, p_raw)
    ece_cal = ece(y_test, p_cal)

    print("\n=== Calibración (test set, N=%d) ===" % len(y_test))
    print(f"Brier  crudo: {brier_raw:.4f}   calibrado: {brier_cal:.4f}   Δ {brier_cal - brier_raw:+.4f}")
    print(f"ECE    crudo: {ece_raw:.4f}   calibrado: {ece_cal:.4f}   Δ {ece_cal - ece_raw:+.4f}")
    for g in (0.2, 0.5, 0.8):
        print(f"  p_cruda {g:.2f} → p_calibrada {np.interp(g, grid, values):.4f}")

    # ── Exportar grid ────────────────────────────────────────────
    out = {
        "method": "platt_sigmoid_grid",
        "description": (
            "score 0-100 = probabilidad calibrada (Platt) * 100. "
            "La Edge Function interpola linealmente prob_cruda sobre 'grid' "
            "para obtener 'values'. Curva aprendida OOF (cv=5) sobre "
            "cardio_train Kaggle 70k."
        ),
        "grid": [round(float(g), 6) for g in grid],
        "values": [round(float(v), 6) for v in values],
        "folds": folds,
        "sigmoide_platt_media": {"a": round(a_mean, 6), "b": round(b_mean, 6)},
        "brier_raw": round(float(brier_raw), 4),
        "brier_cal": round(float(brier_cal), 4),
        "ece_raw": round(float(ece_raw), 4),
        "ece_cal": round(float(ece_cal), 4),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
    }
    with open(OUT_PATH, "w") as f:
        json.dump(out, f, indent=2)
    print(f"\nExportado → {OUT_PATH}")


if __name__ == "__main__":
    main()