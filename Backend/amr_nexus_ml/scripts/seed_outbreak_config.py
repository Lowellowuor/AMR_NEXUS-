from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from src.database import SessionLocal
from src.db.models import SystemConfig

DEFAULTS = [
    (
        "outbreak_min_isolates",
        "20",
        "int",
        "Minimum isolate count in a county to trigger a notify-county action",
    ),
    (
        "outbreak_local_share_pct",
        "20.0",
        "float",
        "Local share percentage above which a pathogen is flagged as elevated",
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
        print(f"[seed] added {added} outbreak config keys")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
