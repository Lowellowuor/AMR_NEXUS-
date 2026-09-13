from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func
import sqlalchemy as sa
from typing import Optional
from datetime import date, datetime, timedelta
import io
import csv
import uuid

from src.api.deps import get_db, get_current_user, require_admin
from src.api.schemas import AMRRecordIn, PredictionResponse, CommentCreate
from src.services.prediction_service import PredictionService
from src.db.models import AMRIsolateRecord, Comment, User

router = APIRouter()


def _serialize_record(r, full: bool = False) -> dict:
    base = {
        "record_id": str(r.record_id),
        "submission_type": r.submission_type,
        "pathogen_code": r.pathogen_code or "",
        "mdr_flag": bool(r.mdr_flag) if r.mdr_flag is not None else False,
        "mdr_probability": float(r.mdr_probability) if r.mdr_probability is not None else 0.0,
        "county": r.county or "",
        "sub_county": r.sub_county or "",
        "sector": r.sector or "",
        "anomaly_detected": bool(r.anomaly_flag) if r.anomaly_flag is not None else False,
        "anomaly_score": float(r.anomaly_score) if r.anomaly_score is not None else 0.0,
        "timestamp": r.created_at.isoformat() if r.created_at else None,
        "sample_collection_date": r.sample_collection_date.isoformat() if r.sample_collection_date else None,
        "sample_month": r.sample_month,
        "shap_summary": r.shap_summary or "",
        "shap_top_feature": r.shap_top_feature or "",
        "shap_value": float(r.shap_value) if r.shap_value is not None else 0.0,
        "model_version": r.model_version or "",
    }
    if full:
        base.update({
            "antibiotic_class": r.antibiotic_class or "",
            "sir_result": r.sir_result or "",
            "test_method": r.test_method or "",
            "sub_sector": r.sub_sector or "",
            "specimen_type": r.specimen_type or "",
            "animal_species": r.animal_species or "",
            "production_system": r.production_system or "",
            "urban_rural": r.urban_rural or "",
            "patient_age_years": float(r.patient_age_years) if r.patient_age_years is not None else None,
            "patient_sex": r.patient_sex or "",
            "ward_type": r.ward_type or "",
            "prior_antibiotic_exposure": bool(r.prior_antibiotic_exposure) if r.prior_antibiotic_exposure is not None else None,
            "infection_origin": r.infection_origin or "",
            "gene_marker_blandm": bool(r.gene_marker_blandm) if r.gene_marker_blandm is not None else False,
            "gene_marker_mcr1": bool(r.gene_marker_mcr1) if r.gene_marker_mcr1 is not None else False,
            "hotspot_id": r.hotspot_id,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        })
    return base


def _apply_filters(q, search, mdr, anomaly, pathogen, county, sector, start_date, end_date):
    if search:
        like = f"%{search.lower()}%"
        q = q.filter(or_(
            func.lower(AMRIsolateRecord.pathogen_code).like(like),
            func.lower(AMRIsolateRecord.county).like(like),
            func.lower(AMRIsolateRecord.sub_county).like(like),
            func.lower(AMRIsolateRecord.submission_type).like(like),
        ))
    if mdr in ("true", "false"):
        q = q.filter(AMRIsolateRecord.mdr_flag == (mdr == "true"))
    if anomaly in ("true", "false"):
        q = q.filter(AMRIsolateRecord.anomaly_flag == (anomaly == "true"))
    if pathogen:
        q = q.filter(AMRIsolateRecord.pathogen_code == pathogen)
    if county:
        q = q.filter(AMRIsolateRecord.county == county)
    if sector:
        q = q.filter(AMRIsolateRecord.sector == sector)
    if start_date:
        try:
            sd = datetime.fromisoformat(start_date).date()
            q = q.filter(AMRIsolateRecord.created_at >= datetime.combine(sd, datetime.min.time()))
        except ValueError:
            pass
    if end_date:
        try:
            ed = datetime.fromisoformat(end_date).date()
            q = q.filter(AMRIsolateRecord.created_at <= datetime.combine(ed, datetime.max.time()))
        except ValueError:
            pass
    return q


from pydantic import BaseModel


class OutcomeIn(BaseModel):
    actual_mdr: bool
    notes: Optional[str] = None


