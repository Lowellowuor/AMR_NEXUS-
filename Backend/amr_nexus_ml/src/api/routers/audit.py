from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func
from typing import Optional
from datetime import datetime, timedelta, date
import io
import csv

from src.api.deps import get_db, require_admin
from src.db.models import AuditEvent, User

audit_router = APIRouter()


def _serialize(e: AuditEvent) -> dict:
    return {
        "id": e.id,
        "occurred_at": e.occurred_at.isoformat() if e.occurred_at else None,
        "actor_id": e.actor_id,
        "actor_email": e.actor_email,
        "actor_role": e.actor_role,
        "action": e.action,
        "resource": e.resource,
        "resource_id": e.resource_id,
        "method": e.method,
        "path": e.path,
        "status_code": e.status_code,
        "result": e.result,
        "ip_address": e.ip_address,
        "user_agent": e.user_agent,
    }


def _apply_filters(q, actor, action, resource, result, start_date, end_date, search):
    if actor:
        like = f"%{actor.lower()}%"
        q = q.filter(or_(
            func.lower(AuditEvent.actor_email).like(like),
        ))
    if action and action != "all":
        q = q.filter(AuditEvent.action == action)
    if resource and resource != "all":
        q = q.filter(AuditEvent.resource == resource)
    if result and result != "all":
        q = q.filter(AuditEvent.result == result)
    if start_date:
        try:
            q = q.filter(AuditEvent.occurred_at >= datetime.fromisoformat(start_date))
        except ValueError:
            pass
    if end_date:
        try:
            end = datetime.fromisoformat(end_date) + timedelta(days=1)
            q = q.filter(AuditEvent.occurred_at < end)
        except ValueError:
            pass
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            AuditEvent.path.ilike(like),
            AuditEvent.resource_id.ilike(like),
            AuditEvent.actor_email.ilike(like),
        ))
    return q


@audit_router.get("/events")
async def list_events(
    actor: Optional[str] = None,
    action: Optional[str] = None,
    resource: Optional[str] = None,
    result: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(AuditEvent)
    q = _apply_filters(q, actor, action, resource, result, start_date, end_date, search)
    total = q.count()
    rows = q.order_by(desc(AuditEvent.occurred_at)).offset(skip).limit(limit).all()
    return {
        "total": total,
        "limit": limit,
        "skip": skip,
        "records": [_serialize(e) for e in rows],
    }


@audit_router.get("/stats")
async def audit_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    day_ago = datetime.utcnow() - timedelta(days=1)
    week_ago = datetime.utcnow() - timedelta(days=7)

    total = db.query(AuditEvent).count()
    today = db.query(AuditEvent).filter(AuditEvent.occurred_at >= day_ago).count()
    week = db.query(AuditEvent).filter(AuditEvent.occurred_at >= week_ago).count()
    denied = db.query(AuditEvent).filter(AuditEvent.result == "denied", AuditEvent.occurred_at >= week_ago).count()

    distinct_actors = db.query(func.count(func.distinct(AuditEvent.actor_id))).filter(
        AuditEvent.occurred_at >= week_ago,
        AuditEvent.actor_id.isnot(None),
    ).scalar() or 0

    return {
        "total": total,
        "last_24h": today,
        "last_7d": week,
        "denied_last_7d": denied,
        "distinct_actors_7d": distinct_actors,
    }


@audit_router.get("/export")
async def export_events(
    actor: Optional[str] = None,
    action: Optional[str] = None,
    resource: Optional[str] = None,
    result: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(AuditEvent)
    q = _apply_filters(q, actor, action, resource, result, start_date, end_date, search)
    rows = q.order_by(desc(AuditEvent.occurred_at)).limit(10000).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "id", "occurred_at", "actor_email", "actor_role", "action", "resource",
        "resource_id", "method", "path", "status_code", "result", "ip_address",
    ])
    for e in rows:
        writer.writerow([
            e.id,
            e.occurred_at.isoformat() if e.occurred_at else "",
            e.actor_email or "",
            e.actor_role or "",
            e.action or "",
            e.resource or "",
            e.resource_id or "",
            e.method or "",
            e.path or "",
            e.status_code or "",
            e.result or "",
            e.ip_address or "",
        ])
    buf.seek(0)
    filename = f"audit_events_{date.today()}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@audit_router.get("/actions")
async def available_actions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    actions = [r[0] for r in db.query(AuditEvent.action).distinct().all() if r[0]]
    resources = [r[0] for r in db.query(AuditEvent.resource).distinct().all() if r[0]]
    return {"actions": sorted(actions), "resources": sorted(resources)}
