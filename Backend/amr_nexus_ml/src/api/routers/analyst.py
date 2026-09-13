from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
import sqlalchemy as sa
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from src.api.deps import get_db, get_current_user
from src.db.models import User, AMRIsolateRecord, SavedAnalysis
from src.utils.logger import logger

router = APIRouter()


class AskRequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = None


class FileRequest(BaseModel):
    title: str
    answer: str
    question: Optional[str] = None
    context_type: Optional[str] = None
    context_data: Optional[Dict[str, Any]] = None
    tags: Optional[str] = None


# ---------- Medical data helpers ----------

def _load_db_snapshot(db: Session, days: int = 90) -> Dict[str, Any]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    since_date = since.date()

    total = db.query(func.count(AMRIsolateRecord.record_id)).scalar() or 0
    recent = db.query(func.count(AMRIsolateRecord.record_id)).filter(
        AMRIsolateRecord.sample_collection_date >= since_date
    ).scalar() or 0

    mdr_total = db.query(func.count(AMRIsolateRecord.record_id)).filter(
        AMRIsolateRecord.mdr_flag == True
    ).scalar() or 0

    recent_mdr = db.query(func.count(AMRIsolateRecord.record_id)).filter(
        AMRIsolateRecord.sample_collection_date >= since_date,
        AMRIsolateRecord.mdr_flag == True,
    ).scalar() or 0

    by_county = db.query(
        AMRIsolateRecord.county,
        func.count(AMRIsolateRecord.record_id),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
    ).filter(
        AMRIsolateRecord.county.isnot(None),
        AMRIsolateRecord.sample_collection_date >= since_date,
    ).group_by(AMRIsolateRecord.county).all()

    by_pathogen = db.query(
        AMRIsolateRecord.pathogen_code,
        func.count(AMRIsolateRecord.record_id),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
    ).filter(
        AMRIsolateRecord.pathogen_code.isnot(None),
        AMRIsolateRecord.sample_collection_date >= since_date,
    ).group_by(AMRIsolateRecord.pathogen_code).all()

    by_sector = db.query(
        AMRIsolateRecord.sector,
        func.count(AMRIsolateRecord.record_id),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
    ).filter(
        AMRIsolateRecord.sector.isnot(None),
        AMRIsolateRecord.sample_collection_date >= since_date,
    ).group_by(AMRIsolateRecord.sector).all()

    by_class = db.query(
        AMRIsolateRecord.antibiotic_class,
        func.count(AMRIsolateRecord.record_id),
        func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)),
    ).filter(
        AMRIsolateRecord.antibiotic_class.isnot(None),
        AMRIsolateRecord.sample_collection_date >= since_date,
    ).group_by(AMRIsolateRecord.antibiotic_class).all()

    anomalies = db.query(func.count(AMRIsolateRecord.record_id)).filter(
        AMRIsolateRecord.sample_collection_date >= since_date,
        AMRIsolateRecord.anomaly_flag == True,
    ).scalar() or 0

    def _rate(n, m):
        try:
            return round((m or 0) / n * 100, 1) if n else 0
        except Exception:
            return 0

    counties = sorted(
        [
            {"county": c, "samples": int(n), "mdr_rate": _rate(n, mdr)}
            for c, n, mdr in by_county
        ],
        key=lambda x: x["mdr_rate"],
        reverse=True,
    )
    pathogens = sorted(
        [
            {"pathogen": p, "samples": int(n), "mdr_rate": _rate(n, mdr)}
            for p, n, mdr in by_pathogen
        ],
        key=lambda x: x["samples"],
        reverse=True,
    )
    sectors = sorted(
        [
            {"sector": s, "samples": int(n), "mdr_rate": _rate(n, mdr)}
            for s, n, mdr in by_sector
        ],
        key=lambda x: x["mdr_rate"],
        reverse=True,
    )
    antibiotic_classes = sorted(
        [
            {"antibiotic_class": a, "samples": int(n), "mdr_rate": _rate(n, mdr)}
            for a, n, mdr in by_class
        ],
        key=lambda x: x["mdr_rate"],
        reverse=True,
    )

    return {
        "total_records": int(total),
        "recent_records": int(recent),
        "mdr_total": int(mdr_total),
        "recent_mdr": int(recent_mdr),
        "overall_mdr_rate": _rate(total, mdr_total),
        "recent_mdr_rate": _rate(recent, recent_mdr),
        "anomalies_recent": int(anomalies),
        "top_counties": counties[:10],
        "top_pathogens": pathogens[:10],
        "top_sectors": sectors[:5],
        "top_antibiotic_classes": antibiotic_classes[:8],
        "window_days": days,
    }


# ---------- Deterministic medical responder ----------

