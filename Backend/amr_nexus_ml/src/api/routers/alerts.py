from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from uuid import UUID

from src.api.deps import get_db, get_current_user
from src.db.models import AMRIsolateRecord, AlertAcknowledgement, User
from src.core.config import settings

alerts_router = APIRouter()


def _severity(r: AMRIsolateRecord) -> str:
    if r.anomaly_flag and (r.mdr_probability or 0) >= 0.85:
        return "critical"
    if r.anomaly_flag:
        return "high"
    if (r.mdr_probability or 0) >= 0.85:
        return "high"
    if (r.mdr_probability or 0) >= 0.60:
        return "medium"
    return "low"


def _serialize(r: AMRIsolateRecord, ack: Optional[AlertAcknowledgement]) -> Dict[str, Any]:
    return {
        "id": str(r.record_id),
        "record_id": str(r.record_id),
        "timestamp": r.created_at.isoformat() if r.created_at else None,
        "severity": _severity(r),
        "type": "anomaly" if r.anomaly_flag else "high_mdr",
        "pathogen_code": r.pathogen_code or "",
        "county": r.county or "",
        "sub_county": r.sub_county or "",
        "sector": r.sector or "",
        "mdr_probability": float(r.mdr_probability) if r.mdr_probability is not None else 0.0,
        "anomaly_score": float(r.anomaly_score) if r.anomaly_score is not None else 0.0,
        "anomaly_flag": bool(r.anomaly_flag),
        "shap_summary": r.shap_summary or "",
        "shap_top_feature": r.shap_top_feature or "",
        "shap_value": float(r.shap_value) if r.shap_value is not None else 0.0,
        "message": _build_message(r),
        "acknowledged": bool(ack.acknowledged) if ack else False,
        "acknowledged_at": ack.acknowledged_at.isoformat() if ack and ack.acknowledged_at else None,
        "acknowledged_by": ack.acknowledged_by if ack else None,
        "resolved": bool(ack.resolved) if ack else False,
        "resolved_at": ack.resolved_at.isoformat() if ack and ack.resolved_at else None,
        "resolved_by": ack.resolved_by if ack else None,
        "resolution_note": ack.resolution_note if ack else None,
        "assigned_to": ack.assigned_to if ack else None,
    }


def _build_message(r: AMRIsolateRecord) -> str:
    pathogen = (r.pathogen_code or "Unknown isolate").upper()
    county = r.county or "unknown county"
    if r.anomaly_flag and (r.mdr_probability or 0) >= 0.85:
        return f"Anomaly with high MDR probability — {pathogen} in {county}"
    if r.anomaly_flag:
        return f"Unusual resistance pattern — {pathogen} in {county}"
    if (r.mdr_probability or 0) >= 0.85:
        return f"High MDR probability — {pathogen} in {county}"
    return f"Elevated MDR probability — {pathogen} in {county}"


@alerts_router.get("", response_model=List[Dict[str, Any]])
@alerts_router.get("/active", response_model=List[Dict[str, Any]])
async def list_alerts(
    county: Optional[str] = None,
    severity: Optional[str] = None,
    type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    include_resolved: bool = False,
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AMRIsolateRecord).filter(
        or_(
            AMRIsolateRecord.anomaly_flag == True,
            AMRIsolateRecord.mdr_probability >= 0.60,
        )
    )
    if county:
        q = q.filter(AMRIsolateRecord.county == county)
    if search:
        like = f"%{search.lower()}%"
        q = q.filter(or_(
            func.lower(AMRIsolateRecord.pathogen_code).like(like),
            func.lower(AMRIsolateRecord.county).like(like),
        ))

    records = q.order_by(desc(AMRIsolateRecord.created_at)).limit(limit).all()

    record_ids = [r.record_id for r in records]
    ack_map = {}
    if record_ids:
        acks = db.query(AlertAcknowledgement).filter(
            AlertAcknowledgement.record_id.in_(record_ids)
        ).all()
        ack_map = {a.record_id: a for a in acks}

    items = [_serialize(r, ack_map.get(r.record_id)) for r in records]

    if severity and severity != "all":
        items = [a for a in items if a["severity"] == severity]
    if type and type != "all":
        items = [a for a in items if a["type"] == type]
    if status_filter == "unacknowledged":
        items = [a for a in items if not a["acknowledged"]]
    elif status_filter == "acknowledged":
        items = [a for a in items if a["acknowledged"] and not a["resolved"]]
    elif status_filter == "resolved":
        items = [a for a in items if a["resolved"]]
    if not include_resolved and not status_filter:
        items = [a for a in items if not a["resolved"]]

    return items


