from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db, require_admin
from src.db.models import NotificationLog, NotificationPreference, User
from src.services import email_service
from src.services.notification_service import (
    dispatch_alert,
    get_or_create_prefs,
)

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
    email_enabled: bool | None = None
    email_severity: str | None = None
    sms_enabled: bool | None = None
    sms_severity: str | None = None
    sms_phone: str | None = None
    desktop_enabled: bool | None = None


class ManualSendIn(BaseModel):
    alert_id: str | None = None
    severity: str = "high"
    pathogen_code: str | None = None
    county: str | None = None
    message: str | None = None
    channels: list[str] | None = None
    recipient_email: str | None = None


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
        db,
        alert,
        recipients=recipients,
        force_channels=payload.channels,
    )
    return results


@router.get("/log")
async def list_log(
    limit: int = Query(100, ge=1, le=500),
    channel: str | None = None,
    status: str | None = None,
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
