from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from src.db.models import AMRIsolateRecord

_AWARE_BY_DRUG = {
    "amoxicillin": "Access",
    "amoxicillin-clavulanate": "Access",
    "ampicillin": "Access",
    "gentamicin": "Access",
    "cefoxitin": "Access",
    "cefazolin": "Access",
    "nitrofurantoin": "Access",
    "trimethoprim-sulfamethoxazole": "Access",
    "ceftriaxone": "Watch",
    "cefotaxime": "Watch",
    "ceftazidime": "Watch",
    "ciprofloxacin": "Watch",
    "levofloxacin": "Watch",
    "azithromycin": "Watch",
    "erythromycin": "Watch",
    "meropenem": "Watch",
    "imipenem": "Watch",
    "piperacillin-tazobactam": "Watch",
    "vancomycin": "Watch",
    "colistin": "Reserve",
    "polymyxin b": "Reserve",
    "ceftazidime-avibactam": "Reserve",
    "meropenem-vaborbactam": "Reserve",
    "linezolid": "Reserve",
    "tigecycline": "Reserve",
    "daptomycin": "Reserve",
}

DATA_WINDOW_DAYS = 180
SMALL_SAMPLE_THRESHOLD = 10


def aware_for(agent: str) -> str:
    return _AWARE_BY_DRUG.get((agent or "").lower().strip(), "Unclassified")


def _rank_by_resistance(rows: list[dict]) -> list[dict]:
    _pref = {"Access": 0, "Watch": 1, "Reserve": 2, "Unclassified": 3}
    return sorted(
        rows,
        key=lambda r: (
            r["resistance_rate"],
            -r["samples"],
            _pref.get(r["who_category"], 4),
        ),
    )


def observed_resistance_for_pathogen(
    db: Session,
    *,
    pathogen_code: str,
    county: str | None = None,
    window_days: int = DATA_WINDOW_DAYS,
) -> dict[str, Any] | None:
    if not pathogen_code or not pathogen_code.strip():
        return None

    pathogen = pathogen_code.lower().strip()
    since = datetime.now(UTC) - timedelta(days=window_days)
    pathogen_lower = func.lower(AMRIsolateRecord.pathogen_code)

    sir_lower = func.lower(AMRIsolateRecord.sir_result)
    resistant_expr = case(
        (sir_lower == "r", 1),
        (
            (AMRIsolateRecord.sir_result.is_(None)) & (AMRIsolateRecord.mdr_flag.is_(True)),
            1,
        ),
        else_=0,
    )
    classified_expr = case(
        (sir_lower.in_(["r", "s", "i"]), 1),
        (
            (AMRIsolateRecord.sir_result.is_(None)) & (AMRIsolateRecord.mdr_flag.isnot(None)),
            1,
        ),
        else_=0,
    )

    q = db.query(
        AMRIsolateRecord.antibiotic_class.label("agent"),
        func.count(AMRIsolateRecord.record_id).label("total"),
        func.sum(resistant_expr).label("resistant"),
        func.sum(classified_expr).label("classified"),
    ).filter(
        pathogen_lower == pathogen,
        AMRIsolateRecord.created_at >= since,
        AMRIsolateRecord.antibiotic_class.isnot(None),
    )
    if county:
        q = q.filter(AMRIsolateRecord.county == county)
    rows = q.group_by(AMRIsolateRecord.antibiotic_class).all()

    ranked: list[dict] = []
    for r in rows:
        if not r.agent:
            continue
        classified = int(r.classified or 0)
        res = int(r.resistant or 0)
        if classified == 0:
            continue
        rate = round((res / classified) * 100, 1)
        ranked.append(
            {
                "antibiotic_agent": r.agent,
                "samples": classified,
                "resistant": res,
                "resistance_rate": rate,
                "susceptible_rate": round(100 - rate, 1),
                "who_category": aware_for(r.agent),
                "small_sample": classified < SMALL_SAMPLE_THRESHOLD,
            }
        )

    if not ranked:
        return None

    ranked = _rank_by_resistance(ranked)
    top = ranked[0]

    return {
        "pathogen_code": pathogen_code,
        "data_window_days": window_days,
        "scope": {"county": county or None, "samples": sum(r["samples"] for r in ranked)},
        "primary_recommendation": top["antibiotic_agent"],
        "ranked_treatment_alternatives": ranked,
        "clinical_annotation_note": (
            "Observed resistance rates from isolate records. Not a prediction: "
            f"this is what the platform's own data shows for the last {window_days} days."
        ),
        "evidence_note": (
            "Ranking prefers lower resistance, then higher sample count, then "
            "Access drugs over Watch over Reserve, per WHO AWaRe 2023."
        ),
    }
