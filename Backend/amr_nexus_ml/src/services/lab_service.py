from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db.models import AMRIsolateRecord, LabRequest, User

VALID_STATUS = ("pending", "in_progress", "completed", "rejected")
VALID_PRIORITY = ("routine", "urgent", "stat")


def _serialise(req: LabRequest, isolate: AMRIsolateRecord | None, user_lookup: dict) -> dict[str, Any]:
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
        "completed_at": req.completed_at.isoformat() if req.completed_at else None,
        "completed_by": req.completed_by,
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
        return _serialise(existing, isolate, _user_lookup(db))

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
    return _serialise(req, isolate, _user_lookup(db))


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

    return [_serialise(r, iso_map.get(r.record_id), users) for r in requests]


def get_request(db: Session, request_id: int) -> dict[str, Any] | None:
    req = db.get(LabRequest, request_id)
    if req is None:
        return None
    isolate = (
        db.execute(select(AMRIsolateRecord).where(AMRIsolateRecord.record_id == req.record_id))
        .scalars()
        .first()
    )
    return _serialise(req, isolate, _user_lookup(db))


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
    return _serialise(req, isolate, _user_lookup(db))


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
    return _serialise(req, isolate, _user_lookup(db))
