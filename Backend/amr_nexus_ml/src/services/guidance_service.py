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


def _confidence_band(samples: int, rate: float) -> dict:
    if samples <= 0:
        return {
            "lower": 0.0,
            "upper": 0.0,
            "width": 0.0,
            "low_confidence": True,
        }
    p = rate / 100.0
    se = (p * (1 - p) / samples) ** 0.5 * 100.0
    z = 1.96
    lower = max(0.0, rate - z * se)
    upper = min(100.0, rate + z * se)
    if samples < 30 and upper - lower < 5.0:
        lower = max(0.0, rate - 10.0)
        upper = min(100.0, rate + 10.0)
    return {
        "lower": round(lower, 1),
        "upper": round(upper, 1),
        "width": round(upper - lower, 1),
        "low_confidence": samples < 30,
    }


def _attach_bands(ranked: list[dict]) -> list[dict]:
    out = []
    for r in ranked:
        band = _confidence_band(int(r["samples"]), float(r["resistance_rate"]))
        enriched = dict(r)
        enriched["confidence_band"] = band
        out.append(enriched)
    return out


def _aware_disclaimer(ranked: list[dict]) -> str | None:
    reserve = [r for r in ranked if r.get("who_category") == "Reserve"]
    watch = [r for r in ranked if r.get("who_category") == "Watch"]
    if not reserve:
        return None
    if watch and any(r["resistance_rate"] < 30.0 for r in watch):
        return (
            "Reserve agents appear in this ranking. WHO AWaRe 2023 advises "
            "exhausting Access and Watch options before Reserve, unless the "
            "clinical situation requires last-line therapy."
        )
    return (
        "Reserve agents appear in this ranking. Confirm the clinical "
        "indication and consider infectious-diseases consultation."
    )


def _cross_resistance_warnings(ranked: list[dict]) -> list[dict]:
    warnings: list[dict] = []
    classes_seen: dict[str, dict] = {}
    for r in ranked:
        cls = r.get("who_category") or "Unclassified"
        if cls not in classes_seen:
            classes_seen[cls] = r

    high_res = [r for r in ranked if float(r["resistance_rate"]) >= 60.0]
    if len(high_res) >= 2:
        agents = ", ".join(r["antibiotic_agent"] for r in high_res[:3])
        warnings.append(
            {
                "type": "multi_resistance",
                "severity": "high",
                "message": (
                    f"High resistance across multiple agents: {agents}. "
                    "Consider combination therapy or Reserve agents on "
                    "specialist advice."
                ),
            }
        )

    carbapenem = next(
        (r for r in ranked if "carbapenem" in r["antibiotic_agent"].lower()),
        None,
    )
    if carbapenem and float(carbapenem["resistance_rate"]) >= 50.0:
        warnings.append(
            {
                "type": "carbapenem_resistance",
                "severity": "high",
                "message": (
                    "Carbapenem resistance is elevated. Beta-lactam "
                    "cross-resistance is likely. Confirm with susceptibility "
                    "testing before using any beta-lactam agent."
                ),
            }
        )

    fluoroq = next(
        (r for r in ranked if "fluoroquinolone" in r["antibiotic_agent"].lower()),
        None,
    )
    if fluoroq and float(fluoroq["resistance_rate"]) >= 50.0:
        warnings.append(
            {
                "type": "fluoroquinolone_resistance",
                "severity": "medium",
                "message": (
                    "Fluoroquinolone resistance is elevated. Other "
                    "fluoroquinolones are likely to show reduced efficacy."
                ),
            }
        )

    return warnings


def _subgroup_breakdown(
    db: Session,
    *,
    pathogen_code: str,
    county: str | None,
    window_days: int = DATA_WINDOW_DAYS,
) -> dict[str, list[dict]]:
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import case, func

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

    def _bucket(bucket_expr, label_col):
        q = (
            db.query(
                bucket_expr.label("bucket"),
                func.sum(resistant_expr).label("res"),
                func.sum(classified_expr).label("tot"),
            )
            .filter(
                pathogen_lower == pathogen,
                AMRIsolateRecord.created_at >= since,
            )
            .group_by(bucket_expr)
        )
        if county:
            q = q.filter(AMRIsolateRecord.county == county)
        rows = q.all()
        out = []
        for r in rows:
            tot = int(r.tot or 0)
            res = int(r.res or 0)
            if tot == 0:
                continue
            out.append(
                {
                    "bucket": r.bucket if r.bucket is not None else "unknown",
                    "samples": tot,
                    "resistance_rate": round((res / tot) * 100, 1),
                }
            )
        out.sort(key=lambda x: x["bucket"] if x["bucket"] != "unknown" else "zzz")
        return out

    age_bucket = case(
        (AMRIsolateRecord.patient_age_years < 5, "0-4"),
        (AMRIsolateRecord.patient_age_years < 15, "5-14"),
        (AMRIsolateRecord.patient_age_years < 65, "15-64"),
        (AMRIsolateRecord.patient_age_years >= 65, "65+"),
        else_=None,
    )
    sex_bucket = case(
        (AMRIsolateRecord.patient_sex == "M", "Male"),
        (AMRIsolateRecord.patient_sex == "F", "Female"),
        else_=None,
    )
    origin_bucket = case(
        (AMRIsolateRecord.infection_origin == "hospital", "Healthcare"),
        (AMRIsolateRecord.infection_origin == "community", "Community"),
        else_=None,
    )
    ward_bucket = case(
        (AMRIsolateRecord.ward_type == "ICU", "ICU"),
        (AMRIsolateRecord.ward_type == "OPD", "OPD"),
        (AMRIsolateRecord.ward_type.isnot(None), AMRIsolateRecord.ward_type),
        else_=None,
    )

    return {
        "by_age": _bucket(age_bucket, "age"),
        "by_sex": _bucket(sex_bucket, "sex"),
        "by_origin": _bucket(origin_bucket, "origin"),
        "by_ward": _bucket(ward_bucket, "ward"),
    }


