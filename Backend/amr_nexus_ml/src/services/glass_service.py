from __future__ import annotations

import csv
import io
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.db.models import AMRIsolateRecord, GlassReferenceMapping

MAPPING_TYPES = ("specimen", "sector", "antibiotic_class")


def _load_mappings(db: Session) -> dict[str, dict[str, str]]:
    rows = db.execute(select(GlassReferenceMapping)).scalars().all()
    out: dict[str, dict[str, str]] = {t: {} for t in MAPPING_TYPES}
    for r in rows:
        bucket = out.setdefault(r.mapping_type, {})
        bucket[r.raw_value.lower()] = r.glass_code
    return out


def _normalise(value: str | None) -> str:
    return (value or "").strip().lower()


def unmapped_values(
    db: Session,
    *,
    start: date | None = None,
    end: date | None = None,
    county: str | None = None,
) -> dict[str, list[dict[str, Any]]]:
    maps = _load_mappings(db)

    def _base():
        q = db.query(AMRIsolateRecord)
        if start:
            q = q.filter(AMRIsolateRecord.sample_collection_date >= start)
        if end:
            q = q.filter(AMRIsolateRecord.sample_collection_date <= end)
        if county:
            q = q.filter(AMRIsolateRecord.county == county)
        return q

    result: dict[str, list[dict[str, Any]]] = {}
    for mtype, column in (
        ("specimen", AMRIsolateRecord.specimen_type),
        ("sector", AMRIsolateRecord.sector),
        ("antibiotic_class", AMRIsolateRecord.antibiotic_class),
    ):
        rows = _base().with_entities(column, func.count(AMRIsolateRecord.record_id)).group_by(column).all()
        known = maps.get(mtype, {})
        missing = []
        for raw, count in rows:
            key = _normalise(raw)
            if key in known:
                continue
            missing.append(
                {
                    "raw_value": raw if raw not in (None, "") else "<blank>",
                    "isolate_count": int(count),
                }
            )
        missing.sort(key=lambda x: -x["isolate_count"])
        result[mtype] = missing

    return result


def export_glass(
    db: Session,
    *,
    start: date,
    end: date,
    county: str | None = None,
    strict: bool = False,
) -> dict[str, Any]:
    maps = _load_mappings(db)

    all_q = db.query(AMRIsolateRecord)
    if county:
        all_q = all_q.filter(AMRIsolateRecord.county == county)
    all_scoped = all_q.count()

    q = db.query(AMRIsolateRecord).filter(
        AMRIsolateRecord.sample_collection_date >= start,
        AMRIsolateRecord.sample_collection_date <= end,
    )
    if county:
        q = q.filter(AMRIsolateRecord.county == county)

    isolates = q.all()

    grouped: dict[tuple, dict[str, int]] = {}
    dropped = {
        "specimen": 0,
        "sector": 0,
        "antibiotic_class": 0,
        "no_pathogen": 0,
        "no_sample_date": max(0, all_scoped - len(isolates)),
    }
    total_isolates = all_scoped

    for iso in isolates:
        if not iso.pathogen_code:
            dropped["no_pathogen"] += 1
            continue

        specimen_key = _normalise(iso.specimen_type)
        sector_key = _normalise(iso.sector)
        abx_key = _normalise(iso.antibiotic_class)

        specimen = maps.get("specimen", {}).get(specimen_key)
        sector = maps.get("sector", {}).get(sector_key)
        abx = maps.get("antibiotic_class", {}).get(abx_key)

        if specimen is None:
            dropped["specimen"] += 1
            continue
        if sector is None:
            dropped["sector"] += 1
            continue
        if abx is None:
            dropped["antibiotic_class"] += 1
            continue

        year = iso.sample_collection_date.year if iso.sample_collection_date else iso.created_at.year

        key = (year, specimen, iso.pathogen_code, abx, sector)
        cell = grouped.setdefault(
            key,
            {
                "tested": 0,
                "resistant": 0,
                "intermediate": 0,
                "susceptible": 0,
                "unclassified": 0,
            },
        )
        cell["tested"] += 1
        sir = (iso.sir_result or "").strip().upper()
        if iso.mdr_flag or sir in ("R", "RESISTANT"):
            cell["resistant"] += 1
        elif sir in ("I", "INTERMEDIATE"):
            cell["intermediate"] += 1
        elif sir in ("S", "SUSCEPTIBLE"):
            cell["susceptible"] += 1
        else:
            cell["unclassified"] += 1

    if strict and sum(dropped.values()) > 0:
        return {
            "error": "strict_mode_failed",
            "dropped": dropped,
            "total_isolates": total_isolates,
            "message": (
                "strict=true and isolates could not be mapped. "
                "Resolve unmapped values or run with strict=false."
            ),
        }

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "CountryISO3",
            "Year",
            "Specimen",
            "PathogenCode",
            "AntibioticCode",
            "Sector",
            "Tested",
            "Resistant",
            "Intermediate",
            "Susceptible",
            "Unclassified",
        ]
    )
    for (year, specimen, pathogen, abx, sector), cell in sorted(grouped.items()):
        writer.writerow(
            [
                "KEN",
                year,
                specimen,
                pathogen,
                abx,
                sector,
                cell["tested"],
                cell["resistant"],
                cell["intermediate"],
                cell["susceptible"],
                cell["unclassified"],
            ]
        )

    exported_rows = len(grouped)
    grouped_isolates = sum(c["tested"] for c in grouped.values())
    mapped_isolates = grouped_isolates
    unclassified_total = sum(c["unclassified"] for c in grouped.values())

    return {
        "csv": buf.getvalue(),
        "scope": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "county": county,
            "strict": strict,
        },
        "summary": {
            "total_isolates": total_isolates,
            "mapped_isolates": mapped_isolates,
            "exported_rows": exported_rows,
            "coverage_pct": round((mapped_isolates / total_isolates) * 100, 1) if total_isolates else 0.0,
        },
        "dropped": dropped,
        "unclassified_isolates": unclassified_total,
        "generated_at": datetime.now(UTC).isoformat(),
    }
