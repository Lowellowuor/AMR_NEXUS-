import pandas as pd
import xgboost as xgb
from sklearn.ensemble import IsolationForest
from imblearn.over_sampling import SMOTE
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from src.utils.logger import logger
from src.utils.config import config
import joblib
import shap

def train_mdr_classifier(X: pd.DataFrame, y: pd.Series) -> xgb.XGBClassifier:
    y = y.astype(int)
    logger.info(f"Training XGBoost MDR classifier on {X.shape[1]} features with {len(y)} samples")
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    smote = SMOTE(random_state=42)
    X_res, y_res = smote.fit_resample(X_train, y_train)
    
    model = xgb.XGBClassifier(**config.XGB_PARAMS, eval_metric='logloss', use_label_encoder=False)
    model.fit(X_res, y_res, eval_set=[(X_val, y_val)], verbose=False)
    
    y_pred = model.predict(X_val)
    logger.info("\n" + classification_report(y_val, y_pred))
    auc = roc_auc_score(y_val, model.predict_proba(X_val)[:,1])
    logger.info(f"AUC-ROC: {auc:.3f}")
    return model

def train_anomaly_detector(X: pd.DataFrame) -> IsolationForest:
    logger.info("Training Isolation Forest for anomaly detection")
    numeric_X = X.select_dtypes(include=['float64', 'int64'])
    iso = IsolationForest(contamination=config.ANOMALY_CONTAMINATION, random_state=42)
    iso.fit(numeric_X)
    return iso

def save_artifacts(model, anomaly_model, preprocessor, feature_names, numeric_indices):
    config.MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump(model, config.MODEL_DIR / "mdr_xgb.pkl")
    joblib.dump(anomaly_model, config.MODEL_DIR / "anomaly_iso.pkl")
    preprocessor.save(config.MODEL_DIR / "preprocessor.pkl")
    joblib.dump(feature_names, config.MODEL_DIR / "feature_names.pkl")
    joblib.dump(numeric_indices, config.MODEL_DIR / "numeric_indices.pkl")
    logger.info("Computing SHAP explainer")
    explainer = shap.TreeExplainer(model)
    joblib.dump(explainer, config.MODEL_DIR / "shap_explainer.pkl")
    logger.info("All artifacts saved")