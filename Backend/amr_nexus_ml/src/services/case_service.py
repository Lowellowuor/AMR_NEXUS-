from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.db.models import AMRIsolateRecord, Case, CaseEvent, User
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
    record_event(db, case_id=case.id, event_type="created", note=None)
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
    record_event(
        db,
        case_id=target.id,
        event_type="isolate_linked",
        note=f"isolate {record.record_id}",
    )
    db.flush()
    return record


def detach_isolate(db: Session, record_id: int) -> AMRIsolateRecord:
    record = db.get(AMRIsolateRecord, record_id)
    if record is None:
        raise ValueError(f"isolate {record_id} not found")
    old_case_id = record.case_id
    record.case_id = None
    if old_case_id is not None:
        record_event(
            db,
            case_id=old_case_id,
            event_type="isolate_detached",
            note=f"isolate {record.record_id}",
        )
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
        "validation_state": r.validation_state or "unverified",
        "investigation_status": r.investigation_status or "none",
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
        "closed_at": case.closed_at.isoformat() if case.closed_at else None,
        "closed_by": case.closed_by,
        "closed_reason": case.closed_reason,
        "closed_note": case.closed_note,
        "isolate_count": total,
        "mdr_count": mdr,
        "mdr_rate": round((mdr / total) * 100, 1) if total else 0.0,
        "isolates": [_isolate_summary(r) for r in isolates],
        "events": get_case_events(db, case.id),
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


def merge_cases(
    db: Session,
    *,
    target_case_id: int,
    source_case_id: int,
    user_id: int | None = None,
) -> dict[str, Any]:
    if target_case_id == source_case_id:
        raise ValueError("target and source must differ")

    target = db.get(Case, target_case_id)
    if target is None:
        raise ValueError("target case not found")
    source = db.get(Case, source_case_id)
    if source is None:
        raise ValueError("source case not found")

    moved = (
        db.query(AMRIsolateRecord)
        .filter(AMRIsolateRecord.case_id == source_case_id)
        .update({AMRIsolateRecord.case_id: target_case_id})
    )

    db.flush()

    isolates = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.case_id == target_case_id).all()
    if isolates:
        dates = [r.created_at for r in isolates if r.created_at]
        if dates:
            target.first_isolate_at = min(dates)
            target.latest_isolate_at = max(dates)
        target.sector = target.sector or (isolates[0].sector if isolates else None)
        target.species = target.species or (isolates[0].animal_species if isolates else None)
        target.site_id = target.site_id or (isolates[0].site_id if isolates else None)

    if source.notes:
        merged_note = f"[merged from {source.case_code}] {source.notes}"
        if target.notes:
            target.notes = f"{target.notes}\n{merged_note}"
        else:
            target.notes = merged_note

    target.updated_at = datetime.now(UTC)

    record_event(
        db,
        case_id=target.id,
        event_type="merged_in",
        note=f"merged {source.case_code} ({moved} isolates)",
    )
    db.delete(source)
    db.commit()
    db.refresh(target)

    return {
        "target_case_id": target.id,
        "target_case_code": target.case_code,
        "source_case_id": source_case_id,
        "isolates_moved": int(moved),
    }


def split_isolate(
    db: Session,
    *,
    record_id: int | str,
    source_case_id: int,
    user_id: int | None = None,
) -> dict[str, Any]:
    from uuid import UUID as _UUID

    source = db.get(Case, source_case_id)
    if source is None:
        raise ValueError("source case not found")

    if isinstance(record_id, str):
        try:
            record_uuid = _UUID(record_id)
        except ValueError as e:
            raise ValueError("invalid record id") from e
    else:
        record_uuid = record_id

    isolate = db.get(AMRIsolateRecord, record_uuid)
    if isolate is None:
        raise ValueError("isolate not found")
    if isolate.case_id != source_case_id:
        raise ValueError("isolate is not in the source case")

    when = isolate.created_at or datetime.now(UTC)
    new_case = create_case(
        db,
        county=source.county,
        sub_county=source.sub_county,
        sector=source.sector,
        species=source.species,
        site_id=source.site_id,
        created_by=user_id,
        first_isolate_at=when,
        notes=f"[split from {source.case_code}]",
    )

    isolate.case_id = new_case.id
    db.flush()

    remaining = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.case_id == source_case_id).all()
    if remaining:
        dates = [r.created_at for r in remaining if r.created_at]
        if dates:
            source.first_isolate_at = min(dates)
            source.latest_isolate_at = max(dates)
        source.updated_at = datetime.now(UTC)
    else:
        source.updated_at = datetime.now(UTC)

    record_event(
        db,
        case_id=source.id,
        event_type="split_out",
        note=f"isolate {isolate.record_id} -> {new_case.case_code}",
    )
    db.commit()
    db.refresh(new_case)

    return {
        "new_case_id": new_case.id,
        "new_case_code": new_case.case_code,
        "from_case_id": source_case_id,
        "record_id": str(isolate.record_id),
    }


CLOSE_REASONS = (
    "resolved",
    "referred",
    "duplicate",
    "insufficient_data",
    "no_action",
    "other",
)


def record_event(
    db: Session,
    *,
    case_id: int,
    event_type: str,
    note: str | None = None,
    actor: User | None = None,
) -> CaseEvent:
    event = CaseEvent(
        case_id=case_id,
        event_type=event_type,
        note=note,
        actor_id=actor.id if actor else None,
        actor_name=(actor.name or actor.email) if actor else None,
        created_at=datetime.now(UTC),
    )
    db.add(event)
    return event


def get_case_events(db: Session, case_id: int) -> list[dict[str, Any]]:
    rows = (
        db.execute(
            select(CaseEvent).where(CaseEvent.case_id == case_id).order_by(CaseEvent.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [
        {
            "id": r.id,
            "case_id": r.case_id,
            "event_type": r.event_type,
            "note": r.note,
            "actor_id": r.actor_id,
            "actor_name": r.actor_name,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


def close_case(
    db: Session,
    *,
    case_id: int,
    reason: str,
    note: str | None,
    actor: User | None = None,
) -> dict[str, Any]:
    case = db.get(Case, case_id)
    if case is None:
        raise ValueError("case not found")
    if case.status == "closed":
        raise ValueError("case is already closed")
    if reason not in CLOSE_REASONS:
        raise ValueError(f"reason must be one of {sorted(CLOSE_REASONS)}")

    case.status = "closed"
    case.closed_at = datetime.now(UTC)
    case.closed_by = actor.id if actor else None
    case.closed_reason = reason
    case.closed_note = note
    case.updated_at = datetime.now(UTC)

    record_event(
        db,
        case_id=case.id,
        event_type="closed",
        note=f"Reason: {reason}" + (f". {note}" if note else ""),
        actor=actor,
    )

    db.commit()
    db.refresh(case)
    return get_case_detail(db, case_id)


def reopen_case(
    db: Session,
    *,
    case_id: int,
    actor: User | None = None,
) -> dict[str, Any]:
    case = db.get(Case, case_id)
    if case is None:
        raise ValueError("case not found")
    if case.status != "closed":
        raise ValueError("case is not closed")

    case.status = "open"
    case.closed_at = None
    case.closed_by = None
    case.closed_reason = None
    case.closed_note = None
    case.updated_at = datetime.now(UTC)

    record_event(
        db,
        case_id=case.id,
        event_type="reopened",
        note=None,
        actor=actor,
    )

    db.commit()
    db.refresh(case)
    return get_case_detail(db, case_id)
