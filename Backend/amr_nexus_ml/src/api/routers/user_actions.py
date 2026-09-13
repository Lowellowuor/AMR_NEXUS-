from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timezone
from typing import Optional
import io
import csv
from uuid import UUID

from src.api.deps import get_db, get_current_user
from src.db.models import User, AMRIsolateRecord, AuditEvent, DashboardNotification
from src.core.security import verify_password, hash_password

router = APIRouter()


@router.post("/change-password")
async def change_password(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    old = payload.get("old_password") or ""
    new = payload.get("new_password") or ""
    if not verify_password(old, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(new) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    if new == old:
        raise HTTPException(status_code=400, detail="New password must differ from current password")

    current_user.hashed_password = hash_password(new)
    current_user.token_version = (current_user.token_version or 1) + 1
    current_user.must_change_password = False
    db.commit()

    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="update",
        resource="password",
        resource_id=str(current_user.id),
        method="POST",
        path="/user/change-password",
        status_code=200,
        result="success",
    ))
    db.commit()

    return {"status": "ok", "message": "Password changed. Please sign in again."}


@router.post("/logout-all")
async def logout_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.token_version = (current_user.token_version or 1) + 1
    db.commit()

    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="update",
        resource="sessions",
        resource_id=str(current_user.id),
        method="POST",
        path="/user/logout-all",
        status_code=200,
        result="success",
    ))
    db.commit()
    return {"status": "ok", "message": "All sessions invalidated"}


@router.get("/sessions")
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    events = db.query(AuditEvent).filter(
        AuditEvent.actor_id == current_user.id,
        AuditEvent.path.like("%/auth/login"),
    ).order_by(desc(AuditEvent.occurred_at)).limit(limit).all()

    return [
        {
            "id": e.id,
            "occurred_at": e.occurred_at.isoformat() if e.occurred_at else None,
            "ip_address": e.ip_address,
            "user_agent": e.user_agent,
            "result": e.result,
            "status_code": e.status_code,
        }
        for e in events
    ]


@router.get("/activity")
async def my_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
):
    events = db.query(AuditEvent).filter(
        AuditEvent.actor_id == current_user.id,
    ).order_by(desc(AuditEvent.occurred_at)).limit(limit).all()

    return [
        {
            "id": e.id,
            "occurred_at": e.occurred_at.isoformat() if e.occurred_at else None,
            "action": e.action,
            "resource": e.resource,
            "resource_id": e.resource_id,
            "method": e.method,
            "path": e.path,
            "status_code": e.status_code,
            "result": e.result,
            "ip_address": e.ip_address,
        }
        for e in events
    ]


@router.get("/export")
async def export_my_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(AMRIsolateRecord)
    if current_user.role != "admin":
        county = current_user.assigned_county
        if county:
            q = q.filter(AMRIsolateRecord.county == county)
        else:
            q = q.filter(AMRIsolateRecord.record_id == None)  # no data for unassigned
    rows = q.limit(10000).all()

    buf = io.StringIO()
    writer = csv.writer(buf)

    writer.writerow(["AMR Nexus — Personal Data Export"])
    writer.writerow([f"User: {current_user.email}"])
    writer.writerow([f"Role: {current_user.role}"])
    writer.writerow([f"Generated: {datetime.now(timezone.utc).isoformat()}"])
    writer.writerow([])
    writer.writerow(["Records accessible to you"])

    writer.writerow([
        "record_id", "created_at", "pathogen_code", "county", "sub_county",
        "sector", "specimen_type", "antibiotic_class", "mdr_flag",
        "mdr_probability", "anomaly_flag", "anomaly_score",
    ])
    for r in rows:
        writer.writerow([
            str(r.record_id),
            r.created_at.isoformat() if r.created_at else "",
            r.pathogen_code or "",
            r.county or "",
            r.sub_county or "",
            r.sector or "",
            r.specimen_type or "",
            r.antibiotic_class or "",
            r.mdr_flag,
            r.mdr_probability or 0,
            r.anomaly_flag,
            r.anomaly_score or 0,
        ])

    writer.writerow([])
    writer.writerow(["Audit events about you"])
    writer.writerow(["occurred_at", "action", "resource", "result", "path"])
    acts = db.query(AuditEvent).filter(
        AuditEvent.actor_id == current_user.id,
    ).order_by(desc(AuditEvent.occurred_at)).limit(1000).all()
    for e in acts:
        writer.writerow([
            e.occurred_at.isoformat() if e.occurred_at else "",
            e.action or "",
            e.resource or "",
            e.result or "",
            e.path or "",
        ])

    buf.seek(0)
    filename = f"amr_nexus_my_data_{current_user.id}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/delete-request")
async def request_deletion(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reason = (payload.get("reason") or "").strip()[:500]

    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="delete_request",
        resource="user",
        resource_id=str(current_user.id),
        method="POST",
        path="/user/delete-request",
        status_code=200,
        result="success",
        detail=reason,
    ))

    notif = DashboardNotification(
        county=current_user.assigned_county or "national",
        message=(
            f"DATA PROTECTION REQUEST — {current_user.email} requested account deletion. "
            f"Reason: {reason[:200] or '(none provided)'}"
        ),
    )
    db.add(notif)
    db.commit()

    return {
        "status": "requested",
        "message": "Your deletion request has been logged. An administrator will review it.",
    }

@router.post("/force-change-password")
async def force_change_password(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change password when must_change_password is set.
    Does not require the current password because the user just used it to sign in.
    """
    new = (payload.get("new_password") or "").strip()
    if len(new) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not current_user.must_change_password:
        raise HTTPException(status_code=400, detail="Use the standard password change endpoint")

    current_user.hashed_password = hash_password(new)
    current_user.must_change_password = False
    current_user.token_version = (current_user.token_version or 1) + 1
    db.commit()

    db.add(AuditEvent(
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="update",
        resource="password",
        resource_id=str(current_user.id),
        method="POST",
        path="/user/force-change-password",
        status_code=200,
        result="success",
    ))
    db.commit()

    return {"status": "ok", "message": "Password updated. Please sign in again."}

