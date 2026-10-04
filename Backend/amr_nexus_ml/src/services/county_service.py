from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from src.db.models import AMRIsolateRecord
from src.modules.actions.models import ActionPlan
from src.modules.sampling_sites.models import SamplingSite
from src.services import config_service


def _window(days: int | None) -> datetime:
    if days is None:
        days = 180
    return datetime.now(UTC) - timedelta(days=int(days))


def _sir_lower(col):
    return func.lower(col)


def coverage(db: Session, *, county: str, days: int | None = None) -> dict[str, Any]:
    since = _window(days)

    total_sites = db.query(func.count(SamplingSite.id)).scalar() or 0
    active_sites = (
        db.query(func.count(func.distinct(AMRIsolateRecord.site_id)))
        .filter(
            AMRIsolateRecord.county == county,
            AMRIsolateRecord.created_at >= since,
            AMRIsolateRecord.site_id.isnot(None),
        )
        .scalar()
        or 0
    )

    silent_sites = max(0, total_sites - active_sites)

    submission_counts = (
        db.query(
            AMRIsolateRecord.site_id,
            func.count(AMRIsolateRecord.record_id).label("n"),
        )
        .filter(
            AMRIsolateRecord.county == county,
            AMRIsolateRecord.created_at >= since,
            AMRIsolateRecord.site_id.isnot(None),
        )
        .group_by(AMRIsolateRecord.site_id)
        .all()
    )
    site_map = {s[0]: int(s[1]) for s in submission_counts}

    sites = db.query(SamplingSite).all()
    facilities = []
    for s in sites:
        facilities.append(
            {
                "site_id": s.id,
                "name": getattr(s, "name", None) or f"Site {s.id}",
                "county": getattr(s, "county", None),
                "sub_county": getattr(s, "sub_county", None),
                "submissions": site_map.get(s.id, 0),
                "active": site_map.get(s.id, 0) > 0,
            }
        )

    total_facilities = len(facilities) or 1
    facilities_reporting = sum(1 for f in facilities if f["active"])
    coverage_pct = round((facilities_reporting / total_facilities) * 100, 1)

    return {
        "county": county,
        "window_days": days or 180,
        "total_sites": total_sites,
        "active_sites": active_sites,
        "silent_sites": silent_sites,
        "facilities_reporting": facilities_reporting,
        "coverage_pct": coverage_pct,
        "facilities": sorted(facilities, key=lambda x: -x["submissions"]),
    }


def situation(
    db: Session,
    *,
    county: str,
    days: int | None = None,
) -> dict[str, Any]:
    since = _window(days)

    q = db.query(AMRIsolateRecord).filter(
        AMRIsolateRecord.county == county,
        AMRIsolateRecord.created_at >= since,
    )

    total = q.count()
    mdr = q.filter(AMRIsolateRecord.mdr_flag.is_(True)).count()
    anomalies = q.filter(AMRIsolateRecord.anomaly_flag.is_(True)).count()

    sites_active = (
        db.query(func.count(func.distinct(AMRIsolateRecord.site_id)))
        .filter(
            AMRIsolateRecord.county == county,
            AMRIsolateRecord.created_at >= since,
            AMRIsolateRecord.site_id.isnot(None),
        )
        .scalar()
        or 0
    )

    confirmed = q.filter(AMRIsolateRecord.lab_confirmed_mdr.isnot(None)).count()
    lab_confirmed_mdr = q.filter(AMRIsolateRecord.lab_confirmed_mdr.is_(True)).count()

    return {
        "county": county,
        "window_days": days or 180,
        "total_isolates": int(total),
        "mdr_count": int(mdr),
        "mdr_rate": round((mdr / total) * 100, 1) if total else 0.0,
        "anomaly_count": int(anomalies),
        "anomaly_rate": round((anomalies / total) * 100, 1) if total else 0.0,
        "active_sites": int(sites_active),
        "lab_confirmed": int(confirmed),
        "lab_confirmed_mdr": int(lab_confirmed_mdr),
        "lab_confirmation_coverage_pct": round((confirmed / total) * 100, 1) if total else 0.0,
    }


def sub_county_ranking(
    db: Session,
    *,
    county: str,
    days: int | None = None,
) -> dict[str, Any]:
    since = _window(days)

    rows = (
        db.query(
            AMRIsolateRecord.sub_county,
            func.count(AMRIsolateRecord.record_id).label("total"),
            func.sum(case((AMRIsolateRecord.mdr_flag.is_(True), 1), else_=0)).label("mdr"),
        )
        .filter(
            AMRIsolateRecord.county == county,
            AMRIsolateRecord.created_at >= since,
            AMRIsolateRecord.sub_county.isnot(None),
        )
        .group_by(AMRIsolateRecord.sub_county)
        .all()
    )

    results = []
    rates = []
    for r in rows:
        total = int(r.total or 0)
        mdr = int(r.mdr or 0)
        if total == 0:
            continue
        rate = round((mdr / total) * 100, 1)
        rates.append(rate)
        results.append(
            {
                "sub_county": r.sub_county,
                "samples": total,
                "mdr_count": mdr,
                "mdr_rate": rate,
            }
        )

    median = 0.0
    if rates:
        sorted_rates = sorted(rates)
        mid = len(sorted_rates) // 2
        if len(sorted_rates) % 2 == 0:
            median = round((sorted_rates[mid - 1] + sorted_rates[mid]) / 2, 1)
        else:
            median = round(sorted_rates[mid], 1)

    for r in results:
        r["vs_median"] = round(r["mdr_rate"] - median, 1)
        r["above_median"] = r["mdr_rate"] > median

    results.sort(key=lambda x: -x["mdr_rate"])

    return {
        "county": county,
        "window_days": days or 180,
        "median_rate": median,
        "sub_counties": results,
    }