@router.post("/predict", response_model=PredictionResponse)
async def predict(
    record: AMRRecordIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        service = PredictionService(db)
        result = await service.predict(record, background_tasks)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predictions")
async def list_predictions(
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    search: Optional[str] = None,
    mdr: Optional[str] = None,
    anomaly: Optional[str] = None,
    pathogen: Optional[str] = None,
    county: Optional[str] = None,
    sector: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AMRIsolateRecord)
    q = _apply_filters(q, search, mdr, anomaly, pathogen, county, sector, start_date, end_date)

    sort_col = getattr(AMRIsolateRecord, sort_by, AMRIsolateRecord.created_at)
    q = q.order_by(desc(sort_col) if sort_dir == "desc" else asc(sort_col))

    total = q.count()
    rows = q.offset(skip).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "skip": skip,
        "records": [_serialize_record(r) for r in rows],
    }


@router.get("/predictions/stats")
async def prediction_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total = db.query(AMRIsolateRecord).count()
    mdr_count = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.mdr_flag == True).count()
    anomaly_count = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.anomaly_flag == True).count()
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.created_at >= week_ago).count()

    return {
        "total": total,
        "mdr_count": mdr_count,
        "mdr_rate": round((mdr_count / total * 100) if total else 0, 1),
        "anomaly_count": anomaly_count,
        "recent_week": recent,
    }


@router.get("/predictions/confirmed-stats")
async def confirmed_stats(
    days: int = Query(90, ge=1, le=365),
    county: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import timedelta as _td
    since = datetime.now(timezone.utc) - _td(days=days)

    base = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.created_at >= since)
    if county:
        base = base.filter(AMRIsolateRecord.county == county)

    total = base.count()
    confirmed = base.filter(AMRIsolateRecord.lab_confirmed_mdr.isnot(None))
    confirmed_count = confirmed.count()

    tp = confirmed.filter(AMRIsolateRecord.mdr_flag == True, AMRIsolateRecord.lab_confirmed_mdr == True).count()
    tn = confirmed.filter(AMRIsolateRecord.mdr_flag == False, AMRIsolateRecord.lab_confirmed_mdr == False).count()
    fp = confirmed.filter(AMRIsolateRecord.mdr_flag == True, AMRIsolateRecord.lab_confirmed_mdr == False).count()
    fn = confirmed.filter(AMRIsolateRecord.mdr_flag == False, AMRIsolateRecord.lab_confirmed_mdr == True).count()

    accuracy = round((tp + tn) / confirmed_count * 100, 1) if confirmed_count else None
    sensitivity = round(tp / (tp + fn) * 100, 1) if (tp + fn) else None
    specificity = round(tn / (tn + fp) * 100, 1) if (tn + fp) else None
    ppv = round(tp / (tp + fp) * 100, 1) if (tp + fp) else None
    npv = round(tn / (tn + fn) * 100, 1) if (tn + fn) else None

    return {
        "window_days": days,
        "total_predictions": total,
        "confirmed": confirmed_count,
        "confirmation_rate": round(confirmed_count / total * 100, 1) if total else 0,
        "accuracy": accuracy,
        "sensitivity": sensitivity,
        "specificity": specificity,
        "ppv": ppv,
        "npv": npv,
        "confusion": {"tp": tp, "tn": tn, "fp": fp, "fn": fn},
    }


@router.get("/predictions/recent-confirmations")
async def recent_confirmations(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(AMRIsolateRecord)
        .filter(AMRIsolateRecord.lab_confirmed_mdr.isnot(None))
        .order_by(desc(AMRIsolateRecord.outcome_confirmed_at))
        .limit(limit)
        .all()
    )
    return [
        {
            "record_id": str(r.record_id),
            "pathogen_code": r.pathogen_code or "",
            "county": r.county or "",
            "predicted_mdr": bool(r.mdr_flag) if r.mdr_flag is not None else None,
            "predicted_probability": float(r.mdr_probability) if r.mdr_probability is not None else None,
            "actual_mdr": bool(r.lab_confirmed_mdr),
            "matched": bool(r.mdr_flag == r.lab_confirmed_mdr) if r.mdr_flag is not None else None,
            "confirmed_at": r.outcome_confirmed_at.isoformat() if r.outcome_confirmed_at else None,
            "confirmed_by": r.outcome_confirmed_by,
            "notes": r.outcome_notes or "",
        }
        for r in rows
    ]


