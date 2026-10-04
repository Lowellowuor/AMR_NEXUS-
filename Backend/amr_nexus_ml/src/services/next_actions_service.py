from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.db.models import AMRIsolateRecord, Hotspot


def _mdr_action(mdr_flag: bool, prob: float) -> dict[str, Any]:
    if mdr_flag and prob >= 0.85:
        return {
            "id": "confirm_mdr",
            "priority": "critical",
            "title": "Confirm MDR with laboratory culture",
            "detail": (
                "High MDR probability. Do not escalate antimicrobial therapy "
                "on the model output alone - send the isolate for culture and "
                "susceptibility testing."
            ),
            "route": "lab",
            "suggested_lab_priority": "urgent",
        }
    if mdr_flag:
        return {
            "id": "confirm_mdr",
            "priority": "high",
            "title": "Confirm MDR with laboratory culture",
            "detail": (
                "Model predicts MDR. Confirm with culture before narrowing or "
                "broadening the treatment regimen."
            ),
            "route": "lab",
            "suggested_lab_priority": "routine",
        }
    return {
        "id": "access_agent",
        "priority": "routine",
        "title": "First-line therapy is reasonable while awaiting culture",
        "detail": (
            "Low MDR probability. WHO Access agents are appropriate first-line "
            "while awaiting confirmatory testing."
        ),
        "route": "clinical_guidance",
        "suggested_lab_priority": None,
    }


def _anomaly_action(anomaly_flag: bool, anomaly_score: float) -> dict[str, Any] | None:
    if not anomaly_flag:
        return None
    return {
        "id": "investigate_anomaly",
        "priority": "high",
        "title": "Investigate the anomaly signal",
        "detail": (
            f"Anomaly score {anomaly_score:.3f}. Unusual features for this "
            "context. Check sample handling, patient history, and local "
            "clustering before treating the prediction as reliable."
        ),
        "route": "investigation",
    }


def _hotspot_action(db: Session, county: str | None) -> dict[str, Any] | None:
    if not county:
        return None
    hotspots = (
        db.execute(select(Hotspot).where(Hotspot.county == county, Hotspot.is_active.is_(True)))
        .scalars()
        .all()
    )
    if not hotspots:
        return None
    h = hotspots[0]
    return {
        "id": "review_hotspot",
        "priority": "high",
        "title": f"Review active hotspot: {h.name}",
        "detail": (
            f"This isolate falls within {county}, which has "
            f"{len(hotspots)} active hotspot(s). Cross-check the case "
            "against the hotspot record and consider ring surveillance."
        ),
        "route": "hotspot",
        "hotspot_id": h.id,
    }


def _outbreak_action(db: Session, pathogen: str | None, county: str | None) -> dict[str, Any] | None:
    if not pathogen or not county:
        return None
    recent = (
        db.query(func.count(AMRIsolateRecord.record_id))
        .filter(
            func.lower(AMRIsolateRecord.pathogen_code) == pathogen.lower().strip(),
            AMRIsolateRecord.county == county,
        )
        .scalar()
        or 0
    )
    if recent < 20:
        return None
    return {
        "id": "notify_county",
        "priority": "high",
        "title": "Notify county surveillance team",
        "detail": (
            f"{recent} isolates of {pathogen} recorded in {county}. Consider "
            "escalating to the county AMR surveillance officer for review."
        ),
        "route": "alert",
    }


def build_next_actions(
    db: Session,
    *,
    mdr_flag: bool,
    mdr_probability: float,
    anomaly_flag: bool,
    anomaly_score: float,
    pathogen_code: str | None,
    county: str | None,
) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []
    actions.append(_mdr_action(mdr_flag, mdr_probability))

    anomaly = _anomaly_action(anomaly_flag, anomaly_score)
    if anomaly:
        actions.append(anomaly)

    hotspot = _hotspot_action(db, county)
    if hotspot:
        actions.append(hotspot)

    outbreak = _outbreak_action(db, pathogen_code, county)
    if outbreak:
        actions.append(outbreak)

    return actions


