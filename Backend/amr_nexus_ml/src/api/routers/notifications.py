from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel

from src.api.deps import get_db, get_current_user, require_admin
from src.db.models import User, NotificationLog, NotificationPreference
from src.services.notification_service import (
    get_or_create_prefs, dispatch_alert,
)
from src.services import email_service

router = APIRouter()


def _serialize_prefs(p: NotificationPreference) -> dict:
    return {
        "email_enabled": bool(p.email_enabled),
        "email_severity": p.email_severity,
        "sms_enabled": bool(p.sms_enabled),
        "sms_severity": p.sms_severity,
        "sms_phone": p.sms_phone or "",
        "desktop_enabled": bool(p.desktop_enabled),
    }


class PrefsIn(BaseModel):
    email_enabled: Optional[bool] = None
    email_severity: Optional[str] = None
    sms_enabled: Optional[bool] = None
    sms_severity: Optional[str] = None
    sms_phone: Optional[str] = None
    desktop_enabled: Optional[bool] = None


class ManualSendIn(BaseModel):
    alert_id: Optional[str] = None
    severity: str = "high"
    pathogen_code: Optional[str] = None
    county: Optional[str] = None
    message: Optional[str] = None
    channels: Optional[List[str]] = None
    recipient_email: Optional[str] = None


@router.get("/preferences")
async def get_prefs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = get_or_create_prefs(db, current_user)
    return _serialize_prefs(p)


@router.patch("/preferences")
async def update_prefs(
    payload: PrefsIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = get_or_create_prefs(db, current_user)
    data = payload.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return _serialize_prefs(p)


@router.get("/status")
async def delivery_status(
    current_user: User = Depends(get_current_user),
):
    return {
        "email_configured": email_service.is_configured(),
        "sms_configured": True,  # Africa's Talking is imported; gate on credentials
    }


@router.post("/send")
async def manual_send(
    payload: ManualSendIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    alert = {
        "id": payload.alert_id,
        "severity": payload.severity,
        "pathogen_code": payload.pathogen_code,
        "county": payload.county,
        "message": payload.message,
    }
    recipients = None
    if payload.recipient_email:
        target = db.query(User).filter(User.email == payload.recipient_email).first()
        if not target:
            raise HTTPException(status_code=404, detail="Recipient not found")
        recipients = [target]
    results = dispatch_alert(
        db, alert, recipients=recipients, force_channels=payload.channels,
    )
    return results


@router.get("/log")
async def list_log(
    limit: int = Query(100, ge=1, le=500),
    channel: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(NotificationLog)
    if channel and channel != "all":
        q = q.filter(NotificationLog.channel == channel)
    if status and status != "all":
        q = q.filter(NotificationLog.status == status)
    rows = q.order_by(desc(NotificationLog.created_at)).limit(limit).all()
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "channel": r.channel,
            "severity": r.severity,
            "recipient_email": r.recipient_email,
            "recipient_phone": r.recipient_phone,
            "subject": r.subject,
            "body": r.body,
            "alert_id": r.alert_id,
            "status": r.status,
            "error": r.error,
            "sent_at": r.sent_at.isoformat() if r.sent_at else None,
        }
        for r in rows
    ]
