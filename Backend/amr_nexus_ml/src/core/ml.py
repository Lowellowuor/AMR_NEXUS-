import sys
from pathlib import Path
from typing import Any

import joblib

from src.core.config import settings
from src.utils.logger import logger

model: Any | None = None
anomaly_model: Any | None = None
preprocessor: Any | None = None
feature_names: list[str] | None = None
numeric_indices: list[int] | None = None
shap_explainer: Any | None = None


def load_models() -> None:
    global model, anomaly_model, preprocessor, feature_names, numeric_indices, shap_explainer
    model_dir = Path(settings.MODEL_DIR)

    if not model_dir.exists():
        logger.critical(f"Model directory artifact repository missing: {model_dir}")
        sys.exit(1)

    try:
        model = joblib.load(model_dir / "mdr_xgb.pkl")
        anomaly_model = joblib.load(model_dir / "anomaly_iso.pkl")

        preprocessor = joblib.load(model_dir / "preprocessor.pkl")

        feature_names = joblib.load(model_dir / "feature_names.pkl")
        numeric_indices = joblib.load(model_dir / "numeric_indices.pkl")

        shap_path = model_dir / "shap_explainer.pkl"
        shap_explainer = joblib.load(shap_path) if shap_path.exists() else None

        logger.info("All pipeline machine learning artifacts loaded cleanly into shared memory.")
    except Exception as e:
        logger.critical(f"Model binary deserialization pipeline crashed: {str(e)}")
        sys.exit(1)


def get_model() -> Any:
    if model is None:
        raise RuntimeError("Model requested before load_models optimization sequence executed.")
    return model


def get_anomaly_model() -> Any:
    if anomaly_model is None:
        raise RuntimeError("Anomaly model requested before load_models optimization sequence executed.")
    return anomaly_model


def get_preprocessor() -> Any:
    if preprocessor is None:
        raise RuntimeError("Preprocessor model requested before load_models optimization sequence executed.")
    return preprocessor


def get_feature_names() -> list[str]:
    if feature_names is None:
        raise RuntimeError("Feature names model requested before load_models optimization sequence executed.")
    return feature_names


def get_numeric_indices() -> list[int]:
    if numeric_indices is None:
        raise RuntimeError(
            "Numeric indices model requested before load_models optimization sequence executed."
        )
    return numeric_indices


def get_shap_explainer() -> Any | None:
    return shap_explainer