def build_outbreak_context(
    db: Session, *, pathogen_code: str | None, county: str | None
) -> dict[str, Any] | None:
    if not pathogen_code:
        return None
    pathogen_norm = pathogen_code.lower().strip()

    national_count = (
        db.query(func.count(AMRIsolateRecord.record_id))
        .filter(func.lower(AMRIsolateRecord.pathogen_code) == pathogen_norm)
        .scalar()
        or 0
    )
    if county:
        local_count = (
            db.query(func.count(AMRIsolateRecord.record_id))
            .filter(
                func.lower(AMRIsolateRecord.pathogen_code) == pathogen_norm,
                AMRIsolateRecord.county == county,
            )
            .scalar()
            or 0
        )
    else:
        local_count = national_count

    share = round((local_count / national_count) * 100, 1) if national_count else 0.0

    return {
        "pathogen": pathogen_code,
        "county": county,
        "national_isolates": national_count,
        "local_isolates": local_count,
        "local_share_pct": share,
        "elevated": share >= 20.0,
    }


def build_data_quality(
    *,
    specimen_type: str | None,
    antibiotic_class: str | None,
    test_method: str | None,
    site_id: int | None,
    sample_collection_date: str | None,
    latitude: float | None,
    longitude: float | None,
    patient_age_years: float | None,
    patient_sex: str | None,
) -> dict[str, Any]:
    checks = [
        ("Specimen type recorded", bool(specimen_type)),
        ("Antibiotic class recorded", bool(antibiotic_class)),
        ("Test method recorded", bool(test_method)),
        ("Site identified", site_id is not None),
        ("Collection date recorded", bool(sample_collection_date)),
        ("Coordinates captured", latitude is not None and longitude is not None),
        ("Patient age recorded", patient_age_years is not None),
        ("Patient sex recorded", bool(patient_sex)),
    ]
    passed = sum(1 for _, ok in checks if ok)
    total = len(checks)
    score = round((passed / total) * 100, 1)

    return {
        "score_pct": score,
        "checks_passed": passed,
        "checks_total": total,
        "missing": [label for label, ok in checks if not ok],
    }


def build_contributing_factors(
    *,
    prior_antibiotic_exposure: bool | None,
    infection_origin: str | None,
    ward_type: str | None,
    animal_species: str | None,
    production_system: str | None,
    suspected_driver: str | None,
    treatment_history: str | None,
) -> list[dict[str, Any]]:
    factors: list[dict[str, Any]] = []

    if prior_antibiotic_exposure:
        factors.append(
            {
                "factor": "Prior antibiotic exposure",
                "strength": "high",
                "note": (
                    "Documented prior exposure is a leading driver of "
                    "resistance. Review the antibiotic course and duration."
                ),
            }
        )

    if infection_origin in ("hospital", "healthcare"):
        factors.append(
            {
                "factor": "Healthcare-associated origin",
                "strength": "high",
                "note": (
                    "Healthcare origin raises the probability of a resistant "
                    "healthcare-associated strain. Review admission history."
                ),
            }
        )
    elif infection_origin == "community":
        factors.append(
            {
                "factor": "Community-acquired origin",
                "strength": "medium",
                "note": (
                    "Community origin. Resistance less likely from healthcare "
                    "exposure, but local epidemiology still applies."
                ),
            }
        )

    if ward_type in ("ICU", "critical", "high_dependency"):
        factors.append(
            {
                "factor": f"Ward type: {ward_type}",
                "strength": "high",
                "note": ("ICU / high-dependency exposure is associated with multidrug-resistant organisms."),
            }
        )

    if animal_species or production_system:
        parts = [p for p in (animal_species, production_system) if p]
        factors.append(
            {
                "factor": "Animal / production context",
                "strength": "medium",
                "note": (
                    f"Recorded context: {' - '.join(parts)}. Antimicrobial "
                    "use in production is a recognised driver of resistance."
                ),
            }
        )

    if suspected_driver:
        factors.append(
            {
                "factor": f"Reported driver: {suspected_driver}",
                "strength": "medium",
                "note": "Captured by the submitting user.",
            }
        )

    if treatment_history:
        factors.append(
            {
                "factor": "Treatment history",
                "strength": "medium",
                "note": treatment_history[:300],
            }
        )

    return factors
