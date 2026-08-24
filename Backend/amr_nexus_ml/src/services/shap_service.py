
import shap
import joblib
import pandas as pd
import os
from datetime import datetime

MODEL_PATH = os.getenv("MODEL_PATH", "./saved_models/mdr_model.pkl")
SHAP_BACKGROUND_PATH = os.getenv("SHAP_BACKGROUND_PATH", "./saved_models/shap_background.parquet")

_model = None
_background_data = None
_explainer = None


def _load_artifacts():
    global _model, _background_data, _explainer

    if _model is not None and _explainer is not None:
        return

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")

    if not os.path.exists(SHAP_BACKGROUND_PATH):
        raise FileNotFoundError(f"SHAP background data not found at {SHAP_BACKGROUND_PATH}")

    _model = joblib.load(MODEL_PATH)
    _background_data = pd.read_parquet(SHAP_BACKGROUND_PATH)
    _explainer = shap.TreeExplainer(_model, _background_data)


def compute_shap_explanation(record: dict):
    _load_artifacts()

    features = _background_data.columns.tolist()
    input_df = pd.DataFrame([record], columns=features)

    shap_values = _explainer.shap_values(input_df)

    if isinstance(shap_values, list):
        shap_values = shap_values[1]
    shap_values = shap_values[0]

    contributors = []
    for feature, value, shap_val in zip(features, input_df.iloc[0].values, shap_values):
        contributors.append({
            "factor": feature,
            "value": float(value),
            "shap_value": float(shap_val),
            "direction": "increases risk" if shap_val > 0 else "decreases risk",
            "importance": abs(float(shap_val))
        })

    contributors.sort(key=lambda x: x["importance"], reverse=True)

    probability = _model.predict_proba(input_df)[0][1]

    top_positive = [c for c in contributors if c["shap_value"] > 0][:3]
    top_negative = [c for c in contributors if c["shap_value"] < 0][:2]

    summary = f"The model predicts MDR probability {probability:.2f}. "
    if top_positive:
        summary += "Main drivers: " + ", ".join([f"{c['factor']} ({c['importance']:.2f})" for c in top_positive]) + ". "
    if top_negative:
        summary += "Protective factors: " + ", ".join([f"{c['factor']} ({c['importance']:.2f})" for c in top_negative]) + "."

    return {
        "plainTextSummary": summary,
        "confidence": float(probability),
        "model_version": getattr(_model, "model_version", "xgb-1.0"),
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "contributors": contributors,
        "waterfall": [
            {"factor": c["factor"], "shap_value": c["shap_value"]}
            for c in contributors[:10]
        ]
    }
