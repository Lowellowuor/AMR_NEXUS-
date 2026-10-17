from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from src.core.config import settings
from src.db.models import AMRIsolateRecord, ModelRegistry
from src.utils.logger import logger

try:
    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.metrics import (
        brier_score_loss,
        confusion_matrix,
        f1_score,
        precision_score,
        recall_score,
        roc_auc_score,
    )
    from xgboost import XGBClassifier

    SKLEARN_AVAILABLE = True
except Exception as e:
    SKLEARN_AVAILABLE = False
    logger.warning(f"Retraining dependencies missing: {e}")


CATEGORICAL_FEATURES = [
    "pathogen_code",
    "sector",
    "sub_sector",
    "specimen_type",
    "antibiotic_class",
    "test_method",
    "county",
    "urban_rural",
    "patient_sex",
    "ward_type",
    "infection_origin",
]
NUMERIC_FEATURES = [
    "patient_age_years",
    "prior_antibiotic_exposure",
    "sample_month",
]


def _load_training_frame(db: Session) -> pd.DataFrame:
    rows = (
        db.query(AMRIsolateRecord)
        .filter(
            AMRIsolateRecord.lab_confirmed_mdr.isnot(None),
        )
        .all()
    )

    if not rows:
        return pd.DataFrame()

    data = []
    for r in rows:
        data.append(
            {
                "pathogen_code": r.pathogen_code,
                "sector": r.sector,
                "sub_sector": r.sub_sector,
                "specimen_type": r.specimen_type,
                "antibiotic_class": r.antibiotic_class,
                "test_method": r.test_method,
                "county": r.county,
                "urban_rural": r.urban_rural,
                "patient_sex": r.patient_sex,
                "ward_type": r.ward_type,
                "infection_origin": r.infection_origin,
                "patient_age_years": float(r.patient_age_years)
                if r.patient_age_years is not None
                else np.nan,
                "prior_antibiotic_exposure": 1 if r.prior_antibiotic_exposure else 0,
                "sample_month": int(r.sample_month) if r.sample_month is not None else np.nan,
                "_sample_collection_date": r.sample_collection_date,
                "_created_at": r.created_at,
                "y": 1 if r.lab_confirmed_mdr else 0,
            }
        )
    return pd.DataFrame(data)


def _evaluate(y_true, y_prob, threshold=0.5) -> dict[str, float]:
    y_pred = (y_prob >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred).ravel()
    tn, fp, fn, tp = (cm + [0, 0, 0, 0])[:4] if len(cm) < 4 else cm

    try:
        auc = roc_auc_score(y_true, y_prob)
    except ValueError:
        auc = None

    return {
        "auc_roc": round(float(auc), 4) if auc is not None else None,
        "sensitivity": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
        "specificity": round(float(tn / (tn + fp) if (tn + fp) else 0), 4),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
        "brier": round(float(brier_score_loss(y_true, y_prob)), 4),
        "samples": int(len(y_true)),
        "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def _build_pipeline():
    from sklearn.compose import ColumnTransformer
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder

    pre = ColumnTransformer(
        transformers=[
            (
                "cat",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="constant", fill_value="unknown")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                    ]
                ),
                CATEGORICAL_FEATURES,
            ),
            (
                "num",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="median")),
                    ]
                ),
                NUMERIC_FEATURES,
            ),
        ],
        remainder="drop",
    )

    model = XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        eval_metric="logloss",
        use_label_encoder=False,
        random_state=42,
        verbosity=0,
    )

    return Pipeline([("pre", pre), ("clf", model)])


def _load_champion_metrics(db: Session) -> dict[str, Any] | None:
    row = db.query(ModelRegistry).filter(ModelRegistry.is_active == True).first()
    if not row:
        return None
    return row.metrics or {}


def _compute_version() -> str:
    now = datetime.now(UTC)
    return f"1.{now.year % 100}.{now.month:02d}{now.day:02d}"


