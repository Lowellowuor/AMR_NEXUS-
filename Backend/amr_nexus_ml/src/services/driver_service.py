from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.db.models import AMRIsolateRecord
from src.services import config_service


def _wilson_interval(successes: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return 0.0, 0.0
    p = successes / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    spread = z * ((p * (1 - p) / n) + z * z / (4 * n * n)) ** 0.5 / denom
    lower = max(0.0, centre - spread)
    upper = min(1.0, centre + spread)
    return round(lower * 100, 1), round(upper * 100, 1)


def _confidence_label(n: int, low: float, high: float) -> str:
    if n < 30:
        return "low"
    if (high - low) <= 15.0:
        return "high"
    if (high - low) <= 30.0:
        return "medium"
    return "low"


DRIVERS = [
    {
        "id": "prior_exposure",
        "label": "Prior antibiotic exposure",
        "column": AMRIsolateRecord.prior_antibiotic_exposure,
        "match": True,
        "kind": "bool",
        "note": (
            "Documented prior exposure is a leading driver of resistance. "
            "Target: prescribing audit and antibiotic stewardship in the "
            "affected facilities."
        ),
    },
    {
        "id": "healthcare_origin",
        "label": "Healthcare-associated origin",
        "column": AMRIsolateRecord.infection_origin,
        "match": "hospital",
        "kind": "string",
        "note": (
            "Healthcare origin raises the probability of a resistant "
            "healthcare-associated strain. Target: infection prevention "
            "and control, hand hygiene, device care."
        ),
    },
    {
        "id": "icu_ward",
        "label": "ICU or high-dependency ward",
        "column": AMRIsolateRecord.ward_type,
        "match": "ICU",
        "kind": "string",
        "note": (
            "ICU exposure is associated with multidrug-resistant organisms. "
            "Target: ICU antimicrobial stewardship, cohorting, and "
            "environmental cleaning."
        ),
    },
    {
        "id": "animal_context",
        "label": "Animal production context",
        "column": AMRIsolateRecord.animal_species,
        "match": "notnull",
        "kind": "string",
        "note": (
            "Antimicrobial use in production is a recognised driver of "
            "resistance. Target: veterinary prescribing oversight and "
            "withdrawal-period compliance."
        ),
    },
    {
        "id": "community_origin",
        "label": "Community-acquired origin",
        "column": AMRIsolateRecord.infection_origin,
        "match": "community",
        "kind": "string",
        "note": (
            "Community origin. Resistance less likely from healthcare "
            "exposure, but local epidemiology still applies. Target: "
            "community education and over-the-counter dispensing control."
        ),
    },
]


def _empty_response(scope: dict) -> dict[str, Any]:
    return {
        "scope": scope,
        "total_isolates": 0,
        "mdr_count": 0,
        "mdr_rate": 0.0,
        "drivers": [],
        "no_data": True,
        "caveat": (
            "Driver attribution shows correlation, not causation. "
            "Associations are computed against recorded fields; missing "
            "fields reduce coverage."
        ),
    }


def _build_base_query(
    db: Session,
    *,
    county: str | None,
    pathogen_code: str | None,
    since: datetime,
):
    q = db.query(AMRIsolateRecord).filter(
        AMRIsolateRecord.created_at >= since,
    )
    if county:
        q = q.filter(func.lower(func.trim(AMRIsolateRecord.county)) == county.strip().lower())
    if pathogen_code:
        q = q.filter(func.lower(func.trim(AMRIsolateRecord.pathogen_code)) == pathogen_code.strip().lower())
    return q


def compute_drivers(
    db: Session,
    *,
    county: str | None = None,
    pathogen_code: str | None = None,
    window_days: int | None = None,
) -> dict[str, Any]:
    if window_days is None:
        window_days = int(config_service.get_config(db, "driver_lookback_days", 365))

    since = datetime.now(UTC) - timedelta(days=int(window_days))
    base = _build_base_query(
        db,
        county=county,
        pathogen_code=pathogen_code,
        since=since,
    )

    total = base.count()
    mdr_total = base.filter(AMRIsolateRecord.mdr_flag.is_(True)).count()

    scope = {
        "county": county,
        "pathogen_code": pathogen_code,
        "window_days": int(window_days),
    }

    if total == 0:
        return _empty_response(scope)

    drivers_out: list[dict[str, Any]] = []

    for spec in DRIVERS:
        col = spec["column"]

        kind = spec.get("kind", "string")
        if kind == "bool":
            filter_expr = col.is_(True)
        elif spec["match"] == "notnull":
            filter_expr = col.isnot(None) & (col != "")
        else:
            filter_expr = func.lower(func.trim(col)) == str(spec["match"]).lower()

        with_driver = base.filter(filter_expr).count()
        if with_driver == 0:
            drivers_out.append(
                {
                    "id": spec["id"],
                    "label": spec["label"],
                    "isolates_with_driver": 0,
                    "isolates_with_driver_pct": 0.0,
                    "mdr_count_with_driver": 0,
                    "mdr_rate_with_driver": 0.0,
                    "mdr_rate_confidence_low": 0.0,
                    "mdr_rate_confidence_high": 0.0,
                    "confidence": "low",
                    "attributable_note": spec["note"],
                    "not_recorded": True,
                }
            )
            continue

        mdr_with = base.filter(filter_expr).filter(AMRIsolateRecord.mdr_flag.is_(True)).count()

        mdr_without = mdr_total - mdr_with
        isolates_without = total - with_driver

        rate_with = round((mdr_with / with_driver) * 100, 1)
        rate_without = round((mdr_without / isolates_without) * 100, 1) if isolates_without else 0.0

        ci_low, ci_high = _wilson_interval(mdr_with, with_driver)
        confidence = _confidence_label(with_driver, ci_low, ci_high)

        drivers_out.append(
            {
                "id": spec["id"],
                "label": spec["label"],
                "isolates_with_driver": int(with_driver),
                "isolates_with_driver_pct": round((with_driver / total) * 100, 1),
                "mdr_count_with_driver": int(mdr_with),
                "mdr_rate_with_driver": rate_with,
                "mdr_rate_without_driver": rate_without,
                "mdr_rate_delta": round(rate_with - rate_without, 1),
                "mdr_rate_confidence_low": ci_low,
                "mdr_rate_confidence_high": ci_high,
                "confidence": confidence,
                "attributable_note": spec["note"],
                "not_recorded": False,
            }
        )

    # Rank by absolute delta (strongest signal first)
    drivers_out.sort(key=lambda d: -abs(d.get("mdr_rate_delta", 0.0)))

    return {
        "scope": scope,
        "total_isolates": int(total),
        "mdr_count": int(mdr_total),
        "mdr_rate": round((mdr_total / total) * 100, 1) if total else 0.0,
        "drivers": drivers_out,
        "no_data": False,
        "caveat": (
            "Driver attribution shows correlation, not causation. "
            "Confidence is computed with the Wilson score interval on the "
            "subset with the driver recorded. Subsets under 30 isolates are "
            "labelled low confidence."
        ),
    }


def list_available_scopes(db: Session) -> dict[str, list[dict[str, Any]]]:
    counties = (
        db.query(
            AMRIsolateRecord.county,
            func.count(AMRIsolateRecord.record_id).label("n"),
        )
        .filter(AMRIsolateRecord.county.isnot(None))
        .group_by(AMRIsolateRecord.county)
        .all()
    )
    pathogens = (
        db.query(
            AMRIsolateRecord.pathogen_code,
            func.count(AMRIsolateRecord.record_id).label("n"),
        )
        .filter(AMRIsolateRecord.pathogen_code.isnot(None))
        .group_by(AMRIsolateRecord.pathogen_code)
        .all()
    )
    return {
        "counties": [
            {"value": c[0], "count": int(c[1])} for c in sorted(counties, key=lambda x: -x[1]) if c[0]
        ],
        "pathogens": [
            {"value": p[0], "count": int(p[1])} for p in sorted(pathogens, key=lambda x: -x[1]) if p[0]
        ][:50],
    }
