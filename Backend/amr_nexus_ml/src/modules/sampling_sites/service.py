"""Business logic for the Sampling Sites module."""

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from src.db.models import AMRIsolateRecord
from src.modules.sampling_sites.models import SamplingSite
from src.modules.sampling_sites.schemas import (
    SamplingSiteCreate,
    SamplingSiteUpdate,
)


def list_sites(
    db: Session,
    county: str | None = None,
    sector: str | None = None,
    site_type: str | None = None,
    active_only: bool = True,
    limit: int = 500,
    offset: int = 0,
) -> list[SamplingSite]:
    stmt = select(SamplingSite)
    if county:
        stmt = stmt.where(SamplingSite.county == county)
    if sector:
        stmt = stmt.where(SamplingSite.sector == sector)
    if site_type:
        stmt = stmt.where(SamplingSite.site_type == site_type)
    if active_only:
        stmt = stmt.where(SamplingSite.is_active.is_(True))
    stmt = stmt.order_by(SamplingSite.name).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


def get_site(db: Session, site_id: int) -> SamplingSite | None:
    return db.get(SamplingSite, site_id)


def create_site(
    db: Session,
    payload: SamplingSiteCreate,
    created_by: int | None,
) -> SamplingSite:
    site = SamplingSite(**payload.model_dump(), created_by=created_by)
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


def update_site(
    db: Session,
    site: SamplingSite,
    payload: SamplingSiteUpdate,
) -> SamplingSite:
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(site, key, value)
    db.commit()
    db.refresh(site)
    return site


def deactivate_site(db: Session, site: SamplingSite) -> SamplingSite:
    site.is_active = False
    db.commit()
    db.refresh(site)
    return site


def list_isolates_for_site(
    db: Session,
    site_id: int,
    limit: int = 200,
    offset: int = 0,
) -> list[AMRIsolateRecord]:
    """Triangulation: return isolates linked to this sampling site."""
    stmt = (
        select(AMRIsolateRecord)
        .where(AMRIsolateRecord.site_id == site_id)
        .order_by(desc(AMRIsolateRecord.sample_collection_date))
        .limit(limit)
        .offset(offset)
    )
    return list(db.execute(stmt).scalars().all())