def run_retraining(
    db: Session,
    promote_if_better: bool = True,
    min_samples: int = 100,
) -> dict[str, Any]:
    if not SKLEARN_AVAILABLE:
        return {"status": "error", "detail": "Training dependencies not installed"}

    df = _load_training_frame(db)
    if len(df) < min_samples:
        return {
            "status": "skipped",
            "detail": f"Only {len(df)} confirmed outcomes. Need at least {min_samples}.",
        }

    logger.info(f"Retraining on {len(df)} confirmed outcomes")

    # Sort by actual collection date, not by month-of-year (1-12).
    # Month number does not encode chronological order: month 1 of this year
    # would be treated as "before" month 12 of last year. Use
    # sample_collection_date, fall back to created_at for rows that lack one.
    df["_sort_date"] = pd.to_datetime(df["_sample_collection_date"], errors="coerce")
    df["_sort_date"] = df["_sort_date"].fillna(pd.to_datetime(df["_created_at"], errors="coerce"))

    n_before = len(df)
    df = df.dropna(subset=["_sort_date"]).sort_values("_sort_date").reset_index(drop=True)
    n_after = len(df)
    if n_after < n_before:
        logger.warning(f"Dropped {n_before - n_after} rows with no sample_collection_date or created_at")

    split_idx = int(len(df) * 0.8)
    if split_idx < 1 or split_idx >= len(df):
        return {
            "status": "skipped",
            "detail": f"Cannot split {len(df)} rows into 80/20",
        }

    train_df = df.iloc[:split_idx].copy()
    test_df = df.iloc[split_idx:].copy()
    split_date = df.iloc[split_idx]["_sort_date"]
    logger.info(f"Temporal split at {split_date}: {len(train_df)} train / {len(test_df)} test")

    drop_cols = ["y", "_sort_date", "_sample_collection_date", "_created_at"]
    X_train = train_df.drop(columns=drop_cols)
    y_train = train_df["y"]
    X_test = test_df.drop(columns=drop_cols)
    y_test = test_df["y"]

    if len(train_df) < 50 or len(test_df) < 10:
        return {"status": "skipped", "detail": "Insufficient samples after split"}

    pipeline = _build_pipeline()
    calibrated = CalibratedClassifierCV(pipeline, method="sigmoid", cv=3)
    calibrated.fit(X_train, y_train)

    y_prob = calibrated.predict_proba(X_test)[:, 1]
    metrics = _evaluate(y_test.values, y_prob)

    version = _compute_version()

    model_dir = Path(settings.MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    artifact_path = model_dir / f"mdr_model_{version}.pkl"
    joblib.dump(calibrated, artifact_path)
    logger.info(f"Model saved: {artifact_path}")

    champion_metrics = _load_champion_metrics(db)
    promote = False
    comparison = None

    if champion_metrics:
        champ_auc = champion_metrics.get("auc_roc") or 0
        new_auc = metrics.get("auc_roc") or 0
        champ_sens = champion_metrics.get("sensitivity") or 0
        new_sens = metrics.get("sensitivity") or 0

        comparison = {
            "champion_auc": champ_auc,
            "challenger_auc": new_auc,
            "champion_sensitivity": champ_sens,
            "challenger_sensitivity": new_sens,
            "auc_delta": round(new_auc - champ_auc, 4),
            "sensitivity_delta": round(new_sens - champ_sens, 4),
        }

        if new_auc >= champ_auc and new_sens >= champ_sens - 0.02:
            promote = True
    else:
        promote = True

    if promote_if_better and promote:
        db.query(ModelRegistry).update({ModelRegistry.is_active: False})
        entry = ModelRegistry(
            version=version,
            algorithm="XGBoost + sigmoid calibration",
            trained_at=datetime.now(UTC),
            metrics={
                **metrics,
                "training_samples": int(len(df)),
                "training_features": CATEGORICAL_FEATURES + NUMERIC_FEATURES,
                "artifact_path": str(artifact_path),
            },
            feature_names=CATEGORICAL_FEATURES + NUMERIC_FEATURES,
            artifact_path=str(artifact_path),
            is_active=True,
            notes=f"Auto-trained on {len(df)} confirmed outcomes. Version {version}.",
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        logger.info(f"Promoted new model version {version}")

        return {
            "status": "promoted",
            "version": version,
            "metrics": metrics,
            "comparison": comparison,
            "artifact_path": str(artifact_path),
        }

    entry = ModelRegistry(
        version=version,
        algorithm="XGBoost + sigmoid calibration",
        trained_at=datetime.now(UTC),
        metrics={
            **metrics,
            "training_samples": int(len(df)),
            "artifact_path": str(artifact_path),
        },
        feature_names=CATEGORICAL_FEATURES + NUMERIC_FEATURES,
        artifact_path=str(artifact_path),
        is_active=False,
        notes=f"Challenger. Not promoted. Version {version}.",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {
        "status": "challenger_registered",
        "version": version,
        "metrics": metrics,
        "comparison": comparison,
        "artifact_path": str(artifact_path),
    }
