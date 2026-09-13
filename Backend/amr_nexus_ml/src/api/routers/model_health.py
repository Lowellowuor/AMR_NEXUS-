from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional

from src.api.deps import get_db, get_current_user, require_admin
from src.db.models import User, ModelRegistry, PredictionLog
from src.services.model_health import (
    compute_calibration, compute_drift, compute_performance,
)

router = APIRouter()


@router.get("/registry")
async def get_registry(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.query(ModelRegistry).order_by(desc(ModelRegistry.created_at)).all()
    return [
        {
            "id": m.id,
            "version": m.version,
            "algorithm": m.algorithm,
            "trained_at": m.trained_at.isoformat() if m.trained_at else None,
            "metrics": m.metrics,
            "is_active": bool(m.is_active),
            "notes": m.notes,
        }
        for m in rows
    ]


@router.get("/active")
async def get_active_model(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = db.query(ModelRegistry).filter(ModelRegistry.is_active == True).first()
    if not m:
        return {"version": "1.0.0", "algorithm": "XGBoost", "is_active": True, "notes": "Default from artifact files"}
    return {
        "id": m.id,
        "version": m.version,
        "algorithm": m.algorithm,
        "trained_at": m.trained_at.isoformat() if m.trained_at else None,
        "metrics": m.metrics,
        "is_active": True,
    }


@router.get("/performance")
async def get_performance(
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return compute_performance(db, days)


@router.get("/calibration")
async def get_calibration(
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return compute_calibration(db, days)


@router.get("/drift")
async def get_drift(
    days: int = Query(30, ge=7, le=180),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return compute_drift(db, days)


@router.get("/recent-predictions")
async def recent_predictions(
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.query(PredictionLog).order_by(desc(PredictionLog.created_at)).limit(limit).all()
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "model_version": r.model_version,
            "mdr_probability": float(r.mdr_probability) if r.mdr_probability is not None else None,
            "mdr_flag": r.mdr_flag,
            "anomaly_flag": r.anomaly_flag,
            "confidence_tier": r.confidence_tier,
            "fallback_used": bool(r.fallback_used),
            "latency_ms": float(r.latency_ms) if r.latency_ms is not None else None,
        }
        for r in rows
    ]


@router.post("/register")
async def register_model(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Register a trained model version. Admin only."""
    version = payload.get("version")
    if not version:
        return {"error": "version required"}

    existing = db.query(ModelRegistry).filter(ModelRegistry.version == version).first()
    if existing:
        return {"error": "version already exists"}

    # Deactivate all others if this one is marked active
    if payload.get("is_active"):
        db.query(ModelRegistry).update({ModelRegistry.is_active: False})

    from datetime import datetime, timezone
    entry = ModelRegistry(
        version=version,
        algorithm=payload.get("algorithm"),
        trained_at=datetime.fromisoformat(payload["trained_at"]) if payload.get("trained_at") else datetime.now(timezone.utc),
        metrics=payload.get("metrics"),
        feature_names=payload.get("feature_names"),
        artifact_path=payload.get("artifact_path"),
        is_active=bool(payload.get("is_active")),
        notes=payload.get("notes"),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id, "version": entry.version, "is_active": entry.is_active}
