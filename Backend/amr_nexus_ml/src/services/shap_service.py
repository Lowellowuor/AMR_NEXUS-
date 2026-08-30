import shap
import joblib
import pandas as pd
import os
from datetime import datetime

MODEL_PATH = os.getenv("MODEL_PATH", "./saved_models/mdr_model.pkl")
SHAP_BACKGROUND_PATH = os.getenv("SHAP_BACKGROUND_PATH", "./saved_models/shap_background.parquet")

_model = None
_preprocessor = None
_original_features = None
_pair_freq_map = None
_shap_explainer = None
_feature_names = None
_background_data = None


def _load_artifacts():
    global _model, _preprocessor, _original_features, _pair_freq_map, _shap_explainer, _feature_names, _background_data

    if _model is not None and _preprocessor is not None:
        return

    model_dir = os.path.dirname(MODEL_PATH) or "."
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
    if not os.path.exists(SHAP_BACKGROUND_PATH):
        raise FileNotFoundError(f"SHAP background data not found at {SHAP_BACKGROUND_PATH}")

    _model = joblib.load(MODEL_PATH)
    _preprocessor = joblib.load(os.path.join(model_dir, "preprocessor.pkl"))
    _original_features = joblib.load(os.path.join(model_dir, "original_feature_names.pkl"))
    _pair_freq_map = joblib.load(os.path.join(model_dir, "pair_freq_map.pkl"))
    _shap_explainer = joblib.load(os.path.join(model_dir, "shap_explainer.pkl"))
    _feature_names = joblib.load(os.path.join(model_dir, "feature_names.pkl"))
    _background_data = pd.read_parquet(SHAP_BACKGROUND_PATH)


def record_to_feature_dict(record):
    if hasattr(record, "__dict__"):
        record = record.__dict__

    return {
        'sector': record.get('sector', 'unknown'),
        'sub_sector': record.get('sub_sector', 'unknown'),
        'pathogen_code': record.get('pathogen_code', 'unknown'),
        'specimen_type': record.get('specimen_type', 'unknown'),
        'county': record.get('county', 'unknown'),
        'antibiotic_class': record.get('antibiotic_class', 'unknown'),
        'test_method': record.get('test_method', 'unknown'),
        'sample_month': record.get('sample_month', 1),
        'prior_antibiotic_exposure': int(record.get('prior_antibiotic_exposure', 0) or 0),
    }


def _add_pair_frequency_feature(record):
    pair_key = f"{record.get('sector', '')}_{record.get('sub_sector', '')}"
    record['sector_sub_pair_count'] = _pair_freq_map.get(pair_key, 0)
    return record


def compute_shap_explanation(record):
    _load_artifacts()

    if not isinstance(record, dict):
        record = record_to_feature_dict(record)

    record = _add_pair_frequency_feature(record)

    X_raw = pd.DataFrame([record])[_original_features]
    X_processed = _preprocessor.transform(X_raw)

    shap_values = _shap_explainer.shap_values(X_processed)
    if isinstance(shap_values, list):
        shap_values = shap_values[1]
    shap_values = shap_values[0]

    contributors = []
    for feature, shap_val in zip(_feature_names, shap_values):
        contributors.append({
            "factor": feature,
            "shap_value": float(shap_val),
            "direction": "increases risk" if shap_val > 0 else "decreases risk",
            "importance": abs(float(shap_val)),
        })

    contributors.sort(key=lambda x: x["importance"], reverse=True)

    probability = float(_model.predict_proba(X_processed)[0][1])

    top_positive = [c for c in contributors if c["shap_value"] > 0][:3]
    top_negative = [c for c in contributors if c["shap_value"] < 0][:2]

    summary = f"The model predicts MDR probability {probability:.2f}. "
    if top_positive:
        summary += "Main drivers: " + ", ".join([f"{c['factor']} ({c['importance']:.2f})" for c in top_positive]) + ". "
    if top_negative:
        summary += "Protective factors: " + ", ".join([f"{c['factor']} ({c['importance']:.2f})" for c in top_negative]) + "."

    return {
        "plainTextSummary": summary,
        "confidence": probability,
        "model_version": getattr(_model, "model_version", "xgb-1.0"),
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "contributors": contributors,
        "waterfall": [
            {"factor": c["factor"], "shap_value": c["shap_value"]}
            for c in contributors[:10]
        ],
    }