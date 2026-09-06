from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from src.database import get_db
from src.db.models import Hotspot, AMRIsolateRecord
from src.api.deps import require_admin

router = APIRouter(prefix="/hotspots", tags=["hotspots"])


def _parse_date(value: Optional[str]) -> Optional[date]:
    """Convert an ISO date string to a date object, or return None if empty/invalid."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        # If invalid, treat as None to avoid 500
        return None


def compute_hotspot_stats(
    db: Session,
    hotspot_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    pathogen: Optional[str] = None,
    sector: Optional[str] = None,
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


@router.get("/", response_model=List[dict])
def get_hotspots(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    county: Optional[str] = Query(None),
    pathogen: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    # Convert empty strings / invalid dates to None
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
        result.append({
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
        })
    return result


@router.post("/", status_code=201)
def create_hotspot(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
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
    current_user=Depends(require_admin),
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
    current_user=Depends(require_admin),
):
    hotspot = db.query(Hotspot).filter(Hotspot.id == hotspot_id).first()
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    hotspot.is_active = False
    db.commit()
    return None