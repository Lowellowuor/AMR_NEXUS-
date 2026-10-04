from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db.models import AMRIsolateRecord, LabRequest, User

VALID_STATUS = ("pending", "in_progress", "completed", "rejected")
VALID_PRIORITY = ("routine", "urgent", "stat")


SLA_HOURS = {
    "routine": {"acknowledge": 24, "complete": 72},
    "urgent": {"acknowledge": 8, "complete": 24},
    "stat": {"acknowledge": 1, "complete": 4},
}


def _sla_window(priority: str, kind: str, db=None) -> int:
    key = f"lab_sla_{priority}_{kind}_hours"
    default = int((SLA_HOURS.get(priority) or SLA_HOURS["routine"])[kind])
    if db is None:
        return default
    try:
        from src.services import config_service

        return int(config_service.get_config(db, key, default))
    except Exception:
        return default


def _sla_status(
    *,
    requested_at,
    acknowledged_at,
    completed_at,
    priority: str,
    kind: str,
    db=None,
) -> dict[str, Any]:
    from datetime import UTC, datetime

    if requested_at is None:
        return {"state": "unknown", "hours_elapsed": None, "hours_allowed": None}

    if kind == "acknowledge":
        deadline_hours = _sla_window(priority, "acknowledge", db)
        ended = acknowledged_at
    else:
        deadline_hours = _sla_window(priority, "complete", db)
        ended = completed_at

    now = datetime.now(UTC)
    if requested_at.tzinfo is None:
        requested_at = requested_at.replace(tzinfo=UTC)

    reference = ended or now
    if reference.tzinfo is None:
        reference = reference.replace(tzinfo=UTC)

    elapsed_hours = round((reference - requested_at).total_seconds() / 3600.0, 1)

    if ended is not None:
        state = "met" if elapsed_hours <= deadline_hours else "missed"
    else:
        if elapsed_hours >= deadline_hours:
            state = "breached"
        elif elapsed_hours >= deadline_hours * 0.75:
            state = "at_risk"
        else:
            state = "on_track"

    return {
        "state": state,
        "hours_elapsed": elapsed_hours,
        "hours_allowed": deadline_hours,
    }


def _serialise(
    req: LabRequest,
    isolate: AMRIsolateRecord | None,
    user_lookup: dict,
    db=None,
) -> dict[str, Any]:
    ack_sla = _sla_status(
        requested_at=req.requested_at,
        acknowledged_at=req.acknowledged_at,
        completed_at=req.completed_at,
        priority=req.priority,
        kind="acknowledge",
        db=db,
    )
    complete_sla = _sla_status(
        requested_at=req.requested_at,
        acknowledged_at=req.acknowledged_at,
        completed_at=req.completed_at,
        priority=req.priority,
        kind="complete",
        db=db,
    )

    return {
        "id": req.id,
        "record_id": str(req.record_id),
        "status": req.status,
        "priority": req.priority,
        "requested_by": req.requested_by,
        "requested_by_name": user_lookup.get(req.requested_by),
        "requested_at": req.requested_at.isoformat() if req.requested_at else None,
        "assigned_to": req.assigned_to,
        "assigned_to_name": user_lookup.get(req.assigned_to),
        "notes": req.notes,
        "result_notes": req.result_notes,
        "acknowledged_at": req.acknowledged_at.isoformat() if req.acknowledged_at else None,
        "acknowledged_by": req.acknowledged_by,
        "acknowledged_by_name": user_lookup.get(req.acknowledged_by),
        "escalated_at": req.escalated_at.isoformat() if req.escalated_at else None,
        "escalation_level": int(req.escalation_level or 0),
        "completed_at": req.completed_at.isoformat() if req.completed_at else None,
        "completed_by": req.completed_by,
        "sla_acknowledge": ack_sla,
        "sla_complete": complete_sla,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "updated_at": req.updated_at.isoformat() if req.updated_at else None,
        "isolate": None
        if isolate is None
        else {
            "pathogen_code": isolate.pathogen_code,
            "county": isolate.county,
            "sector": isolate.sector,
            "specimen_type": isolate.specimen_type,
            "mdr_flag": bool(isolate.mdr_flag) if isolate.mdr_flag is not None else None,
            "mdr_probability": float(isolate.mdr_probability)
            if isolate.mdr_probability is not None
            else None,
            "lab_confirmed_mdr": isolate.lab_confirmed_mdr,
        },
    }


def _user_lookup(db: Session) -> dict:
    users = db.execute(select(User)).scalars().all()
    return {u.id: u.name or u.email for u in users}


