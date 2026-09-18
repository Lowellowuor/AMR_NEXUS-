import os
import glob
import json
import joblib
import datetime
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any

import numpy as np
import pandas as pd
import click
import warnings
warnings.filterwarnings("ignore")

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import (
    roc_auc_score, precision_score, recall_score, f1_score, brier_score_loss,
)
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.decomposition import TruncatedSVD
from sklearn.ensemble import IsolationForest
from sklearn.isotonic import IsotonicRegression
import xgboost as xgb
import shap

from src.core.config import settings
from src.utils.logger import logger

MODEL_VERSION = "1.1.0"
CV_FOLDS = 5
HOLDOUT_SIZE = 0.20
RANDOM_STATE = 42
STERILE_SITES = {"blood", "csf", "sterile_fluid"}

FRONTEND_FEATURES = [
    "sector", "sub_sector", "pathogen_code", "specimen_type",
    "county", "antibiotic_class", "test_method", "sample_month",
    "prior_antibiotic_exposure",
]

COLUMN_MAPPING = {
    "pathogen": "pathogen_code",
    "antibiotic": "antibiotic_class",
    "prior_antibiotic_use": "prior_antibiotic_exposure",
    "sample_type": "specimen_type",
    "month": "sample_month",
}


class DataLoader:
    @staticmethod
    def expand_paths(path_str: str) -> List[str]:
        if not path_str:
            return []
        paths = [p.strip() for p in path_str.split(",") if p.strip()]
        files: List[str] = []
        for p in paths:
            if os.path.isdir(p):
                files.extend(sorted(glob.glob(os.path.join(p, "*.csv"))))
                files.extend(sorted(glob.glob(os.path.join(p, "*.xlsx"))))
            else:
                files.append(p)
        return files

    @staticmethod
    def read_file(file_path: str, encoding: str = "utf-8") -> pd.DataFrame:
        if file_path.endswith(".xlsx"):
            return pd.read_excel(file_path, engine="openpyxl")
        for enc in [encoding, "latin-1", "cp1252", "utf-8-sig"]:
            for delim in [",", ";", "\t", "|"]:
                try:
                    return pd.read_csv(file_path, encoding=enc, delimiter=delim)
                except (UnicodeDecodeError, pd.errors.ParserError):
                    continue
        raise ValueError(f"Could not read file: {file_path}")

    @staticmethod
    def from_path(
        path_str: str,
        target_col: Optional[str] = None,
        threshold: Optional[float] = None,
        limit: Optional[int] = None,
        encoding: Optional[str] = None,
    ) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
        files = DataLoader.expand_paths(path_str)
        if not files:
            raise ValueError(f"No files found at {path_str}")

        frames = [DataLoader.read_file(f, encoding or "utf-8") for f in files]
        df = pd.concat(frames, ignore_index=True)
        df.rename(columns=COLUMN_MAPPING, inplace=True)

        if limit:
            df = df.head(limit)

        if target_col is None:
            for candidate in ["mdr_flag", "classification", "resistance_percent"]:
                if candidate in df.columns:
                    target_col = candidate
                    break
            if target_col is None:
                raise KeyError("No suitable target column found.")

        if df[target_col].dtype == object:
            positive = {"resistant", "mdr", "positive", "yes", "1", "r"}
            df[target_col] = (
                df[target_col].astype(str).str.lower()
                .map(lambda x: 1 if x in positive else 0)
            )
        else:
            unique_vals = set(df[target_col].dropna().unique())
            if unique_vals.issubset({0, 1, 0.0, 1.0}):
                df[target_col] = df[target_col].astype(int)
            else:
                if threshold is None:
                    threshold = df[target_col].median()
                df[target_col] = (df[target_col] > threshold).astype(int)

        features = [f for f in FRONTEND_FEATURES if f in df.columns]
        X = df[features].copy()
        y = df[target_col].astype(int)
        return X, y, features


def add_sterile_flag(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "specimen_type" in df.columns:
        df["is_sterile_site"] = (
            df["specimen_type"].astype(str).str.lower()
            .isin(STERILE_SITES).astype(int)
        )
    else:
        df["is_sterile_site"] = 0
    return df


def compute_pair_freq(df: pd.DataFrame) -> Dict[str, int]:
    counts = df.groupby(["sector", "sub_sector"]).size().to_dict()
    return {f"{k[0]}_{k[1]}": v for k, v in counts.items()}


def apply_pair_freq(df: pd.DataFrame, pair_freq_map: Dict[str, int]) -> pd.DataFrame:
    df = df.copy()
    df["sector_sub_pair_count"] = df.apply(
        lambda r: pair_freq_map.get(
            f"{r.get('sector', '')}_{r.get('sub_sector', '')}", 0
        ),
        axis=1,
    )
    return df


class PreprocessorBuilder:
    @staticmethod
    def build(X: pd.DataFrame) -> ColumnTransformer:
        numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()

        numeric_pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ])
        categorical_pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ])
        return ColumnTransformer([
            ("num", numeric_pipe, numeric_cols),
            ("cat", categorical_pipe, categorical_cols),
        ])


