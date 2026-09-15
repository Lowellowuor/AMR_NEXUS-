"""
Retrain the MDR prediction model on laboratory-confirmed outcomes.

Reads:  amr_isolate_records WHERE lab_confirmed_mdr IS NOT NULL
Writes: saved_models/candidates/<timestamp>/  (default)
        saved_models/*.pkl                    (with --promote)

Usage:
    python scripts/retrain.py --dry-run
    python scripts/retrain.py --min-rows 50
    python scripts/retrain.py --promote
"""
import sys
import json
import shutil
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    roc_auc_score, precision_score, recall_score, f1_score, brier_score_loss
)

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.core.config import settings
from src.utils.logger import logger

FRONTEND_FEATURES = [
    "sector", "sub_sector", "pathogen_code", "specimen_type",
    "county", "antibiotic_class", "test_method", "sample_month",
    "prior_antibiotic_exposure",
]


def db_path() -> Path:
    # settings may define DATABASE_URL; fall back to amr_data.db in repo root
    root = Path(__file__).resolve().parents[1]
    for candidate in (root / "amr_data.db", root / "src" / "amr_data.db"):
        if candidate.exists():
            return candidate
    raise FileNotFoundError("Could not locate amr_data.db")


def load_confirmed() -> pd.DataFrame:
    con = sqlite3.connect(db_path())
    try:
        df = pd.read_sql_query(
            """
            SELECT *
            FROM amr_isolate_records
            WHERE lab_confirmed_mdr IS NOT NULL
            """,
            con,
        )
    finally:
        con.close()
    return df


def add_pair_frequency(df: pd.DataFrame, pair_freq_map: dict) -> pd.DataFrame:
    key = df["sector"].fillna("") + "_" + df["sub_sector"].fillna("")
    df = df.copy()
    df["sector_sub_pair_count"] = key.map(lambda k: pair_freq_map.get(k, 0))
    return df


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-rows", type=int, default=50)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--promote", action="store_true")
    args = parser.parse_args()

    df = load_confirmed()
    n = len(df)
    logger.info(f"Confirmed rows available: {n}")

    if n == 0:
        logger.warning("No confirmed outcomes yet. Nothing to retrain on.")
        return 1

    class_bal = df["lab_confirmed_mdr"].value_counts().to_dict()
    logger.info(f"Label distribution: {class_bal}")

    if n < args.min_rows:
        logger.warning(
            f"Only {n} confirmed rows; below --min-rows {args.min_rows}. "
            "Refusing to retrain. Increase data or lower --min-rows."
        )
        return 2

    if len(class_bal) < 2:
        logger.warning("Only one label class present; cannot train a classifier.")
        return 3

    if args.dry_run:
        logger.info("Dry run complete. No artifacts written.")
        return 0

    model_dir = Path(settings.MODEL_DIR)
    current_pre = joblib.load(model_dir / "preprocessor.pkl")
    current_originals = joblib.load(model_dir / "original_feature_names.pkl")
    current_pair_map = joblib.load(model_dir / "pair_freq_map.pkl")

    df = add_pair_frequency(df, current_pair_map)
    X = df[current_originals].copy()
    y = df["lab_confirmed_mdr"].astype(int)

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Reuse the existing preprocessor: transform, do not re-fit.
    X_train_p = current_pre.transform(X_train)
    X_val_p = current_pre.transform(X_val)

    pos = (y_train == 1).sum()
    neg = (y_train == 0).sum()
    scale_pos_weight = (neg / pos) if pos else 1.0
    logger.info(f"scale_pos_weight={scale_pos_weight:.3f} (pos={pos}, neg={neg})")

    model = xgb.XGBClassifier(
        n_estimators=settings.XGB_N_ESTIMATORS,
        max_depth=settings.XGB_MAX_DEPTH,
        learning_rate=settings.XGB_LEARNING_RATE,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        random_state=settings.XGB_RANDOM_STATE,
        n_jobs=-1,
        scale_pos_weight=scale_pos_weight,
    )
    model.fit(X_train_p, y_train, eval_set=[(X_val_p, y_val)], verbose=False)

    proba = model.predict_proba(X_val_p)[:, 1]
    pred = (proba >= 0.5).astype(int)

    metrics = {
        "n_train": int(len(X_train)),
        "n_val": int(len(X_val)),
        "auc": float(roc_auc_score(y_val, proba)),
        "brier": float(brier_score_loss(y_val, proba)),
        "precision": float(precision_score(y_val, pred, zero_division=0)),
        "recall": float(recall_score(y_val, pred, zero_division=0)),
        "f1": float(f1_score(y_val, pred, zero_division=0)),
        "pos_rate": float(y.mean()),
    }
    logger.info(f"Metrics: {json.dumps(metrics, indent=2)}")

    # Save to candidate directory; do NOT overwrite production unless --promote
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    cand_dir = model_dir / "candidates" / stamp
    cand_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, cand_dir / "mdr_model.pkl")
    (cand_dir / "metrics.json").write_text(
        json.dumps(metrics, indent=2), encoding="utf-8"
    )
    (cand_dir / "train_meta.json").write_text(
        json.dumps(
            {
                "confirmed_rows": n,
                "class_balance": class_bal,
                "features": list(current_originals),
                "timestamp": stamp,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    logger.info(f"Candidate saved to {cand_dir}")

    if args.promote:
        backup = model_dir / "backup" / stamp
        backup.mkdir(parents=True, exist_ok=True)
        for f in model_dir.glob("*.pkl"):
            shutil.copy2(f, backup / f.name)
        shutil.copy2(cand_dir / "mdr_model.pkl", model_dir / "mdr_model.pkl")
        logger.info(f"Promoted candidate to production. Backup at {backup}")
    else:
        logger.info("Candidate NOT promoted. Re-run with --promote to swap.")

    return 0


if __name__ == "__main__":
    sys.exit(main())