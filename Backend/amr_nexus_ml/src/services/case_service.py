from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.db.models import AMRIsolateRecord, Case
from src.modules.sampling_sites.models import SamplingSite  # noqa: F401


def _county_prefix(county: str | None) -> str:
    token = (county or "UNK").strip().upper()
    letters = "".join(c for c in token if c.isalpha())[:3]
    return letters or "UNK"


def _generate_case_code(db: Session, county: str | None) -> str:
    year = datetime.now(UTC).year
    prefix = _county_prefix(county)
    like = f"{prefix}-{year}-%"
    existing = db.execute(select(func.count(Case.id)).where(Case.case_code.like(like))).scalar() or 0
    return f"{prefix}-{year}-{existing + 1:04d}"


def create_case(
    db: Session,
    *,
    county: str,
    sub_county: str | None = None,
    sector: str | None = None,
    species: str | None = None,
    site_id: int | None = None,
    case_type: str = "individual",
    notes: str | None = None,
    created_by: int | None = None,
    first_isolate_at: datetime | None = None,
) -> Case:
    now = datetime.now(UTC)
    case = Case(
        case_code=_generate_case_code(db, county),
        case_type=case_type,
        status="open",
        county=county,
        sub_county=sub_county,
        sector=sector,
        species=species,
        site_id=site_id,
        first_isolate_at=first_isolate_at or now,
        latest_isolate_at=first_isolate_at or now,
        notes=notes,
        created_by=created_by,
        created_at=now,
        updated_at=now,
    )
    db.add(case)
    db.flush()
    return case


def _null_safe_equal(a: Any, b: Any) -> bool:
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return a == b


def find_matching_open_case(
    db: Session,
    *,
    county: str,
    sub_county: str | None,
    sector: str | None,
    species: str | None,
    site_id: int | None,
    when: datetime,
    window_days: int = 30,
) -> Case | None:
    if not county:
        return None
    if sector is None:
        return None
    if site_id is None and species is None:
        return None

    since = when - timedelta(days=window_days)

    candidates = (
        db.execute(
            select(Case)
            .where(
                Case.status == "open",
                Case.county == county,
                Case.latest_isolate_at.is_not(None),
                Case.latest_isolate_at >= since,
            )
            .order_by(Case.latest_isolate_at.desc())
        )
        .scalars()
        .all()
    )

    for c in candidates:
        if not _null_safe_equal(c.sub_county, sub_county):
            continue
        if not _null_safe_equal(c.sector, sector):
            continue
        if not _null_safe_equal(c.site_id, site_id):
            continue
        if not _null_safe_equal(c.species, species):
            continue
        if c.site_id is None and c.species is None:
            continue
        return c

    return None


def associate_isolate(
    db: Session,
    record: AMRIsolateRecord,
    *,
    window_days: int = 30,
    created_by: int | None = None,
) -> Case | None:
    county = (record.county or "").strip()
    sector = (record.sector or "").strip()
    species = record.animal_species
    site_id = record.site_id

    if not county or not sector:
        return None
    if site_id is None and not species:
        return None

    when = record.sample_collection_date or record.created_at or datetime.now(UTC)
    match = find_matching_open_case(
        db,
        county=county,
        sub_county=record.sub_county,
        sector=sector,
        species=species,
        site_id=site_id,
        when=when,
        window_days=window_days,
    )

    if match is None:
        match = create_case(
            db,
            county=county,
            sub_county=record.sub_county,
            sector=sector,
            species=species,
            site_id=site_id,
            created_by=created_by,
            first_isolate_at=when,
        )
    else:
        if match.latest_isolate_at is None or when > match.latest_isolate_at:
            match.latest_isolate_at = when
        if match.first_isolate_at is None or when < match.first_isolate_at:
            match.first_isolate_at = when
        match.updated_at = datetime.now(UTC)

    record.case_id = match.id
    return match


def link_isolate(db: Session, record_id: int, case_id: int) -> AMRIsolateRecord:
    record = db.get(AMRIsolateRecord, record_id)
    if record is None:
        raise ValueError(f"isolate {record_id} not found")
    target = db.get(Case, case_id)
    if target is None:
        raise ValueError(f"case {case_id} not found")
    record.case_id = target.id
    if record.created_at is not None:
        if target.latest_isolate_at is None or record.created_at > target.latest_isolate_at:
            target.latest_isolate_at = record.created_at
        if target.first_isolate_at is None or record.created_at < target.first_isolate_at:
            target.first_isolate_at = record.created_at
    target.updated_at = datetime.now(UTC)
    db.flush()
    return record


