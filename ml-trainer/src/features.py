import pandas as pd
import numpy as np

INPUT_PATH = "data/dataset_labeled.csv"
OUTPUT_PATH = "data/features.csv"


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    features = df.copy()

    # Age groups
    features["age_group"] = pd.cut(
        features["age"],
        bins=[0, 30, 40, 50, 60, 120],
        labels=[0, 1, 2, 3, 4]
    ).astype(float)

    # Heart rate pressure product (RPP = HR * SBP / 100)
    if "thalach" in features and "trestbps" in features:
        features["rpp"] = features["thalach"] * features["trestbps"] / 100.0

    # Cholesterol ratio (chol / HDL) — fallback if HDL not available
    if "chol" in features and "fbs" in features:
        features["chol_fbs_ratio"] = features["chol"] / (features["fbs"] + 1)

    # Mean arterial pressure (MAP = DBP + 1/3 * (SBP - DBP))
    # Using trestbps as SBP estimate
    if "trestbps" in features:
        features["map_estimate"] = features["trestbps"] * 0.666 + 60.0

    # ST segment slope severity
    if "oldpeak" in features and "slope" in features:
        features["st_severity"] = features["oldpeak"] * features["slope"]

    # Max heart rate percentage (approx: 220 - age)
    if "thalach" in features and "age" in features:
        features["hr_percent"] = features["thalach"] / (220.0 - features["age"])

    # Exercise angina interaction
    if "exang" in features and "oldpeak" in features:
        features["angina_st_depression"] = features["exang"] * features["oldpeak"]

    # Simple risk interaction terms
    if all(c in features for c in ["age", "chol", "trestbps"]):
        features["age_chol_bp"] = (
            features["age"].rank(pct=True)
            * features["chol"].rank(pct=True)
            * features["trestbps"].rank(pct=True)
        )

    return features


def main():
    df = pd.read_csv(INPUT_PATH)
    df_feat = engineer_features(df)
    df_feat.to_csv(OUTPUT_PATH, index=False)
    print(f"Features engineered. Shape: {df_feat.shape}")
    print(f"Columns: {list(df_feat.columns)}")


if __name__ == "__main__":
    main()