def _fmt_pct(v):
    try:
        return f"{float(v):.1f}%"
    except Exception:
        return "—"


def _fmt_int(v):
    try:
        return f"{int(v):,}"
    except Exception:
        return "—"


def _answer_from_data(question: str, snap: Dict[str, Any]) -> str:
    q = (question or "").lower().strip()

    if not q:
        return "Please ask a specific question about the data."

    window = snap.get("window_days", 90)
    recent = snap.get("recent_records", 0)
    rate = snap.get("recent_mdr_rate", 0)
    overall = snap.get("overall_mdr_rate", 0)
    anom = snap.get("anomalies_recent", 0)
    counties = snap.get("top_counties") or []
    pathogens = snap.get("top_pathogens") or []
    sectors = snap.get("top_sectors") or []
    classes = snap.get("top_antibiotic_classes") or []

    # WHY / CAUSE — drill into top contributors
    if any(k in q for k in ["why", "cause", "reason", "driver", "driving"]):
        parts = []
        if counties:
            top_c = counties[0]
            parts.append(
                f"The highest-burden county is {top_c['county']} with an MDR rate of "
                f"{_fmt_pct(top_c['mdr_rate'])} across {top_c['samples']} samples."
            )
        if pathogens:
            top_p = pathogens[0]
            parts.append(
                f"The most frequently reported pathogen is {top_p['pathogen']} "
                f"({top_p['samples']} isolates, {_fmt_pct(top_p['mdr_rate'])} MDR)."
            )
        if classes:
            top_a = classes[0]
            parts.append(
                f"The antibiotic class with the highest resistance is "
                f"{top_a['antibiotic_class']} at {_fmt_pct(top_a['mdr_rate'])}."
            )
        if sectors:
            top_s = sectors[0]
            parts.append(
                f"By sector, {top_s['sector']} shows the highest MDR rate at "
                f"{_fmt_pct(top_s['mdr_rate'])}."
            )
        if anom:
            parts.append(
                f"{_fmt_int(anom)} anomalous isolates were flagged in the last {window} days, "
                f"indicating unusual patterns that warrant investigation."
            )
        parts.append(
            "Recommendation: review antimicrobial stewardship and infection control "
            "in the highest-burden counties, and confirm the pattern with culture and "
            "susceptibility data before adjusting empiric therapy."
        )
        return " ".join(parts)

    # WHICH COUNTY / WHERE
    if any(k in q for k in ["county", "counties", "where", "location", "region"]):
        if not counties:
            return "No county-level data is available for the current window."
        parts = [f"The following counties show the highest MDR rates in the last {window} days:"]
        for c in counties[:5]:
            parts.append(
                f"{c['county']} — {_fmt_pct(c['mdr_rate'])} ({c['samples']} samples)."
            )
        return " ".join(parts)

    # WHICH PATHOGEN
    if any(k in q for k in ["pathogen", "organism", "bacteria", "species"]):
        if not pathogens:
            return "No pathogen data is available for the current window."
        parts = [f"Top pathogens by isolate count in the last {window} days:"]
        for p in pathogens[:5]:
            parts.append(
                f"{p['pathogen']} — {p['samples']} isolates, {_fmt_pct(p['mdr_rate'])} MDR."
            )
        return " ".join(parts)

    # SECTOR / ONE HEALTH
    if any(k in q for k in ["sector", "human", "animal", "poultry", "environment", "one health"]):
        if not sectors:
            return "No sector-level data is available for the current window."
        parts = ["Distribution by sector in the last {} days:".format(window)]
        for s in sectors:
            parts.append(
                f"{s['sector']} — {s['samples']} isolates, {_fmt_pct(s['mdr_rate'])} MDR."
            )
        parts.append(
            "The One Health approach requires attention to any sector with an MDR rate "
            "above 30%, as cross-sector transmission is a recognised risk."
        )
        return " ".join(parts)

    # ANTIBIOTIC / RESISTANCE
    if any(k in q for k in ["antibiotic", "drug", "resistance", "aware", "class"]):
        if not classes:
            return "No antibiotic-class data is available for the current window."
        parts = [f"Antibiotic classes by MDR rate in the last {window} days:"]
        for a in classes[:6]:
            parts.append(
                f"{a['antibiotic_class']} — {_fmt_pct(a['mdr_rate'])} ({a['samples']} samples)."
            )
        parts.append(
            "Classes with resistance above 60% typically require Reserve agents for "
            "empiric therapy, and should be confirmed with culture."
        )
        return " ".join(parts)

    # TREND / IMPROVING / WORSENING
    if any(k in q for k in ["trend", "improving", "worsening", "rising", "falling", "change"]):
        return (
            f"Over the last {window} days, {_fmt_int(recent)} isolates were recorded, "
            f"with an MDR rate of {_fmt_pct(rate)}. The all-time rate is {_fmt_pct(overall)}. "
            f"{_fmt_int(anom)} anomalies were flagged. "
            "For detailed trend direction, open the Compare page and set two adjacent periods."
        )

    # ANOMALIES / ALERTS
    if any(k in q for k in ["anomaly", "anomalies", "alert", "outbreak", "signal"]):
        if anom == 0:
            return f"No anomalies were flagged in the last {window} days — the system is stable."
        parts = [
            f"{_fmt_int(anom)} anomalous isolates were flagged in the last {window} days."
        ]
        if counties:
            parts.append(
                f"They are concentrated in {counties[0]['county']} and "
                f"{counties[1]['county'] if len(counties) > 1 else 'other counties'}."
            )
        parts.append(
            "Recommendation: triage by severity, acknowledge alerts already under "
            "investigation, and escalate critical signals to the county health officer."
        )
        return " ".join(parts)

    # HOW MANY / COUNT
    if any(k in q for k in ["how many", "count", "total", "number"]):
        return (
            f"The system holds {_fmt_int(snap.get('total_records', 0))} isolates in total, "
            f"of which {_fmt_int(recent)} were recorded in the last {window} days. "
            f"The overall MDR rate is {_fmt_pct(overall)}, and "
            f"{_fmt_int(anom)} anomalies were flagged recently."
        )

    # DEFAULT — general summary
    return (
        f"In the last {window} days, {_fmt_int(recent)} isolates were recorded with an "
        f"overall MDR rate of {_fmt_pct(rate)}. "
        f"{_fmt_int(anom)} anomalies were flagged. "
        f"The highest-burden county is {counties[0]['county'] if counties else 'unavailable'}, "
        f"and the most frequently reported pathogen is "
        f"{pathogens[0]['pathogen'] if pathogens else 'unavailable'}. "
        "Ask a more specific question such as 'why is MDR high', 'which counties are worst', "
        "or 'which pathogens dominate' for a targeted analysis."
    )


