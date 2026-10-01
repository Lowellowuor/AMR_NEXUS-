"""Business logic for the AMU/AMC module.

Aggregation is performed here. Raw quantity + unit is stored as entered;
normalisation to standard units happens at read time so the schema never
needs to change when new units are added.
"""
from datetime import datetime

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from src.modules.amu.models import AMUConsumption, AMUDrug
from src.modules.amu.schemas import (
    ConsumptionCreate,
    DrugReferenceCreate,
    SummaryBucket,
    SummaryResponse,
    TopDrug,
    TopDrugsResponse,
    TrendPoint,
    TrendResponse,
)

# Simple unit-to-gram conversion table. Extend as new units appear.
# Values are grams per unit. Any unknown unit is treated as 1:1.
_UNIT_TO_GRAMS = {
    "mg": 0.001,
    "g": 1.0,
    "kg": 1000.0,
    "ml": 1.0,      # assume density ~1 for liquids for now
    "l": 1000.0,
    "tablet": 1.0,
    "dose": 1.0,
    "iu": 1.0,
    "unit": 1.0,
}


def normalise_quantity(quantity: float, unit: str) -> float:
    """Return quantity converted to grams (or equivalent base unit)."""
    factor = _UNIT_TO_GRAMS.get(unit.lower(), 1.0)
    return float(quantity) * factor


# ---------- Drug reference ----------

def list_drugs(db: Session, active_only: bool = False) -> list[AMUDrug]:
    stmt = select(AMUDrug)
    if active_only:
        stmt = stmt.where(AMUDrug.is_active.is_(True))
    return list(db.execute(stmt.order_by(AMUDrug.name)).scalars().all())


def get_drug(db: Session, drug_id: int) -> AMUDrug | None:
    return db.get(AMUDrug, drug_id)


def create_drug(db: Session, payload: DrugReferenceCreate) -> AMUDrug:
    drug = AMUDrug(**payload.model_dump())
    db.add(drug)
    db.commit()
    db.refresh(drug)
    return drug


# ---------- Consumption ----------

def list_consumption(
    db: Session,
    county: str | None = None,
    sector: str | None = None,
    species: str | None = None,
    drug_id: int | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = 500,
    offset: int = 0,
) -> list[AMUConsumption]:
    stmt = select(AMUConsumption)
    if county:
        stmt = stmt.where(AMUConsumption.county == county)
    if sector:
        stmt = stmt.where(AMUConsumption.sector == sector)
    if species:
        stmt = stmt.where(AMUConsumption.species == species)
    if drug_id:
        stmt = stmt.where(AMUConsumption.drug_id == drug_id)
    if start:
        stmt = stmt.where(AMUConsumption.period_start >= start)
    if end:
        stmt = stmt.where(AMUConsumption.period_start <= end)
    stmt = stmt.order_by(desc(AMUConsumption.period_start)).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


def create_consumption(db: Session, payload: ConsumptionCreate) -> AMUConsumption:
    # Validate drug exists
    drug = db.get(AMUDrug, payload.drug_id)
    if drug is None:
        raise ValueError(f"Drug id {payload.drug_id} not found")
    record = AMUConsumption(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ---------- Aggregations ----------

_ALLOWED_DIMENSIONS = {
    "county": AMUConsumption.county,
    "sector": AMUConsumption.sector,
    "species": AMUConsumption.species,
    "drug": AMUConsumption.drug_id,
}


def summarise(
    db: Session,
    dimension: str,
    county: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
) -> SummaryResponse:
    if dimension not in _ALLOWED_DIMENSIONS:
        raise ValueError(
            f"dimension must be one of {sorted(_ALLOWED_DIMENSIONS.keys())}"
        )
    column = _ALLOWED_DIMENSIONS[dimension]

    stmt = select(
        column,
        func.sum(AMUConsumption.quantity),
        func.count(AMUConsumption.id),
    ).group_by(column)

    if county:
        stmt = stmt.where(AMUConsumption.county == county)
    if start:
        stmt = stmt.where(AMUConsumption.period_start >= start)
    if end:
        stmt = stmt.where(AMUConsumption.period_start <= end)

    rows = db.execute(stmt).all()
    buckets: list[SummaryBucket] = []
    total_quantity = 0.0
    total_records = 0
    for key, quantity, records in rows:
        q = float(quantity or 0.0)
        r = int(records or 0)
        buckets.append(SummaryBucket(key=str(key), quantity=q, records=r))
        total_quantity += q
        total_records += r

    buckets.sort(key=lambda b: b.quantity, reverse=True)

    return SummaryResponse(
        dimension=dimension,
        buckets=buckets,
        total_quantity=total_quantity,
        total_records=total_records,
    )


def trend(
    db: Session,
    county: str | None = None,
    drug_id: int | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
) -> TrendResponse:
    # Group by YYYY-MM using SQLite-compatible strftime; if running on
    # PostgreSQL this would be to_char(period_start, 'YYYY-MM'). Kept
    # simple and portable via func.strftime for the pilot.
    period_col = func.strftime("%Y-%m", AMUConsumption.period_start).label("period")

    stmt = select(
        period_col,
        func.sum(AMUConsumption.quantity),
        func.count(AMUConsumption.id),
    ).group_by(period_col).order_by(period_col)

    if county:
        stmt = stmt.where(AMUConsumption.county == county)
    if drug_id:
        stmt = stmt.where(AMUConsumption.drug_id == drug_id)
    if start:
        stmt = stmt.where(AMUConsumption.period_start >= start)
    if end:
        stmt = stmt.where(AMUConsumption.period_start <= end)

    rows = db.execute(stmt).all()
    points = [
        TrendPoint(period=str(p), quantity=float(q or 0.0), records=int(r or 0))
        for p, q, r in rows
    ]
    return TrendResponse(county=county, drug_id=drug_id, points=points)


def top_drugs(
    db: Session,
    county: str | None = None,
    sector: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = 10,
) -> TopDrugsResponse:
    stmt = (
        select(
            AMUDrug.id,
            AMUDrug.name,
            func.sum(AMUConsumption.quantity),
            func.count(AMUConsumption.id),
        )
        .join(AMUConsumption, AMUConsumption.drug_id == AMUDrug.id)
        .group_by(AMUDrug.id, AMUDrug.name)
        .order_by(desc(func.sum(AMUConsumption.quantity)))
        .limit(limit)
    )

    if county:
        stmt = stmt.where(AMUConsumption.county == county)
    if sector:
        stmt = stmt.where(AMUConsumption.sector == sector)
    if start:
        stmt = stmt.where(AMUConsumption.period_start >= start)
    if end:
        stmt = stmt.where(AMUConsumption.period_start <= end)

    rows = db.execute(stmt).all()
    items = [
        TopDrug(
            drug_id=int(did),
            name=str(name),
            quantity=float(q or 0.0),
            records=int(r or 0),
        )
        for did, name, q, r in rows
    ]
    return TopDrugsResponse(items=items, limit=limit)