def _cross_sector(
    db: Session,
    *,
    pathogen_code: str,
    window_days: int = DATA_WINDOW_DAYS,
) -> list[dict]:
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import case, func

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

    rows = (
        db.query(
            AMRIsolateRecord.sector.label("sector"),
            func.sum(resistant_expr).label("res"),
            func.sum(classified_expr).label("tot"),
        )
        .filter(
            pathogen_lower == pathogen,
            AMRIsolateRecord.created_at >= since,
            AMRIsolateRecord.sector.isnot(None),
        )
        .group_by(AMRIsolateRecord.sector)
        .all()
    )

    out = []
    for r in rows:
        tot = int(r.tot or 0)
        res = int(r.res or 0)
        if tot == 0:
            continue
        out.append(
            {
                "sector": r.sector,
                "samples": tot,
                "resistance_rate": round((res / tot) * 100, 1),
            }
        )
    out.sort(key=lambda x: -x["samples"])
    return out


def _outbreak_context_short(
    db: Session,
    *,
    pathogen_code: str,
    county: str | None,
) -> dict | None:
    from sqlalchemy import func

    if not pathogen_code:
        return None
    pathogen_norm = pathogen_code.lower().strip()

    national = (
        db.query(func.count(AMRIsolateRecord.record_id))
        .filter(func.lower(AMRIsolateRecord.pathogen_code) == pathogen_norm)
        .scalar()
        or 0
    )
    if county:
        local = (
            db.query(func.count(AMRIsolateRecord.record_id))
            .filter(
                func.lower(AMRIsolateRecord.pathogen_code) == pathogen_norm,
                AMRIsolateRecord.county == county,
            )
            .scalar()
            or 0
        )
    else:
        local = national

    share = round((local / national) * 100, 1) if national else 0.0

    from src.services import config_service

    threshold = float(config_service.get_config(db, "outbreak_local_share_pct", 20.0))

    return {
        "national_isolates": national,
        "local_isolates": local,
        "local_share_pct": share,
        "elevated": share >= threshold,
    }


def _apply_allergy_filter(
    ranked: list[dict], allergy_classes: list[str] | None
) -> tuple[list[dict], list[dict]]:
    if not allergy_classes:
        return ranked, []
    blocked = []
    allowed = []
    allergy_set = {a.lower().strip() for a in allergy_classes if a}
    for r in ranked:
        agent = r["antibiotic_agent"].lower()
        who = (r.get("who_category") or "").lower()
        is_blocked = any(a in agent or a == who for a in allergy_set)
        if is_blocked:
            blocked.append(r)
        else:
            allowed.append(r)
    return allowed, blocked


def build_patient_filtered(
    db: Session,
    *,
    pathogen_code: str,
    county: str | None = None,
    allergy_classes: list[str] | None = None,
    include_subgroups: bool = True,
    include_cross_sector: bool = True,
    include_outbreak: bool = True,
) -> dict | None:
    base = observed_resistance_for_pathogen(
        db,
        pathogen_code=pathogen_code,
        county=county,
    )
    if base is None:
        return None

    ranked = base["ranked_treatment_alternatives"]
    ranked = _attach_bands(ranked)
    ranked = _rank_by_resistance(ranked)

    allowed, blocked = _apply_allergy_filter(ranked, allergy_classes)

    result = dict(base)
    result["ranked_treatment_alternatives"] = allowed
    result["blocked_by_allergy"] = blocked
    result["primary_recommendation"] = allowed[0]["antibiotic_agent"] if allowed else None
    result["aware_disclaimer"] = _aware_disclaimer(allowed)
    result["cross_resistance_warnings"] = _cross_resistance_warnings(allowed)

    if include_subgroups:
        result["subgroups"] = _subgroup_breakdown(db, pathogen_code=pathogen_code, county=county)

    if include_cross_sector:
        result["cross_sector"] = _cross_sector(db, pathogen_code=pathogen_code)

    if include_outbreak:
        result["outbreak_context"] = _outbreak_context_short(db, pathogen_code=pathogen_code, county=county)

    result["counterfactual_note"] = (
        "If susceptibility were confirmed for the excluded agents, they would "
        "rank by the same rule (lower resistance, higher sample count, "
        "Access > Watch > Reserve)."
    )

    return result
