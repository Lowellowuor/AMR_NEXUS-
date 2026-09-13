"""Notification dispatcher — reads preferences and routes to channels."""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from src.db.models import (
    User, NotificationPreference, NotificationLog,
)
from src.services import email_service
from src.services.sms_service import send_sms
from src.utils.logger import logger

SEVERITY_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}


def _rank(severity: str) -> int:
    return SEVERITY_RANK.get((severity or "medium").lower(), 1)


def _meets_threshold(alert_severity: str, user_threshold: str) -> bool:
    return _rank(alert_severity) >= _rank(user_threshold)


def _build_message(
    alert: Dict[str, Any],
    user: Optional[User] = None,
) -> Dict[str, str]:
    pathogen = (alert.get("pathogen_code") or alert.get("pathogen") or "Unknown").upper()
    county = alert.get("county") or "unknown county"
    severity = (alert.get("severity") or "medium").upper()
    mdr = alert.get("mdr_probability")
    mdr_txt = f"{mdr * 100:.0f}% MDR" if isinstance(mdr, (int, float)) else ""

    subject = f"[AMR Nexus] {severity} alert — {pathogen} in {county}"

    body_lines = [
        f"AMR Nexus alert",
        "",
        f"Severity:    {severity}",
        f"Pathogen:    {pathogen}",
        f"County:      {county}",
    ]
    if mdr_txt:
        body_lines.append(f"Prediction:  {mdr_txt}")
    if alert.get("sub_county"):
        body_lines.append(f"Sub-county:  {alert['sub_county']}")
    if alert.get("sector"):
        body_lines.append(f"Sector:      {alert['sector']}")
    if alert.get("message"):
        body_lines.append(f"Note:        {alert['message']}")
    body_lines += [
        "",
        "This is a decision-support alert. Confirm with laboratory data before acting.",
        "",
        "— AMR Nexus, Republic of Kenya",
    ]
    body = "\n".join(body_lines)

    sms_body = (
        f"AMR {severity}: {pathogen} in {county}"
        + (f" — {mdr_txt}" if mdr_txt else "")
        + ". Confirm in AMR Nexus."
    )

    return {"subject": subject, "body": body, "sms": sms_body[:300]}


def _log(db: Session, **kwargs) -> NotificationLog:
    entry = NotificationLog(**kwargs)
    db.add(entry)
    try:
        db.commit()
        db.refresh(entry)
    except Exception as e:
        logger.warning(f"Failed to write notification log: {e}")
    return entry


def get_or_create_prefs(db: Session, user: User) -> NotificationPreference:
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user.id
    ).first()
    if prefs:
        return prefs
    prefs = NotificationPreference(user_id=user.id)
    db.add(prefs)
    db.commit()
    db.refresh(prefs)
    return prefs


def dispatch_alert(
    db: Session,
    alert: Dict[str, Any],
    recipients: Optional[List[User]] = None,
    force_channels: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Dispatch a single alert to all eligible users.

    recipients — optional override; otherwise all active users
    force_channels — list of "email"/"sms" to ignore user preferences
    """
    severity = (alert.get("severity") or "medium").lower()

    users_q = db.query(User).filter(User.is_active == True)
    users = recipients if recipients is not None else users_q.all()

    msg = _build_message(alert, None)
    results = {"email": 0, "sms": 0, "skipped": 0, "errors": 0}

    for user in users:
        prefs = get_or_create_prefs(db, user)

        # Email
        want_email = (
            force_channels and "email" in force_channels
        ) or (
            prefs.email_enabled and _meets_threshold(severity, prefs.email_severity or "critical")
        )
        if want_email:
            log = _log(
                db,
                channel="email",
                severity=severity,
                recipient_user_id=user.id,
                recipient_email=user.email,
                subject=msg["subject"],
                body=msg["body"],
                alert_id=str(alert.get("id") or alert.get("record_id") or ""),
                status="queued",
            )
            res = email_service.send_email(user.email, msg["subject"], msg["body"])
            if res["status"] == "sent":
                log.status = "sent"
                log.sent_at = datetime.now(timezone.utc)
                log.provider_ref = res.get("ref")
                results["email"] += 1
            elif res["status"] == "skipped":
                log.status = "skipped"
                log.error = res.get("detail")
                results["skipped"] += 1
            else:
                log.status = "error"
                log.error = res.get("detail")
                results["errors"] += 1
            db.commit()

        # SMS
        want_sms = (
            force_channels and "sms" in force_channels
        ) or (
            prefs.sms_enabled
            and prefs.sms_phone
            and _meets_threshold(severity, prefs.sms_severity or "critical")
        )
        if want_sms and prefs.sms_phone:
            log = _log(
                db,
                channel="sms",
                severity=severity,
                recipient_user_id=user.id,
                recipient_phone=prefs.sms_phone,
                body=msg["sms"],
                alert_id=str(alert.get("id") or alert.get("record_id") or ""),
                status="queued",
            )
            try:
                res = send_sms(prefs.sms_phone, msg["sms"])
                if res.get("status") == "success" or res.get("status") == "sent":
                    log.status = "sent"
                    log.sent_at = datetime.now(timezone.utc)
                    log.provider_ref = str(res.get("ref") or "")
                    results["sms"] += 1
                elif res.get("status") == "error":
                    log.status = "error"
                    log.error = res.get("detail")
                    results["errors"] += 1
                else:
                    log.status = "skipped"
                    log.error = res.get("detail") or res.get("status")
                    results["skipped"] += 1
            except Exception as e:
                log.status = "error"
                log.error = str(e)
                results["errors"] += 1
            db.commit()

    return results


def dispatch_prediction_alert(db: Session, record) -> Dict[str, Any]:
    """Convenience wrapper used by the prediction pipeline."""
    severity = "high"
    try:
        prob = float(record.mdr_probability or 0)
        if record.anomaly_flag and prob >= 0.85:
            severity = "critical"
        elif record.anomaly_flag or prob >= 0.85:
            severity = "high"
        elif prob >= 0.6:
            severity = "medium"
        else:
            severity = "low"
    except Exception:
        pass

    alert = {
        "id": str(record.record_id),
        "severity": severity,
        "pathogen_code": record.pathogen_code,
        "county": record.county,
        "sub_county": record.sub_county,
        "sector": record.sector,
        "mdr_probability": float(record.mdr_probability) if record.mdr_probability else None,
        "message": record.shap_summary,
    }
    return dispatch_alert(db, alert)
