from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.db.models import User
from src.services import county_service

county_router = APIRouter()


@county_router.get("/{county}/coverage", response_model=dict[str, Any])
async def coverage(
    county: str,
    days: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return county_service.coverage(db, county=county, days=days)


@county_router.get("/{county}/situation", response_model=dict[str, Any])
async def situation(
    county: str,
    days: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return county_service.situation(db, county=county, days=days)


@county_router.get("/{county}/sub-county-ranking", response_model=dict[str, Any])
async def sub_county_ranking(
    county: str,
    days: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return county_service.sub_county_ranking(db, county=county, days=days)


@county_router.get("/{county}/burden", response_model=dict[str, Any])
async def burden(
    county: str,
    days: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return county_service.burden(db, county=county, days=days)


@county_router.get("/{county}/action-plan-status", response_model=dict[str, Any])
async def action_plan_status(
    county: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return county_service.action_plan_status(db, county=county)


@county_router.get("/{county}/intervention-tracker", response_model=list[dict[str, Any]])
async def intervention_tracker(
    county: str,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return county_service.intervention_tracker(db, county=county, limit=limit)


@county_router.get("/{county}/priority-isolates", response_model=list[dict[str, Any]])
async def priority_isolates(
    county: str,
    limit: int = 5,
    days: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return county_service.priority_isolates(db, county=county, limit=limit, days=days)


@county_router.get("/{county}/overview", response_model=dict[str, Any])
async def overview(
    county: str,
    days: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return {
        "coverage": county_service.coverage(db, county=county, days=days),
        "situation": county_service.situation(db, county=county, days=days),
        "ranking": county_service.sub_county_ranking(db, county=county, days=days),
        "burden": county_service.burden(db, county=county, days=days),
        "action_plan": county_service.action_plan_status(db, county=county),
        "interventions": county_service.intervention_tracker(db, county=county, limit=10),
        "priority_isolates": county_service.priority_isolates(db, county=county, limit=5, days=days),
    }


@county_router.get("/{county}/trend-comparison", response_model=dict[str, Any])
async def trend_comparison(
    county: str,
    months: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    from src.services import county_trend_service

    return county_trend_service.trend_comparison(db, county=county, months=months)
