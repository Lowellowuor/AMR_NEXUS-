
import sys
import os
import glob
import joblib
import json
from pathlib import Path
import pandas as pd
import numpy as np
import click
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.decomposition import TruncatedSVD
import xgboost as xgb
from sklearn.ensemble import IsolationForest
import shap
import warnings
warnings.filterwarnings('ignore')

from src.core.config import settings
from src.utils.logger import logger

FRONTEND_FEATURES = [
    'sector', 'sub_sector', 'pathogen_code', 'specimen_type',
    'county', 'antibiotic_class', 'test_method', 'sample_month',
    'prior_antibiotic_exposure'
]

COLUMN_MAPPING = {
    'pathogen': 'pathogen_code',
    'antibiotic': 'antibiotic_class',
    'prior_antibiotic_use': 'prior_antibiotic_exposure',
    'facility': 'facility',
    'sample_type': 'specimen_type',
    'month': 'sample_month',
}

class DataLoader:
    @staticmethod
    def _expand_paths(path_str):
        if not path_str:
            return []
        paths = [p.strip() for p in path_str.split(',') if p.strip()]
        files = []
        for p in paths:
            if os.path.isdir(p):
                files.extend(sorted(glob.glob(os.path.join(p, '*.csv'))))
                files.extend(sorted(glob.glob(os.path.join(p, '*.xlsx'))))
            else:
                files.append(p)
        return files

    @staticmethod
    def _read_file(file_path, encoding='utf-8'):
        try:
            if file_path.endswith('.xlsx'):
                return pd.read_excel(file_path, engine='openpyxl')
            else:
                for enc in [encoding, 'latin-1', 'cp1252', 'utf-8-sig']:
                    for delim in [',', ';', '\t', '|']:
                        try:
                            return pd.read_csv(file_path, encoding=enc, delimiter=delim)
                        except (UnicodeDecodeError, pd.errors.ParserError):
                            continue
                raise ValueError(f"Could not read CSV: {file_path}")
        except Exception as e:
            logger.error(f"Failed to read {file_path}: {e}")
            raise

    @staticmethod
    def from_path(path_str, target_col=None, threshold=None, limit=None, encoding=None):
        files = DataLoader._expand_paths(path_str)
        if not files:
            raise ValueError(f"No files found at {path_str}")

        df_list = []
        for f in files:
            logger.info(f"Loading file: {f}")
            df = DataLoader._read_file(f, encoding)
            df_list.append(df)

        df = pd.concat(df_list, ignore_index=True)
        logger.info(f"Combined {len(df)} records from {len(files)} file(s).")

        df.rename(columns=COLUMN_MAPPING, inplace=True)

        if limit:
            df = df.head(limit)

        if target_col is None:
            for candidate in ['mdr_flag', 'classification', 'resistance_percent']:
                if candidate in df.columns:
                    target_col = candidate
                    break
            else:
                raise KeyError("No suitable target column found.")

        if df[target_col].dtype == 'object':
            positive = ['resistant', 'mdr', 'positive', 'yes', '1']
            df[target_col] = df[target_col].astype(str).str.lower().map(lambda x: 1 if x in positive else 0)
        else:
            unique_vals = set(df[target_col].dropna().unique())
            is_binary = unique_vals.issubset({0, 1, 0.0, 1.0})
            if is_binary:
                df[target_col] = df[target_col].astype(int)
            else:
                if threshold is None:
                    threshold = df[target_col].median()
                df[target_col] = (df[target_col] > threshold).astype(int)

        features = [f for f in FRONTEND_FEATURES if f in df.columns]
        X = df[features].copy()
        y = df[target_col].astype(int)
        return X, y, features

class PreprocessorBuilder:
    @staticmethod
    def build(X):
        numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = X.select_dtypes(include=['object', 'category']).columns.tolist()

        numeric_pipe = Pipeline([
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ])
        categorical_pipe = Pipeline([
            ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
            ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])

        return ColumnTransformer([
            ('num', numeric_pipe, numeric_cols),
            ('cat', categorical_pipe, categorical_cols)
        ])

class Trainer:
    @staticmethod
    def train_xgb(X_train, y_train, X_val, y_val, scale_pos_weight):
        model = xgb.XGBClassifier(
            n_estimators=settings.XGB_N_ESTIMATORS,
            max_depth=settings.XGB_MAX_DEPTH,
            learning_rate=settings.XGB_LEARNING_RATE,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight,
            early_stopping_rounds=10,
            eval_metric='logloss',
            random_state=settings.XGB_RANDOM_STATE,
            n_jobs=-1
        )
        model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
        return model

    @staticmethod
    def train_isolation_forest(X_reduced):
        iso = IsolationForest(
            contamination=settings.ANOMALY_CONTAMINATION,
            random_state=42
        )
        iso.fit(X_reduced)
        return iso

    @staticmethod
    def build_shap(model, X_sample):
        return shap.TreeExplainer(model, X_sample)

