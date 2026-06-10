from pathlib import Path
from typing import Any, List, Union
import numpy as np
import pandas as pd
import xgboost as xgb
import joblib
import shap
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score, average_precision_score

from src.utils.logger import logger
from src.utils.config import config


def train_mdr_classifier(X: pd.DataFrame, y: pd.Series) -> xgb.XGBClassifier:
    target = y.astype(int)
    
    X_train, X_val, y_train, y_val = train_test_split(
        X, target, test_size=0.2, random_state=42, stratify=target
    )
    
    num_neg = int(np.sum(y_train == 0))
    num_pos = int(np.sum(y_train == 1))
    scale_weight = float(num_neg / num_pos) if num_pos > 0 else 1.0
    
    logger.info(f"Initiating XGBoost MDR training | Shape: {X_train.shape}")
    logger.info(f"Imbalance Telemetry | Negatives: {num_neg}, Positives: {num_pos} | Applied Weight: {scale_weight:.3f}")

    sanitized_xgb_params = {
        k: v for k, v in config.XGB_PARAMS.items() 
        if k not in ["use_label_encoder", "scale_pos_weight", "eval_metric", "random_state"]
    }
    
    model = xgb.XGBClassifier(
        **sanitized_xgb_params,
        scale_pos_weight=scale_weight,
        eval_metric="aucpr",
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(
        X_train, 
        y_train, 
        eval_set=[(X_val, y_val)], 
        verbose=False
    )
    
    y_pred = model.predict(X_val)
    y_proba = model.predict_proba(X_val)[:, 1]
    
    logger.info("\n" + classification_report(y_val, y_pred, digits=3))
    
    auc_roc = float(roc_auc_score(y_val, y_proba))
    auc_pr = float(average_precision_score(y_val, y_proba))
    
    logger.info(f"Validation Metrics | AUC-ROC: {auc_roc:.3f} | PR-AUC: {auc_pr:.3f}")
    
    if auc_roc <= 0.52:
        logger.warning(
            "🚨 PERFORMANCE CRITICAL: Model performance is near random chance (AUC-ROC ≈ 0.50). "
            "Features in 'synthetic_amr_data.csv' are statistically independent of the target. "
            "Action Required: Introduce explicit clinical correlations in your synthetic data generator."
        )
        
    return model


def train_anomaly_detector(X: pd.DataFrame) -> IsolationForest:
    logger.info("Training Isolation Forest Anomaly Detection engine...")
    
    numeric_X = X.select_dtypes(include=["float64", "int64", "float32", "int32"])
    
    if numeric_X.empty:
        logger.warning("Zero numeric dimensions located. Falling back to explicit data matrix.")
        numeric_X = X.copy()
        
    contamination_rate = float(getattr(config, "ANOMALY_CONTAMINATION", 0.05))
    
    iso = IsolationForest(
        contamination=contamination_rate, 
        random_state=42,
        n_jobs=-1
    )
    iso.fit(numeric_X)
    
    logger.info("Anomaly detection optimization phase completed successfully.")
    return iso


def save_artifacts(
    model: xgb.XGBClassifier, 
    anomaly_model: IsolationForest, 
    preprocessor: Any, 
    feature_names: List[str], 
    numeric_indices: Union[List[int], np.ndarray]
) -> None:
    output_directory = Path(config.MODEL_DIR)
    output_directory.mkdir(parents=True, exist_ok=True)
    
    artifacts = {
        "mdr_xgb.pkl": model,
        "anomaly_iso.pkl": anomaly_model,
        "feature_names.pkl": feature_names,
        "numeric_indices.pkl": numeric_indices
    }
    
    for filename, obj in artifacts.items():
        filepath = output_directory / filename
        joblib.dump(obj, filepath)
        logger.debug(f"Serialized artifact safely stored at: {filepath}")
        
    preprocessor.save(output_directory / "preprocessor.pkl")
    
    logger.info("Computing structural SHAP tree explainer artifacts...")
    try:
        explainer = shap.TreeExplainer(model)
        joblib.dump(explainer, output_directory / "shap_explainer.pkl")
        logger.info("All pipeline model artifacts saved securely to disk.")
    except Exception as exc:
        logger.error(f"Failed to generate SHAP tree explainer structure: {str(exc)}")
