from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from src.database import SessionLocal
from src.db.models import SystemConfig

DEFAULTS = [
    (
        "lab_sla_routine_acknowledge_hours",
        "24",
        "int",
        "Hours allowed to acknowledge a routine lab request",
    ),
    (
        "lab_sla_routine_complete_hours",
        "72",
        "int",
        "Hours allowed to complete a routine lab request",
    ),
    (
        "lab_sla_urgent_acknowledge_hours",
        "8",
        "int",
        "Hours allowed to acknowledge an urgent lab request",
    ),
    (
        "lab_sla_urgent_complete_hours",
        "24",
        "int",
        "Hours allowed to complete an urgent lab request",
    ),
    (
        "lab_sla_stat_acknowledge_hours",
        "1",
        "int",
        "Hours allowed to acknowledge a STAT lab request",
    ),
    (
        "lab_sla_stat_complete_hours",
        "4",
        "int",
        "Hours allowed to complete a STAT lab request",
    ),
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
        print(f"[seed] added {added} lab SLA config keys")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