def build_xgb(scale_pos_weight: float) -> xgb.XGBClassifier:
    return xgb.XGBClassifier(
        n_estimators=settings.XGB_N_ESTIMATORS,
        max_depth=settings.XGB_MAX_DEPTH,
        learning_rate=settings.XGB_LEARNING_RATE,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        eval_metric="logloss",
        random_state=settings.XGB_RANDOM_STATE,
        n_jobs=-1,
    )


def binary_metrics(y_true, y_proba, threshold: float = 0.5) -> Dict[str, float]:
    y_pred = (y_proba >= threshold).astype(int)
    return {
        "auc": float(roc_auc_score(y_true, y_proba)),
        "brier": float(brier_score_loss(y_true, y_proba)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
    }


def subgroup_metrics(
    y_true: pd.Series,
    y_proba: np.ndarray,
    groups: pd.Series,
    name: str,
    min_n: int = 10,
    top_n: int = 8,
) -> Dict[str, Dict[str, Dict[str, float]]]:
    out: Dict[str, Dict[str, float]] = {}
    for value, idx in groups.groupby(groups).groups.items():
        idx_list = list(idx)
        if len(idx_list) < min_n:
            continue
        yt = y_true.iloc[idx_list]
        if len(set(yt)) < 2:
            continue
        yp = y_proba[idx_list]
        try:
            out[str(value)] = {"n": len(idx_list), "auc": float(roc_auc_score(yt, yp))}
        except Exception:
            continue
    ordered = sorted(out.items(), key=lambda kv: -kv[1]["n"])[:top_n]
    return {name: dict(ordered)}


def cross_validate(X_base: pd.DataFrame, y: pd.Series) -> Tuple[List[float], List[float], np.ndarray]:
    skf = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    aucs: List[float] = []
    briers: List[float] = []
    oof_proba = np.zeros(len(X_base))

    for fold, (train_idx, val_idx) in enumerate(skf.split(X_base, y), 1):
        X_tr = X_base.iloc[train_idx].copy()
        X_va = X_base.iloc[val_idx].copy()
        y_tr = y.iloc[train_idx]
        y_va = y.iloc[val_idx]

        pf = compute_pair_freq(X_tr)
        X_tr = apply_pair_freq(X_tr, pf)
        X_va = apply_pair_freq(X_va, pf)

        pre = PreprocessorBuilder.build(X_tr)
        X_tr_p = pre.fit_transform(X_tr)
        X_va_p = pre.transform(X_va)

        spw = float((y_tr == 0).sum() / max((y_tr == 1).sum(), 1))
        model = build_xgb(spw)
        model.fit(X_tr_p, y_tr, verbose=False)

        proba = model.predict_proba(X_va_p)[:, 1]
        oof_proba[val_idx] = proba
        aucs.append(roc_auc_score(y_va, proba))
        briers.append(brier_score_loss(y_va, proba))
        logger.info(f"fold {fold}: AUC={aucs[-1]:.4f} Brier={briers[-1]:.4f}")

    return aucs, briers, oof_proba


def save_artifacts(
    model, preprocessor, iso_model, svd, shap_explainer,
    anomaly_threshold, feature_names, original_features,
    pair_freq_map, calibrator, X_sample, model_dir: Path,
):
    model_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, model_dir / "mdr_model.pkl")
    joblib.dump(preprocessor, model_dir / "preprocessor.pkl")
    joblib.dump(iso_model, model_dir / "anomaly_iso.pkl")
    joblib.dump(svd, model_dir / "svd.pkl")
    joblib.dump(shap_explainer, model_dir / "shap_explainer.pkl")
    joblib.dump(anomaly_threshold, model_dir / "anomaly_threshold.pkl")
    joblib.dump(feature_names, model_dir / "feature_names.pkl")
    joblib.dump(list(original_features), model_dir / "original_feature_names.pkl")
    joblib.dump(pair_freq_map, model_dir / "pair_freq_map.pkl")
    joblib.dump(calibrator, model_dir / "calibrator.pkl")

    joblib.dump(model, model_dir / "mdr_xgb.pkl")
    joblib.dump(len(feature_names), model_dir / "numeric_indices.pkl")
    joblib.dump(svd.n_components, model_dir / "svd_components.pkl")

    pd.DataFrame(X_sample, columns=feature_names).to_parquet(
        model_dir / "shap_background.parquet", index=False
    )


