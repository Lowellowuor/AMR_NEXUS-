"""Model health, calibration, and drift utilities."""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import sqlalchemy as sa

from src.db.models import PredictionLog, AMRIsolateRecord, DriftSnapshot


def confidence_tier(probability: Optional[float]) -> str:
    """Map a probability to a clinically meaningful confidence tier."""
    if probability is None:
        return "unknown"
    p = float(probability)
    distance = abs(p - 0.5)
    if distance >= 0.35:
        return "high"
    if distance >= 0.15:
        return "moderate"
    return "borderline"


def deterministic_fallback(features: Dict[str, Any]) -> Dict[str, Any]:
    """Rule-based risk score when the ML model is unavailable.

    Calibrated roughly from published East African AMR patterns.
    Not a replacement for the model — a graceful degradation.
    """
    score = 0.15

    pathogen = (features.get("pathogen_code") or "").upper()
    high_risk_pathogens = {"KPN", "KLEBSIELLA", "ACINETOBACTER", "ABAUMANNII", "PSEUDOMONAS", "PAE", "MRSA", "SAU"}
    if any(p in pathogen for p in high_risk_pathogens):
        score += 0.15

    if features.get("prior_antibiotic_exposure"):
        score += 0.15

    sector = (features.get("sector") or "").lower()
    if sector in ("human", "livestock"):
        score += 0.08

    ward = (features.get("ward_type") or "").lower()
    if ward in ("icu", "intensive care"):
        score += 0.12

    origin = (features.get("infection_origin") or "").lower()
    if origin == "hospital":
        score += 0.08

    antibiotic = (features.get("antibiotic_class") or "").lower()
    if any(a in antibiotic for a in ("carbapenem", "cephalosporin")):
        score += 0.05

    score = min(max(score, 0.05), 0.95)
    return {
        "mdr_probability": round(score, 4),
        "mdr_flag": score >= 0.5,
        "source": "fallback",
    }


def compute_calibration(db: Session, days: int = 90, buckets: int = 10) -> Dict[str, Any]:
    """Compare predicted probabilities to observed MDR outcomes."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.query(PredictionLog).filter(
        PredictionLog.created_at >= since,
        PredictionLog.mdr_probability.isnot(None),
    ).all()

    if not rows:
        return {"buckets": [], "sample_size": 0, "calibration_error": None}

    bins: List[Dict[str, Any]] = []
    for i in range(buckets):
        lo = i / buckets
        hi = (i + 1) / buckets
        in_bin = [r for r in rows if lo <= float(r.mdr_probability) < hi or (i == buckets - 1 and float(r.mdr_probability) == 1.0)]
        if not in_bin:
            continue
        avg_pred = sum(float(r.mdr_probability) for r in in_bin) / len(in_bin)
        observed = sum(1 for r in in_bin if r.mdr_flag) / len(in_bin)
        bins.append({
            "bucket": f"{int(lo*100)}-{int(hi*100)}%",
            "predicted": round(avg_pred * 100, 1),
            "observed": round(observed * 100, 1),
            "count": len(in_bin),
        })

    # Expected calibration error (weighted absolute difference)
    total = len(rows)
    ece = sum(abs(b["predicted"] - b["observed"]) * b["count"] / total for b in bins) if total else None

    return {
        "buckets": bins,
        "sample_size": total,
        "calibration_error": round(ece / 100, 4) if ece is not None else None,
    }


def compute_drift(db: Session, days: int = 30) -> Dict[str, Any]:
    """Compare current feature distributions to the full historical baseline."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    def distribution(field, cutoff=None):
        q = db.query(field, func.count(AMRIsolateRecord.record_id))
        if cutoff:
            q = q.filter(AMRIsolateRecord.created_at >= cutoff)
        q = q.filter(field.isnot(None)).group_by(field).all()
        total = sum(n for _, n in q) or 1
        return {str(k): round(n / total, 4) for k, n in q}

    def drift_for(field, name):
        historical = distribution(field)
        current = distribution(field, since)
        if not historical or not current:
            return {"feature": name, "drift": 0.0, "status": "insufficient_data"}

        # Symmetric total variation distance
        keys = set(historical) | set(current)
        tv = 0.5 * sum(abs(historical.get(k, 0) - current.get(k, 0)) for k in keys)

        status = "stable"
        if tv >= 0.30:
            status = "critical"
        elif tv >= 0.15:
            status = "warning"

        return {
            "feature": name,
            "drift": round(tv, 4),
            "status": status,
            "top_changes": sorted(
                [{"value": k, "historical_pct": round(historical.get(k, 0) * 100, 1), "current_pct": round(current.get(k, 0) * 100, 1)}
                 for k in keys],
                key=lambda x: abs(x["historical_pct"] - x["current_pct"]),
                reverse=True,
            )[:3],
        }

    features = [
        (AMRIsolateRecord.pathogen_code, "pathogen_code"),
        (AMRIsolateRecord.county, "county"),
        (AMRIsolateRecord.sector, "sector"),
        (AMRIsolateRecord.antibiotic_class, "antibiotic_class"),
        (AMRIsolateRecord.specimen_type, "specimen_type"),
    ]

    results = [drift_for(f, n) for f, n in features]
    overall = max((r["drift"] for r in results), default=0)

    return {
        "window_days": days,
        "overall_drift": round(overall, 4),
        "status": "critical" if overall >= 0.30 else "warning" if overall >= 0.15 else "stable",
        "features": results,
    }


def compute_performance(db: Session, days: int = 90) -> Dict[str, Any]:
    """Live performance metrics from the prediction log."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    logs = db.query(PredictionLog).filter(PredictionLog.created_at >= since).all()
    if not logs:
        return {
            "total_predictions": 0,
            "avg_latency_ms": None,
            "fallback_rate": 0,
            "confidence_distribution": {},
            "window_days": days,
        }

    total = len(logs)
    latencies = [float(l.latency_ms) for l in logs if l.latency_ms is not None]
    fallback = sum(1 for l in logs if l.fallback_used)

    conf = {"high": 0, "moderate": 0, "borderline": 0, "unknown": 0}
    for l in logs:
        tier = l.confidence_tier or "unknown"
        conf[tier] = conf.get(tier, 0) + 1

    return {
        "total_predictions": total,
        "avg_latency_ms": round(sum(latencies) / len(latencies), 1) if latencies else None,
        "p95_latency_ms": round(sorted(latencies)[int(len(latencies) * 0.95)], 1) if len(latencies) >= 20 else None,
        "fallback_rate": round(fallback / total * 100, 2),
        "fallback_count": fallback,
        "confidence_distribution": conf,
        "window_days": days,
    }
