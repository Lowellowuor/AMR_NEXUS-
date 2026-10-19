from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from src.db.models import AMRIsolateRecord
from src.services import config_service


def pillar_activity_breakdown(
    db: Session,
    *,
    days: int | None = None,
) -> dict[str, Any]:
    """
    Isolates and MDR rate per (sector, sub_sector) combination.
    This is the finest-grained view the current data supports.
    """
    if days is None:
        days = int(config_service.get_config(db, "sentinel_lookback_days", 180))
    since = datetime.now(UTC) - timedelta(days=int(days))

    rows = (
        db.query(
            AMRIsolateRecord.sector,
            AMRIsolateRecord.sub_sector,
            func.count(AMRIsolateRecord.record_id).label("samples"),
            func.sum(case((AMRIsolateRecord.mdr_flag.is_(True), 1), else_=0)).label("mdr_count"),
            func.sum(case((AMRIsolateRecord.anomaly_flag.is_(True), 1), else_=0)).label("anomaly_count"),
        )
        .filter(
            AMRIsolateRecord.created_at >= since,
            AMRIsolateRecord.sector.isnot(None),
            AMRIsolateRecord.sector != "",
        )
        .group_by(AMRIsolateRecord.sector, AMRIsolateRecord.sub_sector)
        .all()
    )

    by_sector: dict[str, dict[str, Any]] = {}
    for r in rows:
        sector = (r.sector or "").strip()
        if not sector:
            continue
        sub = (r.sub_sector or "").strip() or "unspecified"
        total = int(r.samples or 0)
        mdr = int(r.mdr_count or 0)
        anomaly = int(r.anomaly_count or 0)
        entry = by_sector.setdefault(
            sector,
            {
                "sector": sector,
                "samples": 0,
                "mdr_count": 0,
                "anomaly_count": 0,
                "sub_sectors": [],
            },
        )
        entry["samples"] += total
        entry["mdr_count"] += mdr
        entry["anomaly_count"] += anomaly
        entry["sub_sectors"].append(
            {
                "sub_sector": sub,
                "samples": total,
                "mdr_count": mdr,
                "mdr_rate": round((mdr / total) * 100, 1) if total else 0.0,
                "anomaly_count": anomaly,
            }
        )

    sectors_out = []
    for _sector, entry in by_sector.items():
        total = entry["samples"]
        mdr = entry["mdr_count"]
        entry["mdr_rate"] = round((mdr / total) * 100, 1) if total else 0.0
        entry["sub_sectors"].sort(key=lambda s: -s["samples"])
        sectors_out.append(entry)

    sectors_out.sort(key=lambda s: -s["samples"])
    total_isolates = sum(s["samples"] for s in sectors_out)

    return {
        "window_days": int(days),
        "total_isolates": total_isolates,
        "sector_count": len(sectors_out),
        "sectors": sectors_out,
    }


def amu_resistance_short(
    db: Session,
    *,
    days: int | None = None,
) -> dict[str, Any]:
    """
    Compact AMU / resistance correlation for embedding on the One Health page.
    Reads the same underlying data as /analytics/amu-resistance-correlation.
    """
    if days is None:
        days = int(config_service.get_config(db, "sentinel_lookback_days", 180))
    since = datetime.now(UTC) - timedelta(days=int(days))

    from src.modules.amu.models import AMUConsumption

    amu_rows = (
        db.query(
            AMUConsumption.sector,
            func.sum(AMUConsumption.quantity).label("quantity"),
            func.count(AMUConsumption.id).label("records"),
        )
        .filter(
            AMUConsumption.period_start >= since,
            AMUConsumption.sector.isnot(None),
        )
        .group_by(AMUConsumption.sector)
        .all()
    )

    resistance_rows = (
        db.query(
            AMRIsolateRecord.sector,
            func.count(AMRIsolateRecord.record_id).label("samples"),
            func.sum(case((AMRIsolateRecord.mdr_flag.is_(True), 1), else_=0)).label("mdr_count"),
        )
        .filter(
            AMRIsolateRecord.created_at >= since,
            AMRIsolateRecord.sector.isnot(None),
        )
        .group_by(AMRIsolateRecord.sector)
        .all()
    )

    amu_by_sector = {
        r.sector: {"quantity": float(r.quantity or 0), "records": int(r.records or 0)}
        for r in amu_rows
        if r.sector
    }
    res_by_sector = {
        r.sector: {
            "samples": int(r.samples or 0),
            "mdr_count": int(r.mdr_count or 0),
            "mdr_rate": round((int(r.mdr_count or 0) / int(r.samples)) * 100, 1)
            if int(r.samples or 0)
            else 0.0,
        }
        for r in resistance_rows
        if r.sector
    }

    all_sectors = sorted(set(amu_by_sector) | set(res_by_sector))
    combined = []
    for sector in all_sectors:
        a = amu_by_sector.get(sector, {"quantity": 0.0, "records": 0})
        r = res_by_sector.get(sector, {"samples": 0, "mdr_count": 0, "mdr_rate": 0.0})
        combined.append(
            {
                "sector": sector,
                "amu_quantity": a["quantity"],
                "amu_records": a["records"],
                "resistance_samples": r["samples"],
                "mdr_rate": r["mdr_rate"],
                "has_both": a["records"] > 0 and r["samples"] > 0,
            }
        )

    both = [c for c in combined if c["has_both"]]
    return {
        "window_days": int(days),
        "sectors": combined,
        "sectors_with_both": len(both),
        "note": ("Correlation requires both AMU and resistance data per sector." if len(both) < 2 else None),
    }
