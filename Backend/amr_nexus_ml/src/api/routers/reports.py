from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import sqlalchemy as sa
from datetime import datetime, date, timedelta
from typing import Optional
from uuid import uuid4

from src.api.deps import get_db, get_current_user
from src.db.models import AMRIsolateRecord, User

reports_router = APIRouter(prefix="/reports", tags=["reports"])

REPORT_TYPES = {
    "weekly_epi": {
        "title": "Weekly Epidemiological Summary",
        "default_scope": "national",
        "default_days": 7,
    },
    "monthly_county": {
        "title": "Monthly County AMR Report",
        "default_scope": "county",
        "default_days": 30,
    },
    "quarterly_national": {
        "title": "Quarterly National AMR Report",
        "default_scope": "national",
        "default_days": 90,
    },
}


def _default_period(report_type: str):
    days = REPORT_TYPES.get(report_type, {}).get("default_days", 30)
    end = date.today()
    start = end - timedelta(days=days - 1)
    return start, end


def _apply_filters(q, start, end, county):
    if start:
        q = q.filter(AMRIsolateRecord.created_at >= datetime.combine(start, datetime.min.time()))
    if end:
        q = q.filter(AMRIsolateRecord.created_at <= datetime.combine(end, datetime.max.time()))
    if county:
        q = q.filter(AMRIsolateRecord.county == county)
    return q


def _section_metrics(db, start, end, county):
    q = _apply_filters(db.query(AMRIsolateRecord), start, end, county)
    total = q.count()
    mdr = q.filter(AMRIsolateRecord.mdr_flag == True).count()
    anomalies = q.filter(AMRIsolateRecord.anomaly_flag == True).count()
    counties = db.query(func.count(func.distinct(AMRIsolateRecord.county)))
    counties = _apply_filters(counties, start, end, county).scalar() or 0
    pathogens = db.query(func.count(func.distinct(AMRIsolateRecord.pathogen_code)))
    pathogens = _apply_filters(pathogens, start, end, county).scalar() or 0

    # Previous-period comparison
    span = (end - start).days + 1
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=span - 1)
    prev_q = _apply_filters(db.query(AMRIsolateRecord), prev_start, prev_end, county)
    prev_total = prev_q.count()
    prev_mdr = prev_q.filter(AMRIsolateRecord.mdr_flag == True).count()

    mdr_rate = round((mdr / total * 100) if total else 0, 1)
    prev_mdr_rate = round((prev_mdr / prev_total * 100) if prev_total else 0, 1)

    return {
        "total_records": total,
        "mdr_count": mdr,
        "mdr_rate": mdr_rate,
        "anomaly_count": anomalies,
        "active_counties": counties,
        "pathogen_count": pathogens,
        "previous_total": prev_total,
        "previous_mdr_rate": prev_mdr_rate,
        "change_mdr_rate": round(mdr_rate - prev_mdr_rate, 1),
    }


def _section_trend(db, start, end, county, months=6):
    q = db.query(
        AMRIsolateRecord.sample_month,
        func.count(AMRIsolateRecord.record_id).label("n"),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr"),
    )
    q = _apply_filters(q, start, end, county)
    rows = q.group_by(AMRIsolateRecord.sample_month).order_by(AMRIsolateRecord.sample_month).all()
    return [
        {
            "month": f"Month {r[0]}",
            "records": r[1],
            "mdr_rate": round((r[2] or 0) / r[1] * 100, 1) if r[1] else 0,
        }
        for r in rows
    ]


def _section_top_pathogens(db, start, end, county, limit=10):
    q = db.query(
        AMRIsolateRecord.pathogen_code,
        func.count(AMRIsolateRecord.record_id).label("n"),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr"),
    ).filter(AMRIsolateRecord.pathogen_code.isnot(None))
    q = _apply_filters(q, start, end, county)
    rows = q.group_by(AMRIsolateRecord.pathogen_code).order_by(desc("n")).limit(limit).all()
    return [
        {
            "pathogen": r[0],
            "samples": r[1],
            "mdr_count": int(r[2] or 0),
            "mdr_rate": round((r[2] or 0) / r[1] * 100, 1) if r[1] else 0,
        }
        for r in rows
    ]


def _section_top_counties(db, start, end, limit=10):
    q = db.query(
        AMRIsolateRecord.county,
        func.count(AMRIsolateRecord.record_id).label("n"),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr"),
    ).filter(AMRIsolateRecord.county.isnot(None))
    q = _apply_filters(q, start, end, None)
    rows = q.group_by(AMRIsolateRecord.county).order_by(desc("n")).limit(limit).all()
    return [
        {
            "county": r[0],
            "samples": r[1],
            "mdr_rate": round((r[2] or 0) / r[1] * 100, 1) if r[1] else 0,
        }
        for r in rows
    ]