def main(csv_path, target_col, threshold, limit, encoding, dry_run, model_dir_override):
    logger.info(f"Model version: {MODEL_VERSION}")

    X_raw, y, features = DataLoader.from_path(csv_path, target_col, threshold, limit, encoding)
    X_base = add_sterile_flag(X_raw)

    n_pos = int((y == 1).sum())
    n_neg = int((y == 0).sum())
    logger.info(f"rows={len(X_base)} features={len(features)} pos={n_pos} neg={n_neg}")

    aucs, briers, oof_proba = cross_validate(X_base, y)
    cv_auc_mean = float(np.mean(aucs))
    cv_auc_std = float(np.std(aucs))
    cv_brier_mean = float(np.mean(briers))
    logger.info(f"CV AUC: {cv_auc_mean:.4f} +/- {cv_auc_std:.4f}")
    logger.info(f"CV Brier: {cv_brier_mean:.4f}")

    subgroups: Dict[str, Any] = {}
    for col in ["sector", "specimen_type", "county"]:
        if col in X_base.columns:
            subgroups.update(subgroup_metrics(y, oof_proba, X_base[col], col))

    if dry_run:
        logger.info("Dry run - no artifacts written.")
        return

    X_tr_all, X_ho, y_tr_all, y_ho = train_test_split(
        X_base, y, test_size=HOLDOUT_SIZE, random_state=RANDOM_STATE, stratify=y
    )

    pf_final = compute_pair_freq(X_tr_all)
    X_tr_all = apply_pair_freq(X_tr_all, pf_final)
    X_ho = apply_pair_freq(X_ho, pf_final)

    pre_final = PreprocessorBuilder.build(X_tr_all)
    X_tr_all_p = pre_final.fit_transform(X_tr_all)
    X_ho_p = pre_final.transform(X_ho)

    spw_final = float((y_tr_all == 0).sum() / max((y_tr_all == 1).sum(), 1))
    final_model = build_xgb(spw_final)
    final_model.fit(X_tr_all_p, y_tr_all, verbose=False)

    ho_raw = final_model.predict_proba(X_ho_p)[:, 1]
    holdout_metrics = binary_metrics(y_ho, ho_raw)
    logger.info(f"Holdout uncalibrated: {holdout_metrics}")

    calibrator = IsotonicRegression(out_of_bounds="clip")
    calibrator.fit(ho_raw, y_ho.values)
    ho_cal = calibrator.predict(ho_raw)
    calibrated_metrics = binary_metrics(y_ho, ho_cal)
    logger.info(f"Holdout calibrated:   {calibrated_metrics}")

    n_components = min(10, X_tr_all_p.shape[1] - 1)
    svd = TruncatedSVD(n_components=n_components, random_state=RANDOM_STATE)
    X_tr_reduced = svd.fit_transform(X_tr_all_p)

    iso_model = IsolationForest(
        contamination=settings.ANOMALY_CONTAMINATION, random_state=RANDOM_STATE
    )
    iso_model.fit(X_tr_reduced)
    anomaly_threshold = float(np.percentile(iso_model.score_samples(X_tr_reduced), 5))

    X_sample = X_tr_all_p[:100]
    shap_explainer = shap.TreeExplainer(final_model, X_sample)

    feature_names = pre_final.get_feature_names_out()

    model_dir = Path(model_dir_override or settings.MODEL_DIR)
    save_artifacts(
        final_model, pre_final, iso_model, svd, shap_explainer,
        anomaly_threshold, feature_names, X_tr_all.columns,
        pf_final, calibrator, X_sample, model_dir,
    )

    metrics = {
        "model_version": MODEL_VERSION,
        "trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "training_rows": int(len(X_tr_all)),
        "holdout_rows": int(len(X_ho)),
        "cv_folds": CV_FOLDS,
        "cv_auc_mean": cv_auc_mean,
        "cv_auc_std": cv_auc_std,
        "cv_brier_mean": cv_brier_mean,
        "holdout": holdout_metrics,
        "holdout_calibrated": calibrated_metrics,
        "subgroups": subgroups,
        "features": list(X_tr_all.columns),
        "class_balance": {"positive": n_pos, "negative": n_neg},
    }
    (model_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (model_dir / "model_version.json").write_text(
        json.dumps({"model_version": MODEL_VERSION, "trained_at": metrics["trained_at"]}, indent=2),
        encoding="utf-8",
    )

    logger.info(f"Artifacts written to {model_dir}")
    logger.info("Training complete.")


@click.command()
@click.option("--csv-path", default=None)
@click.option("--target-col", default=None)
@click.option("--threshold", default=None, type=float)
@click.option("--limit", default=None, type=int)
@click.option("--encoding", default="utf-8")
@click.option("--dry-run", is_flag=True)
@click.option("--model-dir", default=None)
def cli(csv_path, target_col, threshold, limit, encoding, dry_run, model_dir):
    main(
        csv_path or settings.DATA_FILE_PATH,
        target_col or settings.TARGET_COL,
        threshold if threshold is not None else settings.MDR_THRESHOLD,
        limit if limit is not None else settings.LIMIT,
        encoding if encoding != "utf-8" else settings.CSV_ENCODING,
        dry_run,
        model_dir,
    )


if __name__ == "__main__":
    cli()
