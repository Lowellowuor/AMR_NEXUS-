"""SMTP email delivery."""

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
from src.utils.logger import logger


def _settings() -> Dict[str, Optional[str]]:
    return {
        "host": os.getenv("SMTP_HOST"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER"),
        "password": os.getenv("SMTP_PASSWORD"),
        "sender": os.getenv("SMTP_FROM", "noreply@amrnexus.org"),
    }


def is_configured() -> bool:
    s = _settings()
    return bool(s["host"] and s["user"] and s["password"])


def send_email(to: str, subject: str, body_text: str, body_html: Optional[str] = None) -> Dict[str, Any]:
    """Send an email. Returns {status, detail, ref}."""
    if not is_configured():
        logger.info("Email not configured — skipping send")
        return {"status": "skipped", "detail": "SMTP not configured"}

    s = _settings()

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = s["sender"]
        msg["To"] = to

        msg.attach(MIMEText(body_text, "plain", "utf-8"))
        if body_html:
            msg.attach(MIMEText(body_html, "html", "utf-8"))

        with smtplib.SMTP(s["host"], s["port"], timeout=20) as smtp:
            smtp.starttls()
            smtp.login(s["user"], s["password"])
            smtp.sendmail(s["sender"], [to], msg.as_string())

        return {"status": "sent", "detail": "Email delivered", "ref": None}
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return {"status": "error", "detail": str(e)}
