"""Clinical guidance based on observed resistance data.

This endpoint does NOT use the ML model. It reads directly from the
isolate records and reports the observed resistance rate per antibiotic
class for the selected pathogen (and county, if given).

The result is evidence, not prediction. It answers the question
"what does our own data show" rather than "what does a model guess".

AWaRe categories are from the WHO 2023 Access/Watch/Reserve
classification. Used to prioritise Access drugs when resistance rates
are comparable.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from src.api.deps import get_db
from src.api.schemas import GuidanceRequest
from src.db.models import AMRIsolateRecord

guidance_router = APIRouter()


# WHO AWaRe 2023 classification. Map lowercased drug name -> category.
# Drugs not in this map are labelled "Unclassified".
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

_DATA_WINDOW_DAYS = 180
_SMALL_SAMPLE_THRESHOLD = 10


def _aware_for(agent: str) -> str:
    return _AWARE_BY_DRUG.get((agent or "").lower().strip(), "Unclassified")


def _rank_by_resistance(rows: list[dict]) -> list[dict]:
    """Sort ascending by resistance rate. Ties broken by:
    1) higher sample count (more evidence wins)
    2) Access > Watch > Reserve (WHO preference)
    """
    _pref = {"Access": 0, "Watch": 1, "Reserve": 2, "Unclassified": 3}
    return sorted(
        rows,
        key=lambda r: (
            r["resistance_rate"],
            -r["samples"],
            _pref.get(r["who_category"], 4),
        ),
    )


@guidance_router.post(
    "/recommend",
    status_code=status.HTTP_200_OK,
    response_model=dict[str, Any],
)
async def get_clinical_guidance_recommendation(
    payload: GuidanceRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return observed resistance per antibiotic for a pathogen."""
    if not payload.pathogen_code or not payload.pathogen_code.strip():
        raise HTTPException(status_code=400, detail="pathogen_code is required")

    pathogen = payload.pathogen_code.lower().strip()
    since = datetime.now(UTC) - timedelta(days=_DATA_WINDOW_DAYS)

    try:
        # Case-insensitive match because DB stores mixed-case pathogen codes
        pathogen_lower = func.lower(AMRIsolateRecord.pathogen_code)

        scope_samples = (
            db.query(AMRIsolateRecord)
            .filter(
                pathogen_lower == pathogen,
                AMRIsolateRecord.created_at >= since,
                AMRIsolateRecord.sir_result.isnot(None),
            )
            .filter(AMRIsolateRecord.county == payload.county if payload.county else True)
            .count()
        )

        q = db.query(
            AMRIsolateRecord.antibiotic_class.label("agent"),
            func.count(AMRIsolateRecord.record_id).label("total"),
            func.sum(
                case(
                    (func.lower(AMRIsolateRecord.sir_result) == "r", 1),
                    else_=0,
                )
            ).label("resistant"),
        ).filter(
            pathogen_lower == pathogen,
            AMRIsolateRecord.created_at >= since,
            AMRIsolateRecord.sir_result.isnot(None),
            AMRIsolateRecord.antibiotic_class.isnot(None),
        )
        if payload.county:
            q = q.filter(AMRIsolateRecord.county == payload.county)
        rows = q.group_by(AMRIsolateRecord.antibiotic_class).all()

        ranked: list[dict] = []
        for r in rows:
            if not r.agent:
                continue
            total = int(r.total or 0)
            res = int(r.resistant or 0)
            if total == 0:
                continue
            rate = round((res / total) * 100, 1)
            ranked.append(
                {
                    "antibiotic_agent": r.agent,
                    "samples": total,
                    "resistant": res,
                    "resistance_rate": rate,
                    "susceptible_rate": round(100 - rate, 1),
                    "who_category": _aware_for(r.agent),
                    "small_sample": total < _SMALL_SAMPLE_THRESHOLD,
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Observed resistance lookup failed: {e}",
        ) from e

    if not ranked:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No observed resistance data for {payload.pathogen_code} "
                f"in the last {_DATA_WINDOW_DAYS} days" + (f" in {payload.county}" if payload.county else "")
            ),
        )

    ranked = _rank_by_resistance(ranked)
    top = ranked[0]

    return {
        "pathogen_code": payload.pathogen_code,
        "requested_resistance_pattern": payload.resistance_pattern,
        "data_window_days": _DATA_WINDOW_DAYS,
        "scope": {
            "county": payload.county or None,
            "samples": scope_samples,
        },
        "primary_recommendation": top["antibiotic_agent"],
        "ranked_treatment_alternatives": ranked,
        "clinical_annotation_note": (
            "Observed resistance rates from isolate records. Not a "
            "prediction: this is what the platform's own data shows for "
            f"the last {_DATA_WINDOW_DAYS} days."
        ),
        "evidence_note": (
            "Ranking prefers lower resistance, then higher sample count, "
            "then Access drugs over Watch over Reserve, per WHO AWaRe 2023."
        ),
        "user_role_context": payload.user_role,
        "regional_demographic_context": payload.county if payload.county else "National Registry baseline",
    }
