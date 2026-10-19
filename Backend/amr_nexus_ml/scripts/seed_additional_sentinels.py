from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from src.database import SessionLocal
from src.db.models import SystemConfig

DEFAULTS = [
    (
        "sentinel_pathogen_secondary_1",
        "Klebsiella pneumoniae",
        "string",
        "Secondary One Health sentinel: WHO priority pathogen, ESBL/carbapenem concern",
    ),
    (
        "sentinel_pathogen_secondary_2",
        "Staphylococcus aureus",
        "string",
        "Secondary One Health sentinel: MRSA across human/animal/livestock",
    ),
    (
        "sentinel_pathogen_secondary_3",
        "Salmonella spp.",
        "string",
        "Secondary One Health sentinel: food-chain transmission, poultry/human",
    ),
    (
        "sentinel_pathogen_secondary_4",
        "Pseudomonas aeruginosa",
        "string",
        "Secondary One Health sentinel: environmental and hospital reservoirs",
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
        print(f"[seed] added {added} secondary sentinel config keys")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
