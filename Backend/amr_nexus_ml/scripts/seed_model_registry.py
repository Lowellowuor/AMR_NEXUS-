from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from src.core.config import settings
from src.database import SessionLocal
from src.db.models import ModelRegistry

BASELINE_VERSION = "1.1.0"
BASELINE_ALGORITHM = "XGBoost + isotonic calibration (baseline)"


def _load_metrics() -> dict:
    metrics_path = Path(settings.MODEL_DIR) / "metrics.json"
    if not metrics_path.exists():
        raise SystemExit(f"[seed] {metrics_path} not found")
    return json.loads(metrics_path.read_text(encoding="utf-8"))


def main() -> int:
    metrics = _load_metrics()

    # Normalise the metric names to what retraining.py expects
    # (auc_roc, sensitivity) from what train.py writes (auc, recall).
    raw_holdout = metrics.get("holdout", {})
    normalised = {
        "auc_roc": float(raw_holdout.get("auc", 0.0)),
        "sensitivity": float(raw_holdout.get("recall", 0.0)),
        "precision": float(raw_holdout.get("precision", 0.0)),
        "f1": float(raw_holdout.get("f1", 0.0)),
        "brier": float(raw_holdout.get("brier", 0.0)),
        "trained_at": metrics.get("trained_at"),
        "training_rows": int(metrics.get("training_rows", 0)),
        "holdout_rows": int(metrics.get("holdout_rows", 0)),
        "cv_auc_mean": float(metrics.get("cv_auc_mean", 0.0)),
        "cv_auc_std": float(metrics.get("cv_auc_std", 0.0)),
        "cv_brier_mean": float(metrics.get("cv_brier_mean", 0.0)),
        "features": metrics.get("features", []),
        "class_balance": metrics.get("class_balance", {}),
        "artifact_path": str(Path(settings.MODEL_DIR) / "mdr_model.pkl"),
        "training_data": "synthetic:kenya_amr_3000_isolates.csv",
        "notes": (
            "Baseline model trained on synthetic data on 2026-09-18. "
            "Reported metrics are on synthetic holdout only. Real-world "
            "performance unknown. Registered so future retrains have a "
            "champion to compare against."
        ),
    }

    db = SessionLocal()
    try:
        existing = (
            db.execute(select(ModelRegistry).where(ModelRegistry.version == BASELINE_VERSION))
            .scalars()
            .first()
        )

        if existing:
            print(f"[seed] ModelRegistry already has {BASELINE_VERSION}, skipping")
            return 0

        db.execute(ModelRegistry.__table__.update().values(is_active=False))

        entry = ModelRegistry(
            version=BASELINE_VERSION,
            algorithm=BASELINE_ALGORITHM,
            trained_at=datetime.now(UTC),
            metrics=normalised,
            is_active=True,
        )
        db.add(entry)
        db.commit()
        print(f"[seed] registered baseline {BASELINE_VERSION} (active)")
        print(f"[seed]   AUC={normalised['auc_roc']:.3f}")
        print(f"[seed]   sensitivity={normalised['sensitivity']:.3f}")
        print(f"[seed]   source={normalised['training_data']}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
