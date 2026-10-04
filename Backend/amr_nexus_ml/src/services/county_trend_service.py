from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from src.db.dialect import year_month
from src.db.models import AMRIsolateRecord


def _month_buckets(db: Session, column) -> Any:
    return year_month(db, column)


def trend_comparison(
    db: Session,
    *,
    county: str,
    months: int = 12,
) -> dict[str, Any]:
    """
    Month-by-month MDR rate for a county and the national baseline,
    over the last N months. Uses sample_collection_date when present,
    falls back to created_at.
    """
    months = max(3, min(int(months), 36))
    since = datetime.now(UTC) - timedelta(days=months * 31)

    date_col = func.coalesce(
        AMRIsolateRecord.sample_collection_date,
        AMRIsolateRecord.created_at,
    )
    period = year_month(db, date_col).label("period")

    mdr_sum = func.sum(case((AMRIsolateRecord.mdr_flag.is_(True), 1), else_=0)).label("mdr")
    total = func.count(AMRIsolateRecord.record_id).label("total")

    county_rows = (
        db.query(period, total, mdr_sum)
        .filter(
            date_col >= since,
            func.lower(func.trim(AMRIsolateRecord.county)) == county.strip().lower(),
        )
        .group_by(period)
        .all()
    )

    national_rows = db.query(period, total, mdr_sum).filter(date_col >= since).group_by(period).all()

    county_map = {
        str(r.period): {
            "samples": int(r.total or 0),
            "mdr_count": int(r.mdr or 0),
        }
        for r in county_rows
    }
    national_map = {
        str(r.period): {
            "samples": int(r.total or 0),
            "mdr_count": int(r.mdr or 0),
        }
        for r in national_rows
    }

    all_periods = sorted(set(county_map) | set(national_map))

    series = []
    for period in all_periods:
        c = county_map.get(period, {"samples": 0, "mdr_count": 0})
        n = national_map.get(period, {"samples": 0, "mdr_count": 0})
        series.append(
            {
                "month": period,
                "county_rate": round((c["mdr_count"] / c["samples"]) * 100, 1) if c["samples"] else None,
                "county_samples": c["samples"],
                "national_rate": round((n["mdr_count"] / n["samples"]) * 100, 1) if n["samples"] else None,
                "national_samples": n["samples"],
            }
        )

    return {
        "county": county,
        "months": months,
        "series": series,
    }
