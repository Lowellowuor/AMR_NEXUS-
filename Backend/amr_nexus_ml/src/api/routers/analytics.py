from typing import Dict, Any, List, Optional
import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, extract, func, or_
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from src.api.deps import get_current_user, get_db
from src.db.models import AMRIsolateRecord, DashboardNotification, Hotspot, SubCountyLocation, User
from src.services.geospatial_service import get_sub_county_mdr, get_mdr_difference
from src.services.forecast_service import generate_prophet_forecast

analytics_router = APIRouter()


@analytics_router.get("/summary", response_model=Dict[str, Any])
async def get_pipeline_analytics_summary(
    county: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    query = db.query(AMRIsolateRecord)
    if county:
        query = query.filter(AMRIsolateRecord.county == county)

    total_count = query.count()
    mdr_count = query.filter(AMRIsolateRecord.mdr_flag == True).count()
    anomaly_count = query.filter(AMRIsolateRecord.anomaly_flag == True).count()

    return {
        "total_records": total_count,
        "mdr_rate": round(mdr_count / total_count * 100, 1) if total_count else 0,
        "anomaly_count": anomaly_count,
        "active_counties": query.with_entities(AMRIsolateRecord.county).distinct().count()
    }


@analytics_router.get("/mdr_trend", response_model=List[Dict[str, Any]])
async def get_mdr_trend_metrics(
    months: int = 6,
    county: Optional[str] = None,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    query = db.query(
        AMRIsolateRecord.sample_month,
        func.count(AMRIsolateRecord.record_id).label("total"),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr_count")
    )
    if county:
        query = query.filter(AMRIsolateRecord.county == county)

    trends = query.group_by(AMRIsolateRecord.sample_month).limit(months).all()
    return [
        {
            "month": str(row[0]),
            "rate": round((row[2] or 0) / row[1] * 100, 1) if row[1] else 0
        }
        for row in trends
    ]


@analytics_router.get("/by_pathogen", response_model=List[Dict[str, Any]])
async def get_resistance_by_pathogen(
    limit: int = 10,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    results = db.query(
        AMRIsolateRecord.pathogen_code,
        func.count(AMRIsolateRecord.record_id).label("total"),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr_count")
    ).group_by(AMRIsolateRecord.pathogen_code).having(func.count(AMRIsolateRecord.record_id) > 10).all()

    data = []
    for row in results:
        rate = round((row.mdr_count or 0) / row.total * 100, 1) if row.total else 0
        data.append({"name": row.pathogen_code.upper(), "resistance": rate})
    data.sort(key=lambda x: x["resistance"], reverse=True)
    return data[:limit]


@analytics_router.get("/by_sector", response_model=List[Dict[str, Any]])
async def get_resistance_by_sector(
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    results = db.query(
        AMRIsolateRecord.sector,
        func.count(AMRIsolateRecord.record_id).label("total"),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr_count")
    ).group_by(AMRIsolateRecord.sector).all()

    return [
        {"name": row.sector, "value": round((row.mdr_count or 0) / row.total * 100, 1) if row.total else 0}
        for row in results
    ]


@analytics_router.get("/sector_monthly", response_model=List[Dict[str, Any]])
async def get_sector_monthly(
    months: int = 12,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    results = db.query(
        AMRIsolateRecord.sector,
        func.strftime('%Y-%m', AMRIsolateRecord.sample_collection_date).label('month'),
        func.count(AMRIsolateRecord.record_id).label("total"),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr_count")
    ).filter(
        AMRIsolateRecord.sample_collection_date >= datetime.now() - timedelta(days=months * 30)
    ).group_by(
        AMRIsolateRecord.sector,
        func.strftime('%Y-%m', AMRIsolateRecord.sample_collection_date)
    ).all()

    sector_map = {}
    for row in results:
        sector = row.sector
        month = row.month
        rate = round((row.mdr_count or 0) / row.total * 100, 1) if row.total else 0.0
        if sector not in sector_map:
            sector_map[sector] = []
        sector_map[sector].append({
            "month": month,
            "rate": rate,
            "total_isolates": row.total,
            "mdr_count": row.mdr_count,
        })

    for sector in sector_map:
        sector_map[sector].sort(key=lambda x: x["month"])

    return [
        {"sector": sector, "monthly": monthly}
        for sector, monthly in sector_map.items()
    ]


@analytics_router.get("/top_counties")
async def get_top_counties(
    limit: int = 5,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    query = db.query(
        AMRIsolateRecord.county,
        func.count(AMRIsolateRecord.record_id).label("total"),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr_count")
    ).group_by(AMRIsolateRecord.county).having(func.count(AMRIsolateRecord.record_id) > 5)

    result = query.all()
    data = []
    for row in result:
        rate = round((row.mdr_count or 0) / row.total * 100, 1) if row.total else 0
        data.append({"county": row.county, "rate": rate})
    data.sort(key=lambda x: x["rate"], reverse=True)
    return data[:limit]


@analytics_router.get("/county_mdr")
async def get_county_mdr(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    pathogen_code: Optional[str] = None,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    query = db.query(
        AMRIsolateRecord.county,
        func.count(AMRIsolateRecord.record_id).label("total"),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr_count")
    ).group_by(AMRIsolateRecord.county)

    if pathogen_code:
        query = query.filter(AMRIsolateRecord.pathogen_code == pathogen_code)

    results = query.all()
    data = []
    for row in results:
        if row.total > 0:
            rate = round((row.mdr_count or 0) / row.total * 100, 1)
            data.append({"county": row.county, "mdr_rate": rate})
    return data


@analytics_router.get("/resistance_by_pathogen/{pathogen_code}")
async def resistance_by_pathogen_class(
    pathogen_code: str,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    results = db.query(
        AMRIsolateRecord.antibiotic_class,
        func.count(AMRIsolateRecord.record_id).label("total"),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr_count")
    ).filter(AMRIsolateRecord.pathogen_code == pathogen_code)\
     .group_by(AMRIsolateRecord.antibiotic_class).all()

    data = []
    for row in results:
        rate = round((row.mdr_count or 0) / row.total * 100, 1) if row.total else 0
        data.append({"antibiotic_class": row.antibiotic_class, "resistance": rate})
    return data


@analytics_router.get("/pathogen_trend")
async def get_pathogen_trend(
    pathogen_code: str,
    months: int = 12,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    date_col = AMRIsolateRecord.created_at
    query = db.query(
        extract('year', date_col).label('year'),
        extract('month', date_col).label('month'),
        (func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)) * 1.0 / func.count()).label('rate')
    ).filter(AMRIsolateRecord.pathogen_code == pathogen_code)

    if start_date:
        query = query.filter(date_col >= start_date)
    if end_date:
        query = query.filter(date_col <= end_date)

    results = query.group_by('year', 'month').order_by('year', 'month').limit(months).all()
    data = []
    for r in results:
        month_date = datetime(int(r.year), int(r.month), 1)
        data.append({"month": month_date.strftime("%b %Y"), "rate": round(r.rate, 1)})
    return data


@analytics_router.get("/forecasting/trajectory", response_model=List[Dict[str, Any]])
async def get_prophet_resistance_trajectory(
    pathogen_code: str,
    antibiotic_class: str,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    try:
        trajectory = generate_prophet_forecast(db, pathogen_code, antibiotic_class)
        return trajectory
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Forecast generation failed")


@analytics_router.get("/notifications", response_model=List[Dict[str, Any]])
async def get_dashboard_notifications(
    county: Optional[str] = None,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    query = db.query(DashboardNotification)
    if county:
        query = query.filter(DashboardNotification.county == county)
    notifications = query.order_by(DashboardNotification.created_at.desc()).limit(10).all()
    return [
        {
            "id": n.id,
            "timestamp": n.created_at.isoformat(),
            "county": n.county,
            "message": n.message,
            "is_read": n.is_read
        }
        for n in notifications
    ]


@analytics_router.get("/metadata/options")
async def get_form_options(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    sectors = db.query(AMRIsolateRecord.sector).distinct().all()
    sub_sectors = db.query(AMRIsolateRecord.sub_sector).distinct().all()
    pathogens = db.query(AMRIsolateRecord.pathogen_code).distinct().all()
    specimen_types = db.query(AMRIsolateRecord.specimen_type).distinct().all()
    counties = db.query(AMRIsolateRecord.county).distinct().all()
    antibiotic_classes = db.query(AMRIsolateRecord.antibiotic_class).distinct().all()
    test_methods = db.query(AMRIsolateRecord.test_method).distinct().all()

    return {
        "sectors": [s[0] for s in sectors if s[0]],
        "sub_sectors": [s[0] for s in sub_sectors if s[0]],
        "pathogens": [{"code": p[0], "name": p[0]} for p in pathogens if p[0]],
        "specimen_types": [s[0] for s in specimen_types if s[0]],
        "counties": [c[0] for c in counties if c[0]],
        "antibiotic_classes": [a[0] for a in antibiotic_classes if a[0]],
        "test_methods": [t[0] for t in test_methods if t[0]],
    }


@analytics_router.get("/sub_county_mdr")
async def sub_county_mdr(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    features = get_sub_county_mdr(db, start_date, end_date)
    return {"type": "FeatureCollection", "features": features}


@analytics_router.get("/mdr_difference")
async def mdr_difference(
    start_month: str,
    end_month: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    features = get_mdr_difference(db, start_month, end_month)
    return {"type": "FeatureCollection", "features": features}

@analytics_router.get("/month_range")
def get_month_range(db: Session = Depends(get_db)):
    min_date, max_date = db.query(
        func.min(AMRIsolateRecord.sample_collection_date),
        func.max(AMRIsolateRecord.sample_collection_date),
    ).first()

    if not min_date or not max_date:
        current = date.today().replace(day=1).isoformat()[:7]
        return {"min": current, "max": current, "available": False}

    return {
        "min": min_date.isoformat()[:7],
        "max": max_date.isoformat()[:7],
        "available": True,
    }


@analytics_router.get("/county_detail")
async def county_detail(
    county: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    pathogen: Optional[str] = None,
    sector: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sd = None
    ed = None
    try:
        if start_date:
            sd = date.fromisoformat(start_date)
        if end_date:
            ed = date.fromisoformat(end_date)
    except ValueError:
        pass

    def _scoped(q, with_county=True):
        if with_county:
            q = q.filter(AMRIsolateRecord.county == county)
        if sd:
            q = q.filter(AMRIsolateRecord.sample_collection_date >= sd)
        if ed:
            q = q.filter(AMRIsolateRecord.sample_collection_date <= ed)
        if pathogen:
            q = q.filter(AMRIsolateRecord.pathogen_code == pathogen)
        if sector:
            q = q.filter(AMRIsolateRecord.sector == sector)
        return q

    records = _scoped(db.query(AMRIsolateRecord)).all()
    n = len(records)
    mdr_count = sum(1 for r in records if r.mdr_flag)
    mdr_rate = round(mdr_count / n * 100, 1) if n else 0
    ci_low, ci_high = _wilson_ci(mdr_count, n)

    national = _scoped(db.query(AMRIsolateRecord), with_county=False).all()
    nat_n = len(national)
    nat_mdr = sum(1 for r in national if r.mdr_flag)
    nat_rate = round(nat_mdr / nat_n * 100, 1) if nat_n else 0
    delta_vs_national = round(mdr_rate - nat_rate, 1) if nat_n else None

    from collections import Counter
    pc = Counter(r.pathogen_code for r in records if r.pathogen_code)
    top_pathogens = [{"code": c, "samples": k} for c, k in pc.most_common(5)]

    def _breakdown(field_name, key_name):
        buckets = {}
        for r in records:
            v = getattr(r, field_name, None) or "unknown"
            b = buckets.setdefault(v, {"samples": 0, "mdr_count": 0})
            b["samples"] += 1
            if r.mdr_flag:
                b["mdr_count"] += 1
        out = [
            {key_name: k, "samples": v["samples"],
             "mdr_rate": round(v["mdr_count"] / v["samples"] * 100, 1) if v["samples"] else 0}
            for k, v in buckets.items()
        ]
        out.sort(key=lambda x: x["samples"], reverse=True)
        return out

    by_sector = _breakdown("sector", "sector")
    by_specimen = _breakdown("specimen_type", "specimen_type")

    ac_buckets = {}
    for r in records:
        a = r.antibiotic_class or "unknown"
        b = ac_buckets.setdefault(a, {"samples": 0, "mdr_count": 0})
        b["samples"] += 1
        if r.mdr_flag:
            b["mdr_count"] += 1
    by_class = [
        {"antibiotic_class": k, "samples": v["samples"],
         "resistance": round(v["mdr_count"] / v["samples"] * 100, 1) if v["samples"] else 0}
        for k, v in ac_buckets.items()
    ]
    by_class.sort(key=lambda x: x["resistance"], reverse=True)

    recent_records = sorted(
        records,
        key=lambda r: r.created_at or datetime.min,
        reverse=True,
    )[:5]
    recent = [
        {
            "record_id": str(r.record_id),
            "timestamp": r.created_at.isoformat() if r.created_at else None,
            "specimen_type": r.specimen_type or "",
            "sector": r.sector or "",
            "antibiotic_class": r.antibiotic_class or "",
            "mdr_flag": bool(r.mdr_flag),
        }
        for r in recent_records
    ]

    dates = [r.sample_collection_date for r in records if r.sample_collection_date]
    latest_sample = max(dates).isoformat() if dates else None

    return {
        "county": county,
        "samples": n,
        "mdr_count": mdr_count,
        "mdr_rate": mdr_rate,
        "ci_low": ci_low,
        "ci_high": ci_high,
        "delta_vs_national": delta_vs_national,
        "national_rate": nat_rate,
        "top_pathogens": top_pathogens,
        "by_sector": by_sector,
        "by_specimen": by_specimen,
        "by_class": by_class,
        "recent": recent,
        "latest_sample": latest_sample,
        "filter_pathogen": pathogen,
        "filter_sector": sector,
        "filter_period": (str(sd) + " to " + str(ed)) if sd and ed else None,
    }


# =============================================================
# Pathogen Explorer
# =============================================================

@analytics_router.get("/pathogens")
async def list_pathogens(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    county: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(
        AMRIsolateRecord.pathogen_code,
        func.count(AMRIsolateRecord.record_id).label("n"),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr"),
    ).filter(AMRIsolateRecord.pathogen_code.isnot(None))

    if start_date:
        try:
            q = q.filter(AMRIsolateRecord.sample_collection_date >= date.fromisoformat(start_date))
        except ValueError:
            pass
    if end_date:
        try:
            q = q.filter(AMRIsolateRecord.sample_collection_date <= date.fromisoformat(end_date))
        except ValueError:
            pass
    if county:
        q = q.filter(AMRIsolateRecord.county == county)

    rows = q.group_by(AMRIsolateRecord.pathogen_code).all()

    out = []
    for name, n, mdr in rows:
        rate = round((mdr or 0) / n * 100, 1) if n else 0
        out.append({
            "code": name,
            "name": name,
            "samples": int(n),
            "mdr_count": int(mdr or 0),
            "mdr_rate": rate,
        })
    out.sort(key=lambda x: x["samples"], reverse=True)
    return out


def _wilson_ci(mdr_count: int, n: int, z: float = 1.96):
    if n == 0:
        return [0.0, 0.0]
    p = mdr_count / n
    denom = 1 + (z * z) / n
    center = (p + (z * z) / (2 * n)) / denom
    half = (z * ((p * (1 - p) + (z * z) / (4 * n)) / n) ** 0.5) / denom
    return [round(max(0, center - half) * 100, 1), round(min(1, center + half) * 100, 1)]


@analytics_router.get("/pathogens/{pathogen_code:path}")
async def pathogen_detail(
    pathogen_code: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    county: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from urllib.parse import unquote
    code = unquote(pathogen_code).replace("+", " ").strip()

    if not code:
        raise HTTPException(status_code=400, detail="Pathogen code required")

    def _apply(q):
        # Match exact OR LIKE (handles URL-encoded spaces, case differences, substring)
        q = q.filter(
            or_(
                AMRIsolateRecord.pathogen_code == code,
                AMRIsolateRecord.pathogen_code.ilike(f"%{code}%"),
            )
        )
        if start_date:
            try:
                q = q.filter(AMRIsolateRecord.sample_collection_date >= date.fromisoformat(start_date))
            except ValueError:
                pass
        if end_date:
            try:
                q = q.filter(AMRIsolateRecord.sample_collection_date <= date.fromisoformat(end_date))
            except ValueError:
                pass
        if county:
            q = q.filter(AMRIsolateRecord.county == county)
        return q

    base = _apply(db.query(AMRIsolateRecord))
    records = base.all()
    total = len(records)
    mdr_total = sum(1 for r in records if r.mdr_flag)
    mdr_rate = round((mdr_total / total * 100) if total else 0, 1)
    ci_low, ci_high = _wilson_ci(mdr_total, total)

    prev_rate = None
    if start_date and end_date:
        try:
            sd = date.fromisoformat(start_date)
            ed = date.fromisoformat(end_date)
            span = (ed - sd).days + 1
            prev_end = sd - timedelta(days=1)
            prev_start = prev_end - timedelta(days=span - 1)
            prev_q = db.query(AMRIsolateRecord).filter(
                or_(
                    AMRIsolateRecord.pathogen_code == code,
                    AMRIsolateRecord.pathogen_code.ilike(f"%{code}%"),
                ),
                AMRIsolateRecord.sample_collection_date >= prev_start,
                AMRIsolateRecord.sample_collection_date <= prev_end,
            )
            if county:
                prev_q = prev_q.filter(AMRIsolateRecord.county == county)
            prev_records = prev_q.all()
            if prev_records:
                prev_mdr = sum(1 for r in prev_records if r.mdr_flag)
                prev_rate = round(prev_mdr / len(prev_records) * 100, 1)
        except (ValueError, TypeError):
            pass

    change = round(mdr_rate - prev_rate, 1) if prev_rate is not None else None

    # By antibiotic class
    aq = _apply(db.query(
        AMRIsolateRecord.antibiotic_class,
        func.count(AMRIsolateRecord.record_id),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
    )).filter(AMRIsolateRecord.antibiotic_class.isnot(None))
    aq = aq.group_by(AMRIsolateRecord.antibiotic_class).all()
    by_class = []
    for name, n, mdr in aq:
        lo, hi = _wilson_ci(int(mdr or 0), int(n))
        by_class.append({
            "antibiotic_class": name,
            "samples": int(n),
            "mdr_count": int(mdr or 0),
            "resistance": round((mdr or 0) / n * 100, 1) if n else 0,
            "ci_low": lo,
            "ci_high": hi,
        })
    by_class.sort(key=lambda x: x["resistance"], reverse=True)

    # By specimen
    sq = _apply(db.query(
        AMRIsolateRecord.specimen_type,
        func.count(AMRIsolateRecord.record_id),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
    )).filter(AMRIsolateRecord.specimen_type.isnot(None))
    sq = sq.group_by(AMRIsolateRecord.specimen_type).all()
    by_specimen = [
        {"specimen_type": s, "samples": int(n),
         "mdr_count": int(mdr or 0),
         "mdr_rate": round((mdr or 0) / n * 100, 1) if n else 0}
        for s, n, mdr in sq
    ]
    by_specimen.sort(key=lambda x: x["samples"], reverse=True)

    # By sector
    secq = _apply(db.query(
        AMRIsolateRecord.sector,
        func.count(AMRIsolateRecord.record_id),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
    )).filter(AMRIsolateRecord.sector.isnot(None))
    secq = secq.group_by(AMRIsolateRecord.sector).all()
    by_sector = [
        {"sector": s, "samples": int(n),
         "mdr_count": int(mdr or 0),
         "mdr_rate": round((mdr or 0) / n * 100, 1) if n else 0}
        for s, n, mdr in secq
    ]
    by_sector.sort(key=lambda x: x["samples"], reverse=True)

    # By county
    cq = _apply(db.query(
        AMRIsolateRecord.county,
        func.count(AMRIsolateRecord.record_id),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
    )).filter(AMRIsolateRecord.county.isnot(None))
    cq = cq.group_by(AMRIsolateRecord.county).all()
    county_coords = {
        c: (lat, lng)
        for c, lat, lng in db.query(
            SubCountyLocation.county,
            func.avg(SubCountyLocation.latitude),
            func.avg(SubCountyLocation.longitude),
        ).group_by(SubCountyLocation.county).all()
    }
    by_county = [
        {"county": c, "samples": int(n),
         "mdr_count": int(mdr or 0),
         "mdr_rate": round((mdr or 0) / n * 100, 1) if n else 0,
         "latitude": float(county_coords[c][0]) if c in county_coords and county_coords[c][0] is not None else None,
         "longitude": float(county_coords[c][1]) if c in county_coords and county_coords[c][1] is not None else None}
        for c, n, mdr in cq
    ]
    by_county.sort(key=lambda x: x["mdr_rate"], reverse=True)

    # Monthly trend
    tq = _apply(db.query(
        AMRIsolateRecord.sample_month,
        func.count(AMRIsolateRecord.record_id),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
    ))
    tq = tq.group_by(AMRIsolateRecord.sample_month).order_by(AMRIsolateRecord.sample_month).all()
    trend = [
        {"month": f"M{m}", "month_number": int(m) if m else None,
         "samples": int(n),
         "rate": round((mdr or 0) / n * 100, 1) if n else 0}
        for m, n, mdr in tq
        if m is not None
    ]

    # Recent
    rq = _apply(db.query(AMRIsolateRecord)).order_by(desc(AMRIsolateRecord.created_at)).limit(20).all()
    recent = [
        {"record_id": str(r.record_id),
         "timestamp": r.created_at.isoformat() if r.created_at else None,
         "county": r.county or "",
         "sub_county": r.sub_county or "",
         "specimen_type": r.specimen_type or "",
         "sector": r.sector or "",
         "antibiotic_class": r.antibiotic_class or "",
         "mdr_flag": bool(r.mdr_flag),
         "mdr_probability": float(r.mdr_probability) if r.mdr_probability is not None else 0,
         "anomaly_flag": bool(r.anomaly_flag)}
        for r in rq
    ]

    return {
        "code": code,
        "summary": {
            "samples": total,
            "mdr_count": mdr_total,
            "mdr_rate": mdr_rate,
            "ci_low": ci_low,
            "ci_high": ci_high,
            "previous_rate": prev_rate,
            "change": change,
        },
        "by_class": by_class,
        "by_specimen": by_specimen,
        "by_sector": by_sector,
        "by_county": by_county,
        "trend": trend,
        "recent": recent,
    }


@analytics_router.get("/pathogens-compare")
async def pathogen_compare(
    a: str,
    b: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    county: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    def build(code):
        q = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.pathogen_code == code)
        if start_date:
            try:
                q = q.filter(AMRIsolateRecord.sample_collection_date >= date.fromisoformat(start_date))
            except ValueError:
                pass
        if end_date:
            try:
                q = q.filter(AMRIsolateRecord.sample_collection_date <= date.fromisoformat(end_date))
            except ValueError:
                pass
        if county:
            q = q.filter(AMRIsolateRecord.county == county)
        records = q.all()
        total = len(records)
        mdr_total = sum(1 for r in records if r.mdr_flag)
        rate = round((mdr_total / total * 100) if total else 0, 1)
        lo, hi = _wilson_ci(mdr_total, total)

        class_q = db.query(
            AMRIsolateRecord.antibiotic_class,
            func.count(AMRIsolateRecord.record_id),
            func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
        ).filter(AMRIsolateRecord.pathogen_code == code)
        if start_date:
            try:
                class_q = class_q.filter(AMRIsolateRecord.sample_collection_date >= date.fromisoformat(start_date))
            except ValueError:
                pass
        if end_date:
            try:
                class_q = class_q.filter(AMRIsolateRecord.sample_collection_date <= date.fromisoformat(end_date))
            except ValueError:
                pass
        if county:
            class_q = class_q.filter(AMRIsolateRecord.county == county)
        class_q = class_q.filter(AMRIsolateRecord.antibiotic_class.isnot(None))
        rows = class_q.group_by(AMRIsolateRecord.antibiotic_class).all()

        by_class = [
            {
                "antibiotic_class": c,
                "samples": int(n),
                "mdr_rate": round((mdr or 0) / n * 100, 1) if n else 0,
            }
            for c, n, mdr in rows
        ]
        by_class.sort(key=lambda x: x["mdr_rate"], reverse=True)

        return {
            "code": code,
            "summary": {
                "samples": total,
                "mdr_count": mdr_total,
                "mdr_rate": rate,
                "ci_low": lo,
                "ci_high": hi,
            },
            "by_class": by_class,
        }

    return {"a": build(a), "b": build(b)}


# =============================================================
# Dashboard endpoints (National + County)
# =============================================================

def _period_summary(db, sd, ed, county=None, pathogen=None, sector=None):
    q = db.query(AMRIsolateRecord)
    if sd:
        q = q.filter(AMRIsolateRecord.sample_collection_date >= sd)
    if ed:
        q = q.filter(AMRIsolateRecord.sample_collection_date <= ed)
    if county:
        q = q.filter(AMRIsolateRecord.county == county)
    if pathogen:
        q = q.filter(AMRIsolateRecord.pathogen_code == pathogen)
    if sector:
        q = q.filter(AMRIsolateRecord.sector == sector)
    records = q.all()
    total = len(records)
    mdr = sum(1 for r in records if r.mdr_flag)
    anom = sum(1 for r in records if r.anomaly_flag)
    counties = len(set(r.county for r in records if r.county))
    pathogens = len(set(r.pathogen_code for r in records if r.pathogen_code))
    facilities = len(set(r.hotspot_id for r in records if r.hotspot_id))
    return {
        "total_records": total,
        "mdr_count": mdr,
        "mdr_rate": round((mdr / total * 100) if total else 0, 1),
        "anomaly_count": anom,
        "active_counties": counties,
        "pathogen_count": pathogens,
        "active_facilities": facilities,
    }


def _parse_range(start_date, end_date):
    sd = None
    ed = None
    if start_date:
        try:
            sd = date.fromisoformat(start_date)
        except ValueError:
            pass
    if end_date:
        try:
            ed = date.fromisoformat(end_date)
        except ValueError:
            pass
    return sd, ed


@analytics_router.get("/dashboard_summary")
async def dashboard_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    county: Optional[str] = None,
    pathogen: Optional[str] = None,
    sector: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sd, ed = _parse_range(start_date, end_date)
    current = _period_summary(db, sd, ed, county, pathogen, sector)

    previous = None
    if sd and ed:
        span = (ed - sd).days + 1
        prev_end = sd - timedelta(days=1)
        prev_start = prev_end - timedelta(days=span - 1)
        previous = _period_summary(db, prev_start, prev_end, county, pathogen, sector)

    return {"current": current, "previous": previous}


@analytics_router.get("/freshness")
async def data_freshness(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    latest_created = db.query(func.max(AMRIsolateRecord.created_at)).scalar()
    latest_sample = db.query(func.max(AMRIsolateRecord.sample_collection_date)).scalar()
    total = db.query(func.count(AMRIsolateRecord.record_id)).scalar() or 0
    return {
        "last_submission": latest_created.isoformat() if latest_created else None,
        "last_sample_date": latest_sample.isoformat() if latest_sample else None,
        "total_records": int(total),
    }


@analytics_router.get("/county_rank")
async def county_rank(
    county: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sd, ed = _parse_range(start_date, end_date)
    q = db.query(
        AMRIsolateRecord.county,
        func.count(AMRIsolateRecord.record_id).label("n"),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr"),
    ).filter(AMRIsolateRecord.county.isnot(None))
    if sd:
        q = q.filter(AMRIsolateRecord.sample_collection_date >= sd)
    if ed:
        q = q.filter(AMRIsolateRecord.sample_collection_date <= ed)
    rows = q.group_by(AMRIsolateRecord.county).all()

    ranked = []
    for c, n, mdr in rows:
        if n >= 5:
            ranked.append({
                "county": c,
                "samples": int(n),
                "mdr_rate": round((mdr or 0) / n * 100, 1),
            })
    ranked.sort(key=lambda x: x["mdr_rate"], reverse=True)

    position = None
    target = None
    for i, r in enumerate(ranked):
        if r["county"] == county:
            position = i + 1
            target = r
            break

    national_q = db.query(
        func.count(AMRIsolateRecord.record_id),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
    )
    if sd:
        national_q = national_q.filter(AMRIsolateRecord.sample_collection_date >= sd)
    if ed:
        national_q = national_q.filter(AMRIsolateRecord.sample_collection_date <= ed)
    n_total, mdr_total = national_q.first()
    national_rate = round(((mdr_total or 0) / n_total * 100) if n_total else 0, 1)

    return {
        "county": county,
        "position": position,
        "total_counties": len(ranked),
        "county_rate": target["mdr_rate"] if target else None,
        "county_samples": target["samples"] if target else 0,
        "national_rate": national_rate,
        "delta_vs_national": round((target["mdr_rate"] - national_rate), 1) if target else None,
    }


@analytics_router.get("/facility_coverage")
async def facility_coverage(
    county: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from src.db.models import Hotspot

    hq = db.query(Hotspot).filter(Hotspot.is_active == True)
    if county:
        hq = hq.filter(Hotspot.county == county)
    hotspots = hq.all()
    total_facilities = len(hotspots)

    if total_facilities == 0:
        return {
            "county": county,
            "reporting": 0,
            "expected": 0,
            "coverage_pct": 0,
            "silent_facilities": [],
        }

    sd, ed = _parse_range(start_date, end_date)
    rq = db.query(AMRIsolateRecord.hotspot_id).filter(AMRIsolateRecord.hotspot_id.isnot(None))
    if sd:
        rq = rq.filter(AMRIsolateRecord.sample_collection_date >= sd)
    if ed:
        rq = rq.filter(AMRIsolateRecord.sample_collection_date <= ed)
    reporting_ids = set(r[0] for r in rq.distinct().all())

    reporting = sum(1 for h in hotspots if h.id in reporting_ids)
    silent = [
        {"id": h.id, "name": h.name, "sub_county": h.sub_county}
        for h in hotspots if h.id not in reporting_ids
    ]

    return {
        "county": county,
        "reporting": reporting,
        "expected": total_facilities,
        "coverage_pct": round((reporting / total_facilities * 100), 1) if total_facilities else 0,
        "silent_facilities": silent[:20],
    }


@analytics_router.get("/top_counties_with_trend")
async def top_counties_with_trend(
    limit: int = 8,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sd, ed = _parse_range(start_date, end_date)

    def compute(sd_, ed_):
        q = db.query(
            AMRIsolateRecord.county,
            func.count(AMRIsolateRecord.record_id).label("n"),
            func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr"),
        ).filter(AMRIsolateRecord.county.isnot(None))
        if sd_:
            q = q.filter(AMRIsolateRecord.sample_collection_date >= sd_)
        if ed_:
            q = q.filter(AMRIsolateRecord.sample_collection_date <= ed_)
        rows = q.group_by(AMRIsolateRecord.county).all()
        out = {}
        for c, n, mdr in rows:
            if n >= 5:
                out[c] = {
                    "county": c,
                    "samples": int(n),
                    "mdr_rate": round((mdr or 0) / n * 100, 1),
                }
        return out

    current = compute(sd, ed)

    previous = {}
    if sd and ed:
        span = (ed - sd).days + 1
        prev_end = sd - timedelta(days=1)
        prev_start = prev_end - timedelta(days=span - 1)
        previous = compute(prev_start, prev_end)

    rows = []
    for county, info in current.items():
        prev = previous.get(county)
        delta = round(info["mdr_rate"] - prev["mdr_rate"], 1) if prev else None
        rows.append({**info, "delta": delta})

    rows.sort(key=lambda x: x["mdr_rate"], reverse=True)
    return rows[:limit]


@analytics_router.get("/glass_indicators")
async def glass_indicators(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sd, ed = _parse_range(start_date, end_date)

    def scope(q):
        if sd:
            q = q.filter(AMRIsolateRecord.sample_collection_date >= sd)
        if ed:
            q = q.filter(AMRIsolateRecord.sample_collection_date <= ed)
        return q

    total = scope(db.query(func.count(AMRIsolateRecord.record_id))).scalar() or 0

    e_coli = scope(db.query(func.count(AMRIsolateRecord.record_id)).filter(
        AMRIsolateRecord.pathogen_code.like('%E. coli%')
    )).scalar() or 0
    e_coli_mdr = scope(db.query(func.count(AMRIsolateRecord.record_id)).filter(
        AMRIsolateRecord.pathogen_code.like('%E. coli%'),
        AMRIsolateRecord.mdr_flag == True,
    )).scalar() or 0

    kpn = scope(db.query(func.count(AMRIsolateRecord.record_id)).filter(
        AMRIsolateRecord.pathogen_code.like('%Klebsiella%')
    )).scalar() or 0
    kpn_mdr = scope(db.query(func.count(AMRIsolateRecord.record_id)).filter(
        AMRIsolateRecord.pathogen_code.like('%Klebsiella%'),
        AMRIsolateRecord.mdr_flag == True,
    )).scalar() or 0

    sau = scope(db.query(func.count(AMRIsolateRecord.record_id)).filter(
        AMRIsolateRecord.pathogen_code.like('%Staphylococcus%')
    )).scalar() or 0
    sau_mdr = scope(db.query(func.count(AMRIsolateRecord.record_id)).filter(
        AMRIsolateRecord.pathogen_code.like('%Staphylococcus%'),
        AMRIsolateRecord.mdr_flag == True,
    )).scalar() or 0

    return {
        "total_isolates": int(total),
        "e_coli": {"samples": int(e_coli), "mdr": int(e_coli_mdr), "rate": round(e_coli_mdr / e_coli * 100, 1) if e_coli else 0},
        "klebsiella": {"samples": int(kpn), "mdr": int(kpn_mdr), "rate": round(kpn_mdr / kpn * 100, 1) if kpn else 0},
        "staph_aureus": {"samples": int(sau), "mdr": int(sau_mdr), "rate": round(sau_mdr / sau * 100, 1) if sau else 0},
    }


# =============================================================
# Compare two periods / geographies
# =============================================================

def _scope_summary(db, sd, ed, county=None, pathogen=None, sector=None):
    q = db.query(AMRIsolateRecord)
    if sd:
        q = q.filter(AMRIsolateRecord.sample_collection_date >= sd)
    if ed:
        q = q.filter(AMRIsolateRecord.sample_collection_date <= ed)
    if county:
        q = q.filter(AMRIsolateRecord.county == county)
    if pathogen:
        q = q.filter(AMRIsolateRecord.pathogen_code == pathogen)
    if sector:
        q = q.filter(AMRIsolateRecord.sector == sector)
    records = q.all()
    total = len(records)
    mdr = sum(1 for r in records if r.mdr_flag)
    anom = sum(1 for r in records if r.anomaly_flag)
    counties = len(set(r.county for r in records if r.county))
    return {
        "total_records": total,
        "mdr_count": mdr,
        "mdr_rate": round((mdr / total * 100) if total else 0, 1),
        "anomaly_count": anom,
        "active_counties": counties,
    }


def _scope_breakdown(db, sd, ed, county=None, pathogen=None, sector=None):
    def scope(q):
        if sd:
            q = q.filter(AMRIsolateRecord.sample_collection_date >= sd)
        if ed:
            q = q.filter(AMRIsolateRecord.sample_collection_date <= ed)
        if county:
            q = q.filter(AMRIsolateRecord.county == county)
        if pathogen:
            q = q.filter(AMRIsolateRecord.pathogen_code == pathogen)
        if sector:
            q = q.filter(AMRIsolateRecord.sector == sector)
        return q

    # By pathogen
    pq = scope(db.query(
        AMRIsolateRecord.pathogen_code,
        func.count(AMRIsolateRecord.record_id),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
    )).filter(AMRIsolateRecord.pathogen_code.isnot(None))
    pq = pq.group_by(AMRIsolateRecord.pathogen_code).all()
    by_pathogen = [
        {"key": k, "samples": int(n), "mdr_rate": round((m or 0) / n * 100, 1) if n else 0}
        for k, n, m in pq
    ]

    # By sector
    sq = scope(db.query(
        AMRIsolateRecord.sector,
        func.count(AMRIsolateRecord.record_id),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
    )).filter(AMRIsolateRecord.sector.isnot(None))
    sq = sq.group_by(AMRIsolateRecord.sector).all()
    by_sector = [
        {"key": k, "samples": int(n), "mdr_rate": round((m or 0) / n * 100, 1) if n else 0}
        for k, n, m in sq
    ]

    # By county
    cq = scope(db.query(
        AMRIsolateRecord.county,
        func.count(AMRIsolateRecord.record_id),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
    )).filter(AMRIsolateRecord.county.isnot(None))
    cq = cq.group_by(AMRIsolateRecord.county).all()
    by_county = [
        {"key": k, "samples": int(n), "mdr_rate": round((m or 0) / n * 100, 1) if n else 0}
        for k, n, m in cq
    ]

    return {
        "by_pathogen": by_pathogen,
        "by_sector": by_sector,
        "by_county": by_county,
    }


def _scope_trend(db, sd, ed, county=None, pathogen=None, sector=None):
    q = db.query(
        AMRIsolateRecord.sample_month,
        func.count(AMRIsolateRecord.record_id),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
    )
    if sd:
        q = q.filter(AMRIsolateRecord.sample_collection_date >= sd)
    if ed:
        q = q.filter(AMRIsolateRecord.sample_collection_date <= ed)
    if county:
        q = q.filter(AMRIsolateRecord.county == county)
    if pathogen:
        q = q.filter(AMRIsolateRecord.pathogen_code == pathogen)
    if sector:
        q = q.filter(AMRIsolateRecord.sector == sector)
    rows = q.group_by(AMRIsolateRecord.sample_month).order_by(AMRIsolateRecord.sample_month).all()
    return [
        {
            "month": int(m) if m else 0,
            "label": f"M{m}",
            "samples": int(n),
            "rate": round((mdr or 0) / n * 100, 1) if n else 0,
        }
        for m, n, mdr in rows
        if m is not None
    ]


@analytics_router.get("/compare_periods")
async def compare_periods(
    a_start: Optional[str] = None,
    a_end: Optional[str] = None,
    a_county: Optional[str] = None,
    a_pathogen: Optional[str] = None,
    a_sector: Optional[str] = None,
    b_start: Optional[str] = None,
    b_end: Optional[str] = None,
    b_county: Optional[str] = None,
    b_pathogen: Optional[str] = None,
    b_sector: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a_sd, a_ed = _parse_range(a_start, a_end)
    b_sd, b_ed = _parse_range(b_start, b_end)

    side_a = {
        "summary": _scope_summary(db, a_sd, a_ed, a_county, a_pathogen, a_sector),
        "trend": _scope_trend(db, a_sd, a_ed, a_county, a_pathogen, a_sector),
        **_scope_breakdown(db, a_sd, a_ed, a_county, a_pathogen, a_sector),
    }
    side_b = {
        "summary": _scope_summary(db, b_sd, b_ed, b_county, b_pathogen, b_sector),
        "trend": _scope_trend(db, b_sd, b_ed, b_county, b_pathogen, b_sector),
        **_scope_breakdown(db, b_sd, b_ed, b_county, b_pathogen, b_sector),
    }

    # Compute deltas
    def delta_metric(key):
        av = side_a["summary"].get(key)
        bv = side_b["summary"].get(key)
        if av is None or bv is None:
            return None
        return round(bv - av, 1)

    # Delta tables — union of keys
    def delta_table(a_list, b_list):
        keys = set(x["key"] for x in a_list) | set(x["key"] for x in b_list)
        a_map = {x["key"]: x for x in a_list}
        b_map = {x["key"]: x for x in b_list}
        rows = []
        for k in keys:
            av = a_map.get(k, {"samples": 0, "mdr_rate": 0})
            bv = b_map.get(k, {"samples": 0, "mdr_rate": 0})
            rows.append({
                "key": k,
                "a_samples": av["samples"],
                "b_samples": bv["samples"],
                "a_rate": av["mdr_rate"],
                "b_rate": bv["mdr_rate"],
                "delta": round(bv["mdr_rate"] - av["mdr_rate"], 1),
                "sample_delta": bv["samples"] - av["samples"],
            })
        rows.sort(key=lambda r: abs(r["delta"]), reverse=True)
        return rows

    return {
        "a": side_a,
        "b": side_b,
        "deltas": {
            "total_records": delta_metric("total_records"),
            "mdr_rate": delta_metric("mdr_rate"),
            "anomaly_count": delta_metric("anomaly_count"),
            "active_counties": delta_metric("active_counties"),
        },
        "by_pathogen": delta_table(side_a["by_pathogen"], side_b["by_pathogen"]),
        "by_sector": delta_table(side_a["by_sector"], side_b["by_sector"]),
        "by_county": delta_table(side_a["by_county"], side_b["by_county"]),
    }

