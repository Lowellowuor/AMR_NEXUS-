"""HTTP router for the Sampling Sites module.

Mounted at /modules/sampling-sites by the module registry. Requires
authentication. Read for any authenticated user; write for admin/analyst.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.db.models import User
from src.modules.registry import ModuleMeta
from src.modules.sampling_sites import service
from src.modules.sampling_sites.schemas import (
    LinkedIsolate,
    SamplingSiteCreate,
    SamplingSiteRead,
    SamplingSiteUpdate,
)

MODULE_META = ModuleMeta(
    name="sampling_sites",
    version="0.1.0",
    description="Sampling sites and farm traceback.",
    nav_label="Sampling Sites",
    nav_order=45,
)

router = APIRouter(prefix="/modules/sampling-sites", tags=["sampling-sites"])

_WRITE_ROLES = {"admin", "analyst"}


def _require_write(user: User) -> None:
    if user.role not in _WRITE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or analyst role required",
        )


@router.get("", response_model=list[SamplingSiteRead])
def list_sites(
    county: str | None = Query(None),
    sector: str | None = Query(None),
    site_type: str | None = Query(None),
    active_only: bool = Query(True),
    limit: int = Query(500, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return service.list_sites(
        db,
        county=county,
        sector=sector,
        site_type=site_type,
        active_only=active_only,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=SamplingSiteRead, status_code=status.HTTP_201_CREATED)
def create_site(
    payload: SamplingSiteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_write(user)
    return service.create_site(db, payload, created_by=user.id)


@router.get("/{site_id}", response_model=SamplingSiteRead)
def get_site(
    site_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    site = service.get_site(db, site_id)
    if site is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Site not found"
        )
    return site


@router.patch("/{site_id}", response_model=SamplingSiteRead)
def update_site(
    site_id: int,
    payload: SamplingSiteUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_write(user)
    site = service.get_site(db, site_id)
    if site is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Site not found"
        )
    return service.update_site(db, site, payload)


@router.post("/{site_id}/deactivate", response_model=SamplingSiteRead)
def deactivate_site(
    site_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_write(user)
    site = service.get_site(db, site_id)
    if site is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Site not found"
        )
    return service.deactivate_site(db, site)


@router.get("/{site_id}/isolates", response_model=list[LinkedIsolate])
def site_isolates(
    site_id: int,
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    site = service.get_site(db, site_id)
    if site is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Site not found"
        )
    return service.list_isolates_for_site(
        db, site_id=site_id, limit=limit, offset=offset
    )