@router.post("/ask")
async def ask(
    req: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    snap = _load_db_snapshot(db, days=90)
    if req.context:
        snap["client_context"] = req.context

    # Try real LLM first if available
    llm_answer = None
    try:
        from src.services.llm_service import generate_comparison_response
        medical_prompt = f"""You are a senior clinical epidemiologist at the Ministry of Health, Kenya,
reviewing antimicrobial resistance surveillance data. Answer the following
question clearly and factually, in plain English (3-6 sentences). Do not
provide drug dosages. Always note that findings must be confirmed with laboratory
testing. Ground your answer only in the data below.

Question: {req.question}

Data snapshot (last 90 days):
{snap}

Write a flowing narrative, no bullet points, no markdown."""
        result = generate_comparison_response(medical_prompt)
        if result and isinstance(result, str) and len(result.strip()) > 20:
            llm_answer = result.strip()
    except Exception as e:
        logger.info(f"LLM unavailable, using deterministic responder: {e}")

    answer = llm_answer or _answer_from_data(req.question, snap)
    source = "llm" if llm_answer else "deterministic"

    return {
        "question": req.question,
        "answer": answer,
        "source": source,
        "snapshot_used": {
            "window_days": snap.get("window_days"),
            "recent_records": snap.get("recent_records"),
            "recent_mdr_rate": snap.get("recent_mdr_rate"),
        },
    }


@router.post("/file")
async def file_analysis(
    req: FileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = SavedAnalysis(
        created_by=current_user.id,
        created_by_email=current_user.email,
        title=req.title[:200],
        question=req.question,
        answer=req.answer,
        context_type=req.context_type,
        context_data=req.context_data,
        tags=req.tags,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return {
        "id": analysis.id,
        "title": analysis.title,
        "created_at": analysis.created_at.isoformat(),
    }


@router.get("/filed")
async def list_filed(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(SavedAnalysis)
    # Admin sees all, others see only their own
    if current_user.role != "admin":
        q = q.filter(SavedAnalysis.created_by == current_user.id)
    if search:
        like = f"%{search.lower()}%"
        q = q.filter(or_(
            func.lower(SavedAnalysis.title).like(like),
            func.lower(SavedAnalysis.answer).like(like),
        ))
    rows = q.order_by(desc(SavedAnalysis.created_at)).limit(limit).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "question": a.question,
            "answer": a.answer,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "created_by_email": a.created_by_email,
            "context_type": a.context_type,
            "tags": a.tags,
        }
        for a in rows
    ]


@router.delete("/filed/{analysis_id}", status_code=204)
async def delete_filed(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.query(SavedAnalysis).filter(SavedAnalysis.id == analysis_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    if current_user.role != "admin" and a.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    db.delete(a)
    db.commit()
    return None
