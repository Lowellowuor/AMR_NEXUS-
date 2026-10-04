from __future__ import annotations

import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db.models import SectorTaxonomy, SystemConfig


def _decode(raw: str, value_type: str) -> Any:
    if value_type == "int":
        return int(raw)
    if value_type == "float":
        return float(raw)
    if value_type == "bool":
        return raw.lower() in ("true", "1", "yes")
    if value_type == "json":
        return json.loads(raw)
    return raw


def get_config(db: Session, key: str, default: Any = None) -> Any:
    row = db.execute(select(SystemConfig).where(SystemConfig.key == key)).scalars().first()
    if row is None:
        return default
    try:
        return _decode(row.value, row.value_type)
    except (ValueError, TypeError):
        return default


def get_all_config(db: Session) -> dict[str, Any]:
    rows = db.execute(select(SystemConfig)).scalars().all()
    return {r.key: _decode(r.value, r.value_type) for r in rows}


def set_config(db: Session, key: str, value: Any, value_type: str | None = None) -> None:
    row = db.execute(select(SystemConfig).where(SystemConfig.key == key)).scalars().first()
    if value_type is None:
        if isinstance(value, bool):
            value_type = "bool"
        elif isinstance(value, int):
            value_type = "int"
        elif isinstance(value, float):
            value_type = "float"
        elif isinstance(value, (dict, list)):
            value_type = "json"
        else:
            value_type = "string"
    raw = json.dumps(value) if value_type == "json" else str(value)
    if row is None:
        db.add(SystemConfig(key=key, value=raw, value_type=value_type))
    else:
        row.value = raw
        row.value_type = value_type
    db.commit()


def get_canonical_sectors(db: Session) -> list[dict[str, Any]]:
    rows = (
        db.execute(
            select(SectorTaxonomy)
            .where(SectorTaxonomy.is_canonical.is_(True))
            .order_by(SectorTaxonomy.display_order)
        )
        .scalars()
        .all()
    )
    return [
        {
            "sector": r.canonical_sector,
            "label": r.display_label or r.canonical_sector,
            "order": r.display_order,
        }
        for r in rows
    ]


def get_sector_alias_map(db: Session) -> dict[str, str]:
    rows = db.execute(select(SectorTaxonomy)).scalars().all()
    return {r.raw_sector.lower(): r.canonical_sector.lower() for r in rows}


def normalise_sector(db: Session, raw: str | None) -> str:
    key = (raw or "unknown").lower()
    return get_sector_alias_map(db).get(key, key)