def create_request(
    db: Session,
    *,
    record_id: UUID,
    user: User,
    priority: str = "routine",
    notes: str | None = None,
) -> dict[str, Any]:
    if priority not in VALID_PRIORITY:
        raise ValueError(f"priority must be one of {VALID_PRIORITY}")

    isolate = (
        db.execute(select(AMRIsolateRecord).where(AMRIsolateRecord.record_id == record_id)).scalars().first()
    )
    if isolate is None:
        raise ValueError("isolate not found")

    existing = (
        db.execute(
            select(LabRequest)
            .where(
                LabRequest.record_id == record_id,
                LabRequest.status.in_(("pending", "in_progress")),
            )
            .order_by(LabRequest.id.desc())
        )
        .scalars()
        .first()
    )
    if existing is not None:
        return _serialise(existing, isolate, _user_lookup(db), db=db)

    req = LabRequest(
        record_id=record_id,
        status="pending",
        priority=priority,
        requested_by=user.id,
        requested_at=datetime.now(UTC),
        notes=notes,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _serialise(req, isolate, _user_lookup(db), db=db)


def list_requests(
    db: Session,
    *,
    status: str | None = None,
    priority: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    q = select(LabRequest).order_by(LabRequest.requested_at.desc())
    if status:
        q = q.where(LabRequest.status == status)
    if priority:
        q = q.where(LabRequest.priority == priority)
    q = q.limit(limit).offset(offset)

    requests = db.execute(q).scalars().all()
    record_ids = [r.record_id for r in requests]
    isolates = (
        db.execute(select(AMRIsolateRecord).where(AMRIsolateRecord.record_id.in_(record_ids))).scalars().all()
        if record_ids
        else []
    )
    iso_map = {r.record_id: r for r in isolates}
    users = _user_lookup(db)

    return [_serialise(r, iso_map.get(r.record_id), users, db=db) for r in requests]


def get_request(db: Session, request_id: int) -> dict[str, Any] | None:
    req = db.get(LabRequest, request_id)
    if req is None:
        return None
    isolate = (
        db.execute(select(AMRIsolateRecord).where(AMRIsolateRecord.record_id == req.record_id))
        .scalars()
        .first()
    )
    return _serialise(req, isolate, _user_lookup(db), db=db)


def update_status(
    db: Session,
    *,
    request_id: int,
    user: User,
    status: str,
    result_notes: str | None = None,
    confirmed_mdr: bool | None = None,
) -> dict[str, Any]:
    if status not in VALID_STATUS:
        raise ValueError(f"status must be one of {VALID_STATUS}")

    req = db.get(LabRequest, request_id)
    if req is None:
        raise ValueError("request not found")

    req.status = status
    if result_notes is not None:
        req.result_notes = result_notes

    if status == "completed":
        req.completed_at = datetime.now(UTC)
        req.completed_by = user.id

        if confirmed_mdr is not None:
            isolate = (
                db.execute(select(AMRIsolateRecord).where(AMRIsolateRecord.record_id == req.record_id))
                .scalars()
                .first()
            )
            if isolate is not None:
                isolate.lab_confirmed_mdr = confirmed_mdr
                isolate.outcome_confirmed_at = datetime.now(UTC)
                isolate.outcome_confirmed_by = user.id
                isolate.outcome_notes = result_notes

    req.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(req)

    isolate = (
        db.execute(select(AMRIsolateRecord).where(AMRIsolateRecord.record_id == req.record_id))
        .scalars()
        .first()
    )
    return _serialise(req, isolate, _user_lookup(db), db=db)


def pending_for_record(db: Session, record_id: UUID) -> dict[str, Any] | None:
    req = (
        db.execute(
            select(LabRequest)
            .where(
                LabRequest.record_id == record_id,
                LabRequest.status.in_(("pending", "in_progress")),
            )
            .order_by(LabRequest.id.desc())
        )
        .scalars()
        .first()
    )
    if req is None:
        return None
    isolate = (
        db.execute(select(AMRIsolateRecord).where(AMRIsolateRecord.record_id == record_id)).scalars().first()
    )
    return _serialise(req, isolate, _user_lookup(db), db=db)


def acknowledge_request(
    db: Session,
    *,
    request_id: int,
    user: User,
) -> dict[str, Any]:
    from datetime import UTC, datetime

    req = db.get(LabRequest, request_id)
    if req is None:
        raise ValueError("request not found")
    if req.status in ("completed", "rejected"):
        raise ValueError("request is already closed")

    if req.acknowledged_at is None:
        req.acknowledged_at = datetime.now(UTC)
        req.acknowledged_by = user.id
        if req.status == "pending":
            req.status = "in_progress"

    if req.assigned_to is None:
        req.assigned_to = user.id

    req.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(req)

    isolate = (
        db.execute(select(AMRIsolateRecord).where(AMRIsolateRecord.record_id == req.record_id))
        .scalars()
        .first()
    )
    return _serialise(req, isolate, _user_lookup(db), db=db)


def assign_request(
    db: Session,
    *,
    request_id: int,
    assignee_id: int | None,
    user: User,
) -> dict[str, Any]:
    from datetime import UTC, datetime

    req = db.get(LabRequest, request_id)
    if req is None:
        raise ValueError("request not found")

    if assignee_id is not None:
        assignee = db.get(User, assignee_id)
        if assignee is None:
            raise ValueError("assignee not found")

    req.assigned_to = assignee_id
    req.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(req)

    isolate = (
        db.execute(select(AMRIsolateRecord).where(AMRIsolateRecord.record_id == req.record_id))
        .scalars()
        .first()
    )
    return _serialise(req, isolate, _user_lookup(db), db=db)


def escalate_breached_requests(db: Session) -> dict[str, int]:
    from datetime import UTC, datetime

    open_requests = (
        db.execute(select(LabRequest).where(LabRequest.status.in_(("pending", "in_progress"))))
        .scalars()
        .all()
    )

    escalated = 0
    now = datetime.now(UTC)

    for req in open_requests:
        sla = _sla_status(
            requested_at=req.requested_at,
            acknowledged_at=req.acknowledged_at,
            completed_at=req.completed_at,
            priority=req.priority,
            kind="acknowledge",
            db=db,
        )
        if sla["state"] == "breached" and (req.escalation_level or 0) == 0:
            req.escalated_at = now
            req.escalation_level = 1
            req.updated_at = now
            escalated += 1
        elif sla["state"] == "breached" and (req.escalation_level or 0) == 1:
            allowed = sla.get("hours_allowed") or 24
            if sla.get("hours_elapsed") and sla["hours_elapsed"] >= allowed * 2:
                req.escalated_at = now
                req.escalation_level = 2
                req.updated_at = now
                escalated += 1

    if escalated:
        db.commit()

    return {"escalated": escalated, "checked": len(open_requests)}
