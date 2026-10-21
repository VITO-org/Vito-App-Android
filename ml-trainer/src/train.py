import pandas as pd
import numpy as np
import joblib
import json
import os
import warnings
from pathlib import Path

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, confusion_matrix

import tensorflow as tf

warnings.filterwarnings("ignore")

INPUT_PATH = "data/features.csv"
MODEL_DIR = "models"
TFLITE_MODEL_PATH = os.path.join(MODEL_DIR, "risk_model.tflite")
LABELS_PATH = os.path.join(MODEL_DIR, "labels.json")
METADATA_PATH = os.path.join(MODEL_DIR, "metadata.json")

TARGET_COL = "riesgo"
FEATURE_DROP = [TARGET_COL, "id", "patient_id", "timestamp"]


def load_data(path: str) -> tuple[pd.DataFrame, pd.Series]:
    df = pd.read_csv(path)
    drop_cols = [c for c in FEATURE_DROP if c in df.columns]
    X = df.drop(columns=drop_cols)
    y = df[TARGET_COL]
    X = X.select_dtypes(include=[np.number]).fillna(0)
    return X, y


def train_model(X_train, y_train):
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=4,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)

    xgb = XGBClassifier(
        n_estimators=200,
        max_depth=8,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric="mlogloss",
        use_label_encoder=False,
    )
    xgb.fit(X_train, y_train)

    return rf, xgb


def convert_to_tflite(model, scaler: StandardScaler, feature_names: list[str], X_sample: np.ndarray):
    from tensorflow.keras import Sequential
    from tensorflow.keras.layers import Dense, InputLayer

    n_features = X_sample.shape[1]
    n_classes = len(np.unique(y_train))

    tf_model = Sequential([
        InputLayer(input_shape=(n_features,)),
        Dense(64, activation="relu"),
        Dense(32, activation="relu"),
        Dense(n_classes, activation="softmax"),
    ])
    tf_model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    tf_model.fit(
        X_sample, y_train_encoded,
        epochs=50,
        batch_size=32,
        validation_split=0.2,
        verbose=1,
    )

    converter = tf.lite.TFLiteConverter.from_keras_model(tf_model)
    tflite_model = converter.convert()

    with open(TFLITE_MODEL_PATH, "wb") as f:
        f.write(tflite_model)

    return tf_model


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)

    X, y = load_data(INPUT_PATH)
    feature_names = list(X.columns)
    n_features = X.shape[1]

    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test, y_train_encoded, y_test_encoded = train_test_split(
        X_scaled, y, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    rf_model, xgb_model = train_model(X_train, y_train)

    # Score RF
    rf_score = rf_model.score(X_test, y_test)
    xgb_score = xgb_model.score(X_test, y_test)
    print(f"RF Accuracy: {rf_score:.4f}")
    print(f"XGB Accuracy: {xgb_score:.4f}")

    y_pred_rf = rf_model.predict(X_test)
    print("\nRF Classification Report:")
    print(classification_report(y_test, y_pred_rf))

    # Convertir a TFLite
    convert_to_tflite(rf_model, scaler, feature_names, X_train)

    # Guardar metadata
    metadata = {
        "features": feature_names,
        "n_features": n_features,
        "classes": le.classes_.tolist(),
        "rf_accuracy": round(float(rf_score), 4),
        "xgb_accuracy": round(float(xgb_score), 4),
        "scaler_mean": scaler.mean_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    # Guardar labels
    with open(LABELS_PATH, "w") as f:
        json.dump({"classes": le.classes_.tolist(), "mapping": {
            str(i): c for i, c in enumerate(le.classes_)
        }}, f, indent=2)

    print(f"Modelo exportado a {TFLITE_MODEL_PATH}")
    print(f"Metadata guardada en {METADATA_PATH}")


if __name__ == "__main__":
    main()