def save_artifacts(model, iso_model, preprocessor, shap_explainer, feature_names, X_sample, threshold, svd_model, svd_components, pair_freq_map, original_features):
    model_dir = Path(settings.MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, model_dir / 'mdr_model.pkl')
    joblib.dump(iso_model, model_dir / 'anomaly_iso.pkl')
    joblib.dump(preprocessor, model_dir / 'preprocessor.pkl')
    joblib.dump(feature_names, model_dir / 'feature_names.pkl')
    joblib.dump(shap_explainer, model_dir / 'shap_explainer.pkl')
    joblib.dump(threshold, model_dir / 'anomaly_threshold.pkl')
    joblib.dump(svd_model, model_dir / 'svd.pkl')
    joblib.dump(svd_components, model_dir / 'svd_components.pkl')
    joblib.dump(pair_freq_map, model_dir / 'pair_freq_map.pkl')
    joblib.dump(original_features, model_dir / 'original_feature_names.pkl')

    pd.DataFrame(X_sample, columns=feature_names).to_parquet(model_dir / 'shap_background.parquet', index=False)
    logger.info(f"Artifacts saved to {model_dir}")

def main(csv_path, target_col, threshold, limit, split_by_time, encoding):
    X, y, _ = DataLoader.from_path(csv_path, target_col, threshold, limit, encoding)

    anomaly_path = settings.ANOMALY_FILE_PATH
    anomaly_ratio = settings.ANOMALY_RATIO

    if anomaly_path and anomaly_ratio > 0:
        X_anom, y_anom, _ = DataLoader.from_path(anomaly_path, target_col, threshold, None, encoding)
        n_anom = int(len(X) * anomaly_ratio)
        if n_anom > 0:
            if len(X_anom) > n_anom:
                sample_idx = X_anom.sample(n=n_anom, random_state=42).index
                X_anom_sampled = X_anom.loc[sample_idx]
                y_anom_sampled = y_anom.loc[sample_idx]
            else:
                X_anom_sampled = X_anom
                y_anom_sampled = y_anom

            X = pd.concat([X, X_anom_sampled], ignore_index=True)
            y = pd.concat([y, y_anom_sampled], ignore_index=True)
            logger.info(f"Added {len(X_anom_sampled)} anomaly records for training.")

    pair_counts = X.groupby(['sector', 'sub_sector']).size().to_dict()
    X['sector_sub_pair_count'] = X.apply(
        lambda row: pair_counts.get((row['sector'], row['sub_sector']), 0), axis=1
    )
    pair_freq_map = {f"{k[0]}_{k[1]}": v for k, v in pair_counts.items()}

    original_features = X.columns.tolist()

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    preprocessor = PreprocessorBuilder.build(X_train)
    X_train_processed = preprocessor.fit_transform(X_train)
    X_val_processed = preprocessor.transform(X_val)

    pos_count = (y_train == 1).sum()
    neg_count = (y_train == 0).sum()
    scale_pos_weight = (neg_count / pos_count) if pos_count > 0 else 1.0
    logger.info(f"scale_pos_weight: {scale_pos_weight:.2f}")

    xgb_model = Trainer.train_xgb(X_train_processed, y_train, X_val_processed, y_val, scale_pos_weight)

    y_pred = xgb_model.predict(X_val_processed)
    y_proba = xgb_model.predict_proba(X_val_processed)[:, 1]
    roc_auc = roc_auc_score(y_val, y_proba)
    logger.info(f"ROC-AUC: {roc_auc:.4f}")
    logger.info(classification_report(y_val, y_pred))

    n_components = min(10, X_train_processed.shape[1] - 1)
    svd = TruncatedSVD(n_components=n_components, random_state=42)
    X_train_reduced = svd.fit_transform(X_train_processed)

    iso_model = Trainer.train_isolation_forest(X_train_reduced)

    scores = iso_model.score_samples(X_train_reduced)
    anomaly_threshold = np.percentile(scores, 5)
    logger.info(f"Anomaly threshold: {anomaly_threshold:.4f}")

    X_sample = X_train_processed[:100]
    shap_explainer = Trainer.build_shap(xgb_model, X_sample)

    feature_names = preprocessor.get_feature_names_out()
    save_artifacts(
        xgb_model, iso_model, preprocessor, shap_explainer,
        feature_names, X_sample, anomaly_threshold,
        svd, n_components, pair_freq_map, original_features
    )

    logger.info("Training completed.")

@click.command()
@click.option('--csv-path', default=None, help='CSV/Excel file, comma-separated list, or directory. Defaults to DATA_FILE_PATH.')
@click.option('--target-col', default=None, help='Target column name. Defaults to TARGET_COL.')
@click.option('--threshold', default=None, type=float, help='Threshold for numeric target.')
@click.option('--limit', default=None, type=int, help='Limit records for debugging.')
@click.option('--split-by-time', is_flag=True, help='Split by time if applicable.')
@click.option('--encoding', default='utf-8', help='CSV encoding.')
def cli(csv_path, target_col, threshold, limit, split_by_time, encoding):
    if csv_path is None:
        csv_path = settings.DATA_FILE_PATH
    if target_col is None:
        target_col = settings.TARGET_COL
    if threshold is None:
        threshold = settings.MDR_THRESHOLD
    if limit is None:
        limit = settings.LIMIT
    if not split_by_time:
        split_by_time = settings.SPLIT_BY_TIME
    if encoding == 'utf-8':
        encoding = settings.CSV_ENCODING

    main(csv_path, target_col, threshold, limit, split_by_time, encoding)

if __name__ == "__main__":
    cli()