def burden(
    db: Session,
    *,
    county: str,
    days: int | None = None,
) -> dict[str, Any]:
    since = _window(days)

    total = (
        db.query(func.count(AMRIsolateRecord.record_id))
        .filter(
            AMRIsolateRecord.county == county,
            AMRIsolateRecord.created_at >= since,
        )
        .scalar()
        or 0
    )
    mdr = (
        db.query(func.count(AMRIsolateRecord.record_id))
        .filter(
            AMRIsolateRecord.county == county,
            AMRIsolateRecord.created_at >= since,
            AMRIsolateRecord.mdr_flag.is_(True),
        )
        .scalar()
        or 0
    )
    critical_pathogens = (
        db.query(func.count(func.distinct(AMRIsolateRecord.pathogen_code)))
        .filter(
            AMRIsolateRecord.county == county,
            AMRIsolateRecord.created_at >= since,
            AMRIsolateRecord.mdr_flag.is_(True),
        )
        .scalar()
        or 0
    )

    population = float(config_service.get_config(db, f"county_population_{county.lower()}", 0) or 0)

    mdr_per_100k = None
    if population > 0:
        mdr_per_100k = round((mdr / population) * 100_000, 1)

    return {
        "county": county,
        "window_days": days or 180,
        "total_isolates": int(total),
        "mdr_isolates": int(mdr),
        "mdr_rate": round((mdr / total) * 100, 1) if total else 0.0,
        "distinct_mdr_pathogens": int(critical_pathogens),
        "population": population,
        "mdr_per_100k": mdr_per_100k,
        "note": (
            "MDR burden per capita requires the county population in system_config "
            f"(key: county_population_{county.lower()})."
            if not population
            else None
        ),
    }


def action_plan_status(
    db: Session,
    *,
    county: str,
) -> dict[str, Any]:
    plans = (
        db.query(ActionPlan).filter(ActionPlan.county == county).order_by(ActionPlan.created_at.desc()).all()
    )

    open_count = sum(1 for p in plans if p.status in ("open", "in_progress"))
    overdue = 0
    now = datetime.now(UTC)
    for p in plans:
        if p.status in ("open", "in_progress") and p.due_date:
            due = p.due_date
            if due.tzinfo is None:
                due = due.replace(tzinfo=UTC)
            if due < now:
                overdue += 1

    latest = plans[0] if plans else None

    return {
        "county": county,
        "total_plans": len(plans),
        "open_plans": open_count,
        "overdue_plans": overdue,
        "has_active_plan": open_count > 0,
        "latest_plan": None
        if latest is None
        else {
            "id": latest.id,
            "title": latest.title,
            "status": latest.status,
            "priority": latest.priority,
            "due_date": latest.due_date.isoformat() if latest.due_date else None,
            "created_at": latest.created_at.isoformat() if latest.created_at else None,
        },
    }


def intervention_tracker(
    db: Session,
    *,
    county: str,
    limit: int = 10,
) -> list[dict[str, Any]]:
    plans = (
        db.query(ActionPlan)
        .filter(ActionPlan.county == county)
        .order_by(ActionPlan.created_at.desc())
        .limit(limit)
        .all()
    )

    now = datetime.now(UTC)
    out = []
    for p in plans:
        overdue = False
        if p.due_date and p.status in ("open", "in_progress"):
            due = p.due_date
            if due.tzinfo is None:
                due = due.replace(tzinfo=UTC)
            overdue = due < now
        out.append(
            {
                "id": p.id,
                "title": p.title,
                "status": p.status,
                "priority": p.priority,
                "source_type": p.source_type,
                "source_id": p.source_id,
                "due_date": p.due_date.isoformat() if p.due_date else None,
                "overdue": overdue,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
        )
    return out


def priority_isolates(
    db: Session,
    *,
    county: str,
    limit: int = 5,
    days: int | None = None,
) -> list[dict[str, Any]]:
    since = _window(days)

    rows = (
        db.query(AMRIsolateRecord)
        .filter(
            AMRIsolateRecord.county == county,
            AMRIsolateRecord.created_at >= since,
        )
        .order_by(
            AMRIsolateRecord.mdr_flag.desc(),
            AMRIsolateRecord.anomaly_flag.desc(),
            AMRIsolateRecord.mdr_probability.desc().nullslast(),
        )
        .limit(limit)
        .all()
    )

    return [
        {
            "record_id": str(r.record_id),
            "pathogen_code": r.pathogen_code,
            "county": r.county,
            "sub_county": r.sub_county,
            "sector": r.sector,
            "specimen_type": r.specimen_type,
            "mdr_flag": bool(r.mdr_flag) if r.mdr_flag is not None else None,
            "mdr_probability": float(r.mdr_probability) if r.mdr_probability is not None else None,
            "anomaly_flag": bool(r.anomaly_flag) if r.anomaly_flag is not None else False,
            "case_id": r.case_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