def detach_isolate(db: Session, record_id: int) -> AMRIsolateRecord:
    record = db.get(AMRIsolateRecord, record_id)
    if record is None:
        raise ValueError(f"isolate {record_id} not found")
    record.case_id = None
    db.flush()
    return record


def _isolate_summary(r: AMRIsolateRecord) -> dict[str, Any]:
    return {
        "record_id": r.record_id,
        "pathogen_code": r.pathogen_code,
        "sector": r.sector,
        "species": r.animal_species,
        "specimen_type": r.specimen_type,
        "county": r.county,
        "sub_county": r.sub_county,
        "site_id": r.site_id,
        "mdr_flag": bool(r.mdr_flag) if r.mdr_flag is not None else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def get_case_detail(db: Session, case_id: int) -> dict[str, Any] | None:
    case = db.get(Case, case_id)
    if case is None:
        return None
    isolates = (
        db.execute(
            select(AMRIsolateRecord)
            .where(AMRIsolateRecord.case_id == case.id)
            .order_by(AMRIsolateRecord.created_at.asc())
        )
        .scalars()
        .all()
    )

    total = len(isolates)
    mdr = sum(1 for r in isolates if r.mdr_flag)
    return {
        "id": case.id,
        "case_code": case.case_code,
        "case_type": case.case_type,
        "status": case.status,
        "county": case.county,
        "sub_county": case.sub_county,
        "sector": case.sector,
        "species": case.species,
        "site_id": case.site_id,
        "first_isolate_at": case.first_isolate_at.isoformat() if case.first_isolate_at else None,
        "latest_isolate_at": case.latest_isolate_at.isoformat() if case.latest_isolate_at else None,
        "notes": case.notes,
        "created_at": case.created_at.isoformat() if case.created_at else None,
        "updated_at": case.updated_at.isoformat() if case.updated_at else None,
        "isolate_count": total,
        "mdr_count": mdr,
        "mdr_rate": round((mdr / total) * 100, 1) if total else 0.0,
        "isolates": [_isolate_summary(r) for r in isolates],
    }


def list_cases(
    db: Session,
    *,
    county: str | None = None,
    status: str | None = None,
    sector: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    q = select(Case)
    if county:
        q = q.where(Case.county == county)
    if status:
        q = q.where(Case.status == status)
    if sector:
        q = q.where(Case.sector == sector)
    q = q.order_by(Case.latest_isolate_at.desc().nullslast()).limit(limit).offset(offset)

    cases = db.execute(q).scalars().all()
    ids = [c.id for c in cases] or [0]

    counts = dict(
        db.execute(
            select(
                AMRIsolateRecord.case_id,
                func.count(AMRIsolateRecord.record_id),
            )
            .where(AMRIsolateRecord.case_id.in_(ids))
            .group_by(AMRIsolateRecord.case_id)
        ).all()
    )

    mdr_counts = dict(
        db.execute(
            select(
                AMRIsolateRecord.case_id,
                func.count(AMRIsolateRecord.record_id),
            )
            .where(
                AMRIsolateRecord.case_id.in_(ids),
                AMRIsolateRecord.mdr_flag.is_(True),
            )
            .group_by(AMRIsolateRecord.case_id)
        ).all()
    )

    out = []
    for c in cases:
        total = int(counts.get(c.id, 0))
        mdr = int(mdr_counts.get(c.id, 0))
        out.append(
            {
                "id": c.id,
                "case_code": c.case_code,
                "case_type": c.case_type,
                "status": c.status,
                "county": c.county,
                "sub_county": c.sub_county,
                "sector": c.sector,
                "species": c.species,
                "site_id": c.site_id,
                "first_isolate_at": c.first_isolate_at.isoformat() if c.first_isolate_at else None,
                "latest_isolate_at": c.latest_isolate_at.isoformat() if c.latest_isolate_at else None,
                "isolate_count": total,
                "mdr_count": mdr,
                "mdr_rate": round((mdr / total) * 100, 1) if total else 0.0,
            }
        )
    return out
