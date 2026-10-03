"""HTTP router for the AMU/AMC module.

Mounted at /modules/amu by the module registry. Requires authentication
(via the global AuthMiddleware). Write operations require admin or analyst
role; all roles can read.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.db.models import User
from src.modules.amu import service
from src.modules.amu.schemas import (
    ConsumptionCreate,
    ConsumptionRead,
    DrugReferenceCreate,
    DrugReferenceRead,
    SummaryResponse,
    TopDrugsResponse,
    TrendResponse,
)
from src.modules.registry import ModuleMeta

MODULE_META = ModuleMeta(
    name="amu",
    version="0.1.0",
    description="Antimicrobial Use and Consumption module.",
    nav_label="Antimicrobial Use",
    nav_order=40,
)

router = APIRouter(prefix="/modules/amu", tags=["amu"])

_WRITE_ROLES = {"admin", "analyst"}


def _require_write(user: User) -> None:
    if user.role not in _WRITE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or analyst role required",
        )


# ---------- Drug reference ----------


@router.get("/drugs", response_model=list[DrugReferenceRead])
def list_drugs(
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return service.list_drugs(db, active_only=active_only)


@router.post(
    "/drugs",
    response_model=DrugReferenceRead,
    status_code=status.HTTP_201_CREATED,
)
def create_drug(
    payload: DrugReferenceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_write(user)
    return service.create_drug(db, payload)


# ---------- Consumption ----------


@router.get("/consumption", response_model=list[ConsumptionRead])
def list_consumption(
    county: str | None = Query(None),
    sector: str | None = Query(None),
    species: str | None = Query(None),
    drug_id: int | None = Query(None),
    start: datetime | None = Query(None),
    end: datetime | None = Query(None),
    limit: int = Query(500, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return service.list_consumption(
        db,
        county=county,
        sector=sector,
        species=species,
        drug_id=drug_id,
        start=start,
        end=end,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/consumption",
    response_model=ConsumptionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_consumption(
    payload: ConsumptionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_write(user)
    try:
        return service.create_consumption(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None


# ---------- Aggregations ----------


@router.get("/summary", response_model=SummaryResponse)
def summary(
    dimension: str = Query(..., description="county | sector | species | drug"),
    county: str | None = Query(None),
    start: datetime | None = Query(None),
    end: datetime | None = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    try:
        return service.summarise(db, dimension=dimension, county=county, start=start, end=end)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None


@router.get("/trend", response_model=TrendResponse)
def trend(
    county: str | None = Query(None),
    drug_id: int | None = Query(None),
    start: datetime | None = Query(None),
    end: datetime | None = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return service.trend(db, county=county, drug_id=drug_id, start=start, end=end)


@router.get("/top-drugs", response_model=TopDrugsResponse)
def top_drugs(
    county: str | None = Query(None),
    sector: str | None = Query(None),
    start: datetime | None = Query(None),
    end: datetime | None = Query(None),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return service.top_drugs(
        db,
        county=county,
        sector=sector,
        start=start,
        end=end,
        limit=limit,
    )


@router.get("/aware-breakdown")
def aware_breakdown_endpoint(
    county: str | None = Query(None),
    sector: str | None = Query(None),
    start: datetime | None = Query(None),
    end: datetime | None = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Consumption aggregated by WHO AWaRe category."""
    return service.aware_breakdown(db, county=county, sector=sector, start=start, end=end)
