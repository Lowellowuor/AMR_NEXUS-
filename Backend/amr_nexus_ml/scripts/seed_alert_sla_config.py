from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from src.database import SessionLocal
from src.db.models import SystemConfig

DEFAULTS = [
    ("alert_sla_critical_acknowledge_hours", "1", "int", "Hours allowed to acknowledge a critical alert"),
    ("alert_sla_critical_resolve_hours", "4", "int", "Hours allowed to resolve a critical alert"),
    ("alert_sla_high_acknowledge_hours", "8", "int", "Hours allowed to acknowledge a high alert"),
    ("alert_sla_high_resolve_hours", "24", "int", "Hours allowed to resolve a high alert"),
    ("alert_sla_medium_acknowledge_hours", "24", "int", "Hours allowed to acknowledge a medium alert"),
    ("alert_sla_medium_resolve_hours", "72", "int", "Hours allowed to resolve a medium alert"),
    ("alert_sla_low_acknowledge_hours", "72", "int", "Hours allowed to acknowledge a low alert"),
    ("alert_sla_low_resolve_hours", "168", "int", "Hours allowed to resolve a low alert"),
]


def main() -> int:
    db = SessionLocal()
    try:
        existing = db.execute(select(SystemConfig.key)).scalars().all()
        added = 0
        for key, value, vtype, desc in DEFAULTS:
            if key in existing:
                continue
            db.add(SystemConfig(key=key, value=value, value_type=vtype, description=desc))
            added += 1
        db.commit()
        print(f"[seed] added {added} alert SLA config keys")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
