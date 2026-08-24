from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from src.db.models import AMRIsolateRecord, SubCountyLocation


def _get_coordinates_lookup(db: Session) -> Dict[Tuple[str, str], Tuple[float, float]]:
    rows = db.query(
        SubCountyLocation.county,
        SubCountyLocation.sub_county,
        SubCountyLocation.latitude,
        SubCountyLocation.longitude,
    ).all()
    return {(row.county, row.sub_county): (float(row.longitude), float(row.latitude)) for row in rows}


def get_sub_county_mdr(db: Session, start_date: str = None, end_date: str = None) -> List[Dict[str, Any]]:
    query = db.query(
        AMRIsolateRecord.county,
        AMRIsolateRecord.sub_county,
        func.avg(AMRIsolateRecord.mdr_probability).label('avg_mdr_prob'),
        func.count(AMRIsolateRecord.record_id).label('sample_count')
    )
    if start_date:
        query = query.filter(AMRIsolateRecord.sample_collection_date >= start_date)
    if end_date:
        query = query.filter(AMRIsolateRecord.sample_collection_date <= end_date)
    query = query.group_by(AMRIsolateRecord.county, AMRIsolateRecord.sub_county)
    rows = query.all()

    coords = _get_coordinates_lookup(db)

    features = []
    for row in rows:
        county, sub_county, avg_mdr_prob, sample_count = row
        avg_mdr_prob = float(avg_mdr_prob or 0.0)
        risk_level = "high" if avg_mdr_prob > 0.3 else "medium" if avg_mdr_prob > 0.2 else "low"
        lon, lat = coords.get((county, sub_county), (0.0, 0.0))
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "county": county,
                "sub_county": sub_county,
                "mdr_rate": round(avg_mdr_prob, 3),
                "risk_level": risk_level,
                "sample_count": sample_count,
            }
        })
    return features


def get_mdr_difference(db: Session, start_month: str, end_month: str) -> List[Dict[str, Any]]:
    start_date = f"{start_month}-01"
    end_date = (datetime.strptime(f"{end_month}-01", "%Y-%m-%d") + timedelta(days=31)).strftime("%Y-%m-%d")

    def query_period(period_start, period_end):
        q = db.query(
            AMRIsolateRecord.county,
            AMRIsolateRecord.sub_county,
            func.avg(AMRIsolateRecord.mdr_probability).label('avg_mdr_prob')
        ).filter(
            AMRIsolateRecord.sample_collection_date >= period_start,
            AMRIsolateRecord.sample_collection_date < period_end
        ).group_by(AMRIsolateRecord.county, AMRIsolateRecord.sub_county)
        return {(row.county, row.sub_county): float(row.avg_mdr_prob or 0.0) for row in q.all()}

    previous = query_period(start_date, f"{start_month}-31")
    current = query_period(f"{end_month}-01", end_date)

    all_keys = set(previous.keys()) | set(current.keys())
    coords = _get_coordinates_lookup(db)

    features = []
    for key in all_keys:
        county, sub_county = key
        prev_rate = previous.get(key, 0.0)
        curr_rate = current.get(key, 0.0)
        change = round(curr_rate - prev_rate, 3)
        change_percent = round((change / prev_rate * 100) if prev_rate else 0.0, 1)
        lon, lat = coords.get(key, (0.0, 0.0))
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "county": county,
                "sub_county": sub_county,
                "previous_rate": prev_rate,
                "current_rate": curr_rate,
                "change": change,
                "change_percent": change_percent,
            }
        })
    return features