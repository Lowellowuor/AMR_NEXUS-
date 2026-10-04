from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from src.database import SessionLocal
from src.db.models import SectorTaxonomy, SystemConfig

DEFAULT_SECTORS = [
    ("human", "human", True, "Human", 10),
    ("animal", "animal", True, "Animal", 20),
    ("environment", "environment", True, "Environment", 30),
    ("livestock", "animal", False, "Livestock", 40),
    ("poultry", "animal", False, "Poultry", 50),
    ("cattle", "animal", False, "Cattle", 60),
    ("goat", "animal", False, "Goat", 70),
    ("pig", "animal", False, "Pig", 80),
    ("swine", "animal", False, "Swine", 90),
]


DEFAULT_CONFIG = [
    ("sentinel_pathogen", "E. coli", "string", "WHO/Quadripartite sentinel organism"),
    ("hotspot_threshold_persistent_rate", "40", "float", "Persistent MDR rate threshold"),
    ("hotspot_threshold_episodic_rate", "25", "float", "Episodic MDR rate threshold"),
    ("hotspot_min_samples", "10", "int", "Minimum samples for Persistent"),
    ("cross_pillar_min_sectors", "2", "int", "Minimum sectors for cross-pillar signal"),
    ("correlation_min_sectors", "3", "int", "Minimum sectors for Pearson r"),
    ("sentinel_lookback_days", "180", "int", "Default lookback window in days"),
]


def main() -> int:
    db = SessionLocal()
    try:
        existing_sectors = db.execute(select(SectorTaxonomy.raw_sector)).scalars().all()
        added_sectors = 0
        for raw, canonical, is_canon, label, order in DEFAULT_SECTORS:
            if raw in existing_sectors:
                continue
            db.add(
                SectorTaxonomy(
                    raw_sector=raw,
                    canonical_sector=canonical,
                    is_canonical=is_canon,
                    display_label=label,
                    display_order=order,
                )
            )
            added_sectors += 1
        db.commit()
        print(f"[seed] sector_taxonomy: {added_sectors} added")

        existing_config = db.execute(select(SystemConfig.key)).scalars().all()
        added_config = 0
        for key, value, vtype, desc in DEFAULT_CONFIG:
            if key in existing_config:
                continue
            db.add(
                SystemConfig(
                    key=key,
                    value=value,
                    value_type=vtype,
                    description=desc,
                )
            )
            added_config += 1
        db.commit()
        print(f"[seed] system_config: {added_config} added")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
