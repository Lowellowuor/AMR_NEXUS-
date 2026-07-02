from datetime import datetime, timedelta
from typing import List, Any
from fastapi import BackgroundTasks
from sqlalchemy.orm import Session
from src.core.config import settings
from src.db.models import AMRIsolateRecord


def trigger_alert(record: Any, background_tasks: BackgroundTasks) -> None:
    pass


def get_active_alerts(db: Session) -> List[AMRIsolateRecord]:
    seven_days_ago = datetime.utcnow() - timedelta(days=int(settings.ALERT_ANOMALY_DAYS))
    return (
        db.query(AMRIsolateRecord)
        .filter(
            AMRIsolateRecord.anomaly_flag == True,
            AMRIsolateRecord.created_at >= seven_days_ago,
        )
        .order_by(AMRIsolateRecord.created_at.desc())
        .limit(20)
        .all()
    )
