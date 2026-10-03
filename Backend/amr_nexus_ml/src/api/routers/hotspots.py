from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.api.deps import require_admin
from src.database import get_db
from src.db.models import AMRIsolateRecord, Hotspot, User

router = APIRouter(prefix="/hotspots", tags=["hotspots"])


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        return None


def compute_hotspot_stats(
    db: Session,
    hotspot_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    pathogen: str | None = None,
    sector: str | None = None,
):
    query = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.hotspot_id == hotspot_id)
    if start_date:
        query = query.filter(AMRIsolateRecord.sample_collection_date >= start_date)
    if end_date:
        query = query.filter(AMRIsolateRecord.sample_collection_date <= end_date)
    if pathogen:
        query = query.filter(AMRIsolateRecord.pathogen_code == pathogen)
    if sector:
        query = query.filter(AMRIsolateRecord.sector == sector)

    records = query.all()
    total_samples = len(records)
    if total_samples == 0:
        return 0, 0.0, []

    mdr_count = sum(1 for r in records if r.mdr_flag)
    overall_rate = (mdr_count / total_samples) * 100

    breakdown = {}
    for r in records:
        key = r.pathogen_code
        if key not in breakdown:
            breakdown[key] = {"pathogen": key, "count": 0, "mdr_count": 0}
        breakdown[key]["count"] += 1
        if r.mdr_flag:
            breakdown[key]["mdr_count"] += 1

    breakdown_list = []
    for p in breakdown.values():
        p["rate"] = (p["mdr_count"] / p["count"]) * 100 if p["count"] > 0 else 0
        breakdown_list.append(p)

    return total_samples, overall_rate, breakdown_list


@router.get("", response_model=list[dict])
def get_hotspots(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    county: str | None = Query(None),
    pathogen: str | None = Query(None),
    sector: str | None = Query(None),
    db: Session = Depends(get_db),
):
    start = _parse_date(start_date)
    end = _parse_date(end_date)
    county = county or None
    pathogen = pathogen or None
    sector = sector or None

    hotspots = db.query(Hotspot).filter(Hotspot.is_active == True)
    if county:
        hotspots = hotspots.filter(Hotspot.county == county)
    hotspots = hotspots.all()

    result = []
    for h in hotspots:
        total_samples, resistance_rate, breakdown = compute_hotspot_stats(
            db, h.id, start, end, pathogen, sector
        )
        result.append(
            {
                "id": h.id,
                "name": h.name,
                "type": h.type,
                "latitude": float(h.latitude),
                "longitude": float(h.longitude),
                "county": h.county,
                "sub_county": h.sub_county,
                "address": h.address,
                "contact": h.contact,
                "total_samples": total_samples,
                "resistance_rate": resistance_rate,
                "pathogen_breakdown": breakdown,
            }
        )
    return result


@router.post("", status_code=201)
def create_hotspot(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    hotspot = Hotspot(**payload)
    db.add(hotspot)
    db.commit()
    db.refresh(hotspot)
    return hotspot


@router.put("/{hotspot_id}")
def update_hotspot(
    hotspot_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    hotspot = db.query(Hotspot).filter(Hotspot.id == hotspot_id).first()
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    for key, value in payload.items():
        setattr(hotspot, key, value)
    db.commit()
    db.refresh(hotspot)
    return hotspot


@router.delete("/{hotspot_id}", status_code=204)
def delete_hotspot(
    hotspot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    hotspot = db.query(Hotspot).filter(Hotspot.id == hotspot_id).first()
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    hotspot.is_active = False
    db.commit()
    return None