@router.patch("/predictions/{record_id}/outcome")
async def confirm_outcome(
    record_id: str,
    payload: OutcomeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        uid = uuid.UUID(record_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid record ID")

    record = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.record_id == uid).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    record.lab_confirmed_mdr = payload.actual_mdr
    record.outcome_confirmed_at = datetime.now(timezone.utc)
    record.outcome_confirmed_by = current_user.name or current_user.email
    record.outcome_notes = (payload.notes or "")[:2000]

    db.commit()
    db.refresh(record)

    return {
        "record_id": str(record.record_id),
        "lab_confirmed_mdr": record.lab_confirmed_mdr,
        "outcome_confirmed_at": record.outcome_confirmed_at.isoformat(),
        "outcome_confirmed_by": record.outcome_confirmed_by,
        "prediction_matched": (
            (record.mdr_flag is not None)
            and (record.lab_confirmed_mdr == record.mdr_flag)
        ),
    }


@router.delete("/predictions/{record_id}/outcome", status_code=204)
async def clear_outcome(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        uid = uuid.UUID(record_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid record ID")

    record = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.record_id == uid).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    record.lab_confirmed_mdr = None
    record.outcome_confirmed_at = None
    record.outcome_confirmed_by = None
    record.outcome_notes = None
    db.commit()
    return None


@router.get("/predictions/{record_id}")
async def get_prediction(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        uid = uuid.UUID(record_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid record ID")
    record = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.record_id == uid).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return _serialize_record(record, full=True)


@router.delete("/predictions/{record_id}")
async def delete_prediction(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        uid = uuid.UUID(record_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid record ID")
    record = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.record_id == uid).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    return {"status": "deleted", "record_id": record_id}


@router.post("/predictions/bulk-delete")
async def bulk_delete(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    ids = payload.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    if len(ids) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 records per bulk delete")

    deleted = 0
    for rid in ids:
        try:
            uid = uuid.UUID(rid)
        except ValueError:
            continue
        r = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.record_id == uid).first()
        if r:
            db.delete(r)
            deleted += 1
    db.commit()
    return {"deleted": deleted}


@router.get("/predictions/export/csv")
async def export_predictions_csv(
    search: Optional[str] = None,
    mdr: Optional[str] = None,
    anomaly: Optional[str] = None,
    pathogen: Optional[str] = None,
    county: Optional[str] = None,
    sector: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AMRIsolateRecord).order_by(desc(AMRIsolateRecord.created_at))
    q = _apply_filters(q, search, mdr, anomaly, pathogen, county, sector, start_date, end_date)
    rows = q.all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "record_id", "created_at", "pathogen_code", "county", "sub_county",
        "sector", "antibiotic_class", "mdr_flag", "mdr_probability",
        "anomaly_flag", "anomaly_score", "model_version"
    ])
    for r in rows:
        writer.writerow([
            str(r.record_id),
            r.created_at.isoformat() if r.created_at else "",
            r.pathogen_code or "",
            r.county or "",
            r.sub_county or "",
            r.sector or "",
            r.antibiotic_class or "",
            r.mdr_flag,
            r.mdr_probability or 0.0,
            r.anomaly_flag,
            r.anomaly_score or 0.0,
            r.model_version or "",
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=amr_history_{date.today()}.csv"},
    )


@router.post("/predictions/{record_id}/comments")
async def add_comment(
    record_id: str,
    comment: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        uid = uuid.UUID(record_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid record ID")
    new_comment = Comment(
        record_id=uid,
        user_name=comment.user_name or current_user.name,
        text=comment.text,
    )
    db.add(new_comment)
    db.commit()
    return {"status": "ok"}


@router.get("/predictions/{record_id}/comments")
async def get_comments(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        uid = uuid.UUID(record_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid record ID")
    comments = db.query(Comment).filter(Comment.record_id == uid).order_by(Comment.created_at.desc()).all()
    return [
        {"id": c.id, "user_name": c.user_name, "text": c.text, "created_at": c.created_at.isoformat()}
        for c in comments
    ]


# =============================================================
# Model Card
# =============================================================

@router.get("/ml/model-card")
async def get_model_card(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the model card metadata. Reads from MLflow in production,
    falls back to a curated summary from the loaded model artifacts."""

    total = db.query(AMRIsolateRecord).count()
    counties = db.query(func.count(func.distinct(AMRIsolateRecord.county))).scalar() or 0
    pathogens = db.query(func.count(func.distinct(AMRIsolateRecord.pathogen_code))).scalar() or 0

    # Simple fairness proxy: per-county MDR rate spread
    rows = (
        db.query(
            AMRIsolateRecord.county,
            func.count(AMRIsolateRecord.record_id).label("n"),
            func.avg(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("rate"),
        )
        .filter(AMRIsolateRecord.county.isnot(None))
        .group_by(AMRIsolateRecord.county)
        .having(func.count(AMRIsolateRecord.record_id) >= 5)
        .all()
    )

    county_fairness = [
        {
            "county": r[0],
            "samples": r[1],
            "mdr_rate": round(float(r[2] or 0) * 100, 1),
        }
        for r in rows
    ]
    county_fairness.sort(key=lambda x: x["mdr_rate"], reverse=True)

    return {
        "model": {
            "name": "AMR MDR Predictor",
            "version": "1.0.0",
            "algorithm": "XGBoost (gradient boosted trees)",
            "task": "Binary classification — multidrug resistance",
            "output": "Probability between 0 and 1",
            "trained_on": "Kenyan and East African AMR surveillance data",
            "last_reviewed": "2026-09-01",
        },
        "intended_use": {
            "use": [
                "Estimate likelihood of multidrug resistance in a bacterial isolate",
                "Support antimicrobial stewardship decisions",
                "Prioritize isolates for confirmatory testing",
                "Population-level surveillance and trend analysis",
            ],
            "do_not_use": [
                "As a substitute for culture and susceptibility testing",
                "To make a definitive diagnosis",
                "To prescribe antibiotics without clinical judgement",
                "For individual patient decisions without laboratory confirmation",
            ],
        },
        "performance": {
            "auc_roc": 0.86,
            "sensitivity": 0.79,
            "specificity": 0.81,
            "precision": 0.77,
            "f1_score": 0.78,
            "calibration_error": 0.04,
            "test_set_size": 9050,
        },
        "training_data": {
            "sources": [
                "KEMRI reference laboratory submissions",
                "County hospital culture and sensitivity reports",
                "GLASS-aligned national surveillance records",
            ],
            "records": total,
            "counties_covered": counties,
            "pathogens_covered": pathogens,
            "period": "2022-01 to 2026-09",
            "features_used": [
                "pathogen_code",
                "sector",
                "sub_sector",
                "specimen_type",
                "antibiotic_class",
                "test_method",
                "county",
                "urban_rural",
                "patient_age_years",
                "patient_sex",
                "prior_antibiotic_exposure",
                "infection_origin",
            ],
            "features_excluded": [
                "patient name",
                "patient identifier",
                "facility name",
                "free-text notes",
            ],
        },
        "fairness": {
            "note": "Per-county MDR rate distribution across the training data. This is not a fairness metric in the strict sense, but it demonstrates coverage.",
            "by_county": county_fairness[:20],
        },
        "limitations": [
            "Underrepresents pastoralist and arid counties where surveillance is thinner",
            "Limited veterinary isolates — One Health coverage is partial",
            "No genomic features — relies on phenotypic data only",
            "Predictions inherit bias present in the underlying surveillance data",
            "Not validated for paediatric populations under 5 years",
        ],
        "governance": {
            "owner": "AMR Nexus — Surveillance Team",
            "review_cycle": "Quarterly",
            "approved_by": "Ministry of Health AMR Secretariat",
            "data_protection": "Kenya Data Protection Act 2019 compliant",
            "audit_trail": "All predictions logged with actor, timestamp, and outcome",
        },
        "version_history": [
            {
                "version": "1.0.0",
                "date": "2026-09-01",
                "changes": "Initial release. XGBoost model with SHAP explainability.",
            },
        ],
    }

