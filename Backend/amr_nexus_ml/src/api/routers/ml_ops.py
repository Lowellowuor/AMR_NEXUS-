from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db, require_admin
from src.db.models import AMRIsolateRecord, ModelRegistry, User
from src.services.retraining import run_retraining
from src.utils.logger import logger

router = APIRouter()


class RetrainRequest(BaseModel):
    promote_if_better: bool = True
    min_samples: int = 100


@router.post("/retrain")
async def trigger_retrain(
    payload: RetrainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    confirmed = (
        db.query(AMRIsolateRecord)
        .filter(
            AMRIsolateRecord.lab_confirmed_mdr.isnot(None),
        )
        .count()
    )

    if confirmed < payload.min_samples:
        raise HTTPException(
            status_code=400,
            detail=f"Only {confirmed} confirmed outcomes. Need {payload.min_samples}.",
        )

    try:
        result = run_retraining(
            db,
            promote_if_better=payload.promote_if_better,
            min_samples=payload.min_samples,
        )
        return result
    except Exception as e:
        logger.error(f"Retraining failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/retrain/status")
async def retrain_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    confirmed = (
        db.query(AMRIsolateRecord)
        .filter(
            AMRIsolateRecord.lab_confirmed_mdr.isnot(None),
        )
        .count()
    )

    active = db.query(ModelRegistry).filter(ModelRegistry.is_active == True).first()
    total_versions = db.query(ModelRegistry).count()

    return {
        "confirmed_outcomes": confirmed,
        "ready_for_retraining": confirmed >= 100,
        "min_required": 100,
        "active_version": active.version if active else None,
        "total_versions": total_versions,
    }