@alerts_router.get("/stats")
async def alert_stats(
    county: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AMRIsolateRecord).filter(
        or_(
            AMRIsolateRecord.anomaly_flag == True,
            AMRIsolateRecord.mdr_probability >= 0.60,
        )
    )
    if county:
        q = q.filter(AMRIsolateRecord.county == county)

    records = q.all()
    record_ids = [r.record_id for r in records]
    ack_map = {}
    if record_ids:
        acks = db.query(AlertAcknowledgement).filter(
            AlertAcknowledgement.record_id.in_(record_ids)
        ).all()
        ack_map = {a.record_id: a for a in acks}

    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    unack = 0
    resolved = 0
    for r in records:
        sev = _severity(r)
        counts[sev] = counts.get(sev, 0) + 1
        ack = ack_map.get(r.record_id)
        if ack and ack.resolved:
            resolved += 1
        elif not (ack and ack.acknowledged):
            unack += 1

    return {
        "total": len(records),
        "unacknowledged": unack,
        "resolved": resolved,
        "by_severity": counts,
    }


@alerts_router.get("/count")
async def get_alerts_count(
    county: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AMRIsolateRecord).filter(
        or_(
            AMRIsolateRecord.anomaly_flag == True,
            AMRIsolateRecord.mdr_probability >= 0.60,
        )
    )
    if county:
        q = q.filter(AMRIsolateRecord.county == county)
    record_ids = [r.record_id for r in q.all()]
    unack = 0
    if record_ids:
        acked = db.query(AlertAcknowledgement.record_id).filter(
            AlertAcknowledgement.record_id.in_(record_ids),
            AlertAcknowledgement.acknowledged == True,
            AlertAcknowledgement.resolved == False,
        ).all()
        acked_set = {row[0] for row in acked}
        unack = len(record_ids) - len(acked_set)
    return {"count": unack}


def _get_or_create_ack(db: Session, record_id: UUID) -> AlertAcknowledgement:
    ack = db.query(AlertAcknowledgement).filter(
        AlertAcknowledgement.record_id == record_id
    ).first()
    if not ack:
        ack = AlertAcknowledgement(record_id=record_id)
        db.add(ack)
        db.flush()
    return ack


def _parse_uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid alert ID")


@alerts_router.patch("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rid = _parse_uuid(alert_id)
    ack = _get_or_create_ack(db, rid)
    ack.acknowledged = True
    ack.acknowledged_at = datetime.now(timezone.utc)
    ack.acknowledged_by = current_user.name or current_user.email
    db.commit()
    return {"status": "acknowledged", "alert_id": alert_id}


@alerts_router.patch("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rid = _parse_uuid(alert_id)
    ack = _get_or_create_ack(db, rid)
    ack.resolved = True
    ack.resolved_at = datetime.now(timezone.utc)
    ack.resolved_by = current_user.name or current_user.email
    ack.resolution_note = payload.get("note", "")
    if not ack.acknowledged:
        ack.acknowledged = True
        ack.acknowledged_at = datetime.now(timezone.utc)
        ack.acknowledged_by = current_user.name or current_user.email
    db.commit()
    return {"status": "resolved", "alert_id": alert_id}


@alerts_router.patch("/{alert_id}/assign")
async def assign_alert(
    alert_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rid = _parse_uuid(alert_id)
    ack = _get_or_create_ack(db, rid)
    ack.assigned_to = payload.get("assigned_to", "")
    db.commit()
    return {"status": "assigned", "alert_id": alert_id, "assigned_to": ack.assigned_to}


@alerts_router.post("/bulk-acknowledge")
async def bulk_acknowledge(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ids = payload.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    if len(ids) > 200:
        raise HTTPException(status_code=400, detail="Maximum 200 alerts per bulk action")

    actor = current_user.name or current_user.email
    now = datetime.now(timezone.utc)
    count = 0
    for alert_id in ids:
        try:
            rid = UUID(alert_id)
        except (ValueError, TypeError):
            continue
        ack = _get_or_create_ack(db, rid)
        ack.acknowledged = True
        ack.acknowledged_at = now
        ack.acknowledged_by = actor
        count += 1
    db.commit()
    return {"acknowledged": count}