def _section_by_sector(db, start, end, county):
    q = db.query(
        AMRIsolateRecord.sector,
        func.count(AMRIsolateRecord.record_id).label("n"),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr"),
    ).filter(AMRIsolateRecord.sector.isnot(None))
    q = _apply_filters(q, start, end, county)
    rows = q.group_by(AMRIsolateRecord.sector).order_by(desc("n")).all()
    return [
        {
            "sector": r[0],
            "samples": r[1],
            "mdr_rate": round((r[2] or 0) / r[1] * 100, 1) if r[1] else 0,
        }
        for r in rows
    ]


def _section_recent_anomalies(db, start, end, county, limit=10):
    q = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.anomaly_flag == True)
    q = _apply_filters(q, start, end, county).order_by(desc(AMRIsolateRecord.created_at)).limit(limit)
    return [
        {
            "record_id": str(r.record_id),
            "pathogen": r.pathogen_code or "—",
            "county": r.county or "—",
            "anomaly_score": float(r.anomaly_score) if r.anomaly_score is not None else 0,
            "date": r.created_at.isoformat() if r.created_at else None,
        }
        for r in q.all()
    ]


def _build_report_payload(report_type: str, scope: str, county: Optional[str], start: date, end: date, user: User, db: Session):
    config = REPORT_TYPES.get(report_type)
    if not config:
        raise HTTPException(status_code=400, detail=f"Unknown report type: {report_type}")

    scope_label = {
        "national": "Republic of Kenya",
        "county": f"{county or '—'} County",
    }.get(scope, "—")

    period_start = start.isoformat()
    period_end = end.isoformat()
    report_id = f"AMR-{'NAT' if scope == 'national' else 'CTY'}-{end.strftime('%Y-%m-%d')}-{uuid4().hex[:6].upper()}"

    metrics = _section_metrics(db, start, end, county if scope == "county" else None)
    trend = _section_trend(db, start, end, county if scope == "county" else None)
    pathogens = _section_top_pathogens(db, start, end, county if scope == "county" else None)
    sectors = _section_by_sector(db, start, end, county if scope == "county" else None)
    anomalies = _section_recent_anomalies(db, start, end, county if scope == "county" else None)

    sections = [
        {"id": "key_metrics", "title": "Key metrics", "type": "metrics", "data": metrics},
        {"id": "trend", "title": "Monthly MDR trend", "type": "trend", "data": trend},
        {"id": "pathogens", "title": "Top pathogens by MDR rate", "type": "pathogen_table", "data": pathogens},
        {"id": "sectors", "title": "Distribution by sector", "type": "sector_table", "data": sectors},
    ]

    if scope == "national":
        counties = _section_top_counties(db, start, end)
        sections.append({
            "id": "counties",
            "title": "County coverage",
            "type": "county_table",
            "data": counties,
        })

    if anomalies:
        sections.append({
            "id": "anomalies",
            "title": "Recent flagged anomalies",
            "type": "anomaly_list",
            "data": anomalies,
        })

    return {
        "meta": {
            "report_id": report_id,
            "report_type": report_type,
            "title": config["title"],
            "scope": scope,
            "scope_label": scope_label,
            "period": {"start": period_start, "end": period_end},
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "generated_by": user.name or user.email,
            "generated_by_email": user.email,
            "version": "1.0.0",
            "disclaimer": "Decision support only. Not a diagnosis. Confirm with laboratory results.",
        },
        "summary": metrics,
        "sections": sections,
    }


@reports_router.get("/types")
async def list_report_types(current_user: User = Depends(get_current_user)):
    return [
        {"id": k, "title": v["title"], "default_scope": v["default_scope"], "default_days": v["default_days"]}
        for k, v in REPORT_TYPES.items()
    ]


@reports_router.get("/generate")
async def generate_report(
    type: str = Query(..., description="weekly_epi | monthly_county | quarterly_national"),
    scope: Optional[str] = Query(None, description="national | county"),
    county: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    config = REPORT_TYPES.get(type)
    if not config:
        raise HTTPException(status_code=400, detail=f"Unknown report type: {type}")

    resolved_scope = scope or config["default_scope"]
    if resolved_scope == "county" and not county:
        raise HTTPException(status_code=400, detail="County is required for scope=county")

    if start_date and end_date:
        try:
            start = date.fromisoformat(start_date)
            end = date.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    else:
        start, end = _default_period(type)

    if end < start:
        raise HTTPException(status_code=400, detail="end_date must be after start_date")

    return _build_report_payload(type, resolved_scope, county, start, end, current_user, db)
