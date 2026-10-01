from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from src.api.deps import get_db
from src.db.models import AMRIsolateRecord, SubCountyLocation

try:
    from src.modules.sampling_sites.models import SamplingSite

    _HAS_SITES = True
except ImportError:  # pragma: no cover
    _HAS_SITES = False


search_router = APIRouter()


@search_router.get("/query", status_code=status.HTTP_200_OK, response_model=list[dict[str, Any]])
def search_historical_isolates(
    pathogen_code: str | None = None,
    county: str | None = None,
    mdr_only: bool = False,
    anomaly_only: bool = False,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    try:
        query = db.query(AMRIsolateRecord)

        if pathogen_code:
            query = query.filter(AMRIsolateRecord.pathogen_code == pathogen_code.lower().strip())
        if county:
            query = query.filter(AMRIsolateRecord.county == county.strip())
        if mdr_only:
            query = query.filter(AMRIsolateRecord.mdr_flag == True)
        if anomaly_only:
            query = query.filter(AMRIsolateRecord.anomaly_flag == True)

        records = query.order_by(desc(AMRIsolateRecord.created_at)).limit(limit).all()

        return [
            {
                "record_id": str(r.record_id),
                "timestamp": r.created_at.isoformat(),
                "pathogen_code": r.pathogen_code,
                "antibiotic_class": r.antibiotic_class,
                "sector": r.sector,
                "county": r.county,
                "mdr_probability": float(r.mdr_probability) if r.mdr_probability is not None else 0.0,
                "anomaly_score": float(r.anomaly_score) if r.anomaly_score is not None else 0.0,
                "shap_top_feature": r.shap_top_feature,
            }
            for r in records
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Historical record repository lookup failed: {str(e)}",
        )


# ---------------------------------------------------------------------------
# Global free-text search
# ---------------------------------------------------------------------------


def _isolate_result(r: AMRIsolateRecord) -> dict[str, Any]:
    parts = [p for p in (r.county, r.sub_county, r.sector) if p]
    if r.mdr_flag:
        parts.append("MDR")
    return {
        "type": "Isolate",
        "id": str(r.record_id),
        "name": r.pathogen_code or "Unknown pathogen",
        "subtitle": " \u00b7 ".join(parts) or "No location",
        "url": f"/history?record={r.record_id}",
    }


def _site_result(s) -> dict[str, Any]:
    parts = [p for p in (s.county, s.sub_county, s.site_type) if p]
    return {
        "type": "Site",
        "id": str(s.id),
        "name": s.name,
        "subtitle": " \u00b7 ".join(parts) or "No location",
        "url": f"/sampling-sites?site={s.id}",
    }


def _region_result(r: SubCountyLocation) -> dict[str, Any]:
    return {
        "type": "Region",
        "id": f"{r.county}::{r.sub_county}",
        "name": r.sub_county or r.county,
        "subtitle": r.county,
        "url": f"/analytics?county={r.county}",
    }


@search_router.get("/search", response_model=list[dict[str, Any]])
def global_search(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Free-text search across isolates, sampling sites, and regions."""
    try:
        pattern = f"%{q.lower().strip()}%"
        results: list[dict[str, Any]] = []

        # Isolates: pathogen, county, sub-county
        isolates = (
            db.query(AMRIsolateRecord)
            .filter(
                or_(
                    func.lower(AMRIsolateRecord.pathogen_code).like(pattern),
                    func.lower(AMRIsolateRecord.county).like(pattern),
                    func.lower(AMRIsolateRecord.sub_county).like(pattern),
                )
            )
            .order_by(desc(AMRIsolateRecord.created_at))
            .limit(limit)
            .all()
        )
        results.extend(_isolate_result(r) for r in isolates)

        # Sampling sites
        if _HAS_SITES:
            sites = (
                db.query(SamplingSite)
                .filter(
                    or_(
                        func.lower(SamplingSite.name).like(pattern),
                        func.lower(SamplingSite.county).like(pattern),
                        func.lower(SamplingSite.sub_county).like(pattern),
                    )
                )
                .limit(limit)
                .all()
            )
            results.extend(_site_result(s) for s in sites)

        # Regions
        regions = (
            db.query(SubCountyLocation)
            .filter(
                or_(
                    func.lower(SubCountyLocation.county).like(pattern),
                    func.lower(SubCountyLocation.sub_county).like(pattern),
                )
            )
            .limit(limit)
            .all()
        )
        results.extend(_region_result(r) for r in regions)

        return results[:limit]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {e}",
        ) from e
