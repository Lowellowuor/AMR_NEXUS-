from datetime import datetime
import sys
import json
import uuid
from contextlib import asynccontextmanager
from typing import Dict, Any, Generator, List, Optional

import socketio
import uvicorn
from fastapi import FastAPI, Depends, Query, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from src.core.security import decode_token
from src.core.audit_middleware import AuditMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import sqlalchemy as sa
from pydantic import BaseModel

from src.core.config import settings
from src.core.ml import load_models
from src.db.session import engine
from src.db.models import AMRIsolateRecord, Base, DashboardNotification, Hotspot, User, UserTemplate
from src.services.prediction_service import PredictionService
from src.services.shap_service import compute_shap_explanation, record_to_feature_dict
from src.services.llm_service import generate_llm_response, generate_comparison_response
from src.services.sms_service import send_sms
from src.database import SessionLocal
from src.utils.logger import logger
from src.api.deps import get_current_user, get_db, require_admin
from src.api.routers import (
    health_router,
    prediction_router,
    analytics_router,
    alerts_router,
    reports_router,
    comments_router,
    guidance_router,
    search_router,
    user_router,
    ews_router,
    hotspot_router,
)
from src.services.forecast_utils import generate_time_series_forecast
from src.api.routers import auth_router, audit_router, user_actions_router, analyst_router, model_health_router, admin_users_router, notifications_router


def get_cors_origins() -> List[str]:
    raw = settings.CORS_ORIGINS
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return [raw]
    return raw


CORS_ORIGINS = get_cors_origins()


PUBLIC_PATHS = {
    "/auth/login",
    "/api/v1/auth/login",
    "/auth/verify",
    "/api/v1/auth/verify",
    "/health",
    "/api/v1/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
}


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if request.method == "OPTIONS":
            return await call_next(request)
        if path in PUBLIC_PATHS or path.startswith("/docs") or path.startswith("/redoc") or path.startswith("/openapi"):
            return await call_next(request)
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return JSONResponse(
                {"detail": "Authentication required"},
                status_code=401,
            )
        try:
            decode_token(auth[7:])
        except Exception:
            return JSONResponse(
                {"detail": "Invalid or expired token"},
                status_code=401,
            )
        return await call_next(request)


sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=CORS_ORIGINS
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> Generator[None, None, None]:
    logger.info("Ensuring database tables exist...")
    Base.metadata.create_all(engine)
    logger.info("Database schema ready.")
    logger.info("Triggering background loading for binary ML model artifacts...")
    load_models()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(AuditMiddleware)

    app.add_middleware(AuthMiddleware)

    # Versioned routes
    app.include_router(health_router, prefix="/api/v1", tags=["health"])
    app.include_router(prediction_router, prefix="/api/v1", tags=["predictions"])
    app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["analytics"])
    app.include_router(alerts_router, prefix="/api/v1/alerts", tags=["alerts"])
    app.include_router(reports_router, prefix="/api/v1", tags=["reports"])
    app.include_router(comments_router, prefix="/api/v1", tags=["comments"])
    app.include_router(guidance_router, prefix="/api/v1", tags=["guidance"])
    app.include_router(search_router, prefix="/api/v1", tags=["search"])
    app.include_router(user_router, prefix="/api/v1", tags=["user"])
    app.include_router(ews_router, prefix="/api/v1/ews", tags=["ews"])
    app.include_router(hotspot_router, prefix="/api/v1", tags=["hotspots"])

    # Non-versioned routes (legacy / direct)
    app.include_router(health_router, tags=["health"])
    app.include_router(prediction_router, tags=["predictions"])
    app.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
    app.include_router(alerts_router, prefix="/alerts", tags=["alerts"])
    app.include_router(reports_router, tags=["reports"])
    app.include_router(comments_router, tags=["comments"])
    app.include_router(guidance_router, tags=["guidance"])
    app.include_router(search_router, tags=["search"])
    app.include_router(user_router, tags=["user"])
    app.include_router(ews_router, tags=["ews"])
    app.include_router(hotspot_router, tags=["hotspots"])

    @app.get("/ews/forecast")
    async def direct_ews_forecast(
        county: str = Query(None),
        db: Session = Depends(get_db)
    ):
        try:
            forecast = generate_time_series_forecast(db, county)
            return forecast
        except ValueError as e:
            logger.warning(f"Forecast not available: {e}")
            return []
        except Exception as e:
            logger.error(f"Forecast error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Internal server error")

    @app.get("/metadata/options")
    async def root_metadata_options(db: Session = Depends(get_db)) -> Dict[str, Any]:
        sectors = [s[0] for s in db.query(AMRIsolateRecord.sector).distinct().all() if s[0]]
        sub_sectors = [s[0] for s in db.query(AMRIsolateRecord.sub_sector).distinct().all() if s[0]]
        pathogens = [{"code": p[0], "name": p[0]} for p in db.query(AMRIsolateRecord.pathogen_code).distinct().all() if p[0]]
        specimen_types = [s[0] for s in db.query(AMRIsolateRecord.specimen_type).distinct().all() if s[0]]
        counties_raw = [c[0] for c in db.query(AMRIsolateRecord.county).distinct().all() if c[0]]
        antibiotic_classes = [a[0] for a in db.query(AMRIsolateRecord.antibiotic_class).distinct().all() if a[0]]
        test_methods = [t[0] for t in db.query(AMRIsolateRecord.test_method).distinct().all() if t[0]]

        counties = [{"code": c, "name": c} for c in counties_raw]

        return {
            "sectors": sectors,
            "sub_sectors": sub_sectors,
            "pathogens": pathogens,
            "specimen_types": specimen_types,
            "counties": counties,
            "antibiotic_classes": antibiotic_classes,
            "test_methods": test_methods,
        }

    @app.get("/templates")
    @app.get("/api/v1/templates")
    def get_templates_direct(db: Session = Depends(get_db)):
        templates = db.query(UserTemplate).all()
        return [
            {
                "id": t.id,
                "name": t.name,
                "form_data": t.form_data,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in templates
        ]

    @app.post("/templates")
    @app.post("/api/v1/templates")
    def save_template_direct(name: str, form_data: Dict[str, Any], db: Session = Depends(get_db), current_user=Depends(require_admin)):
        user = db.query(User).first()
        if not user:
            user = User(
                email="admin@amrnexus.com",
                name="Admin",
                hashed_password="dummy",
                role="admin",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        template = UserTemplate(
            user_id=user.id,
            name=name,
            form_data=form_data,
        )
        db.add(template)
        db.commit()
        db.refresh(template)
        return {
            "id": template.id,
            "name": template.name,
            "form_data": template.form_data,
            "created_at": template.created_at.isoformat() if template.created_at else None,
        }

    @app.get("/alerts/{alert_id}")
    async def get_alert_detail(alert_id: str, db: Session = Depends(get_db)):
        try:
            int_id = int(alert_id)
            notif = db.query(DashboardNotification).filter(DashboardNotification.id == int_id).first()
            if notif:
                return {
                    "id": notif.id,
                    "timestamp": notif.created_at.isoformat(),
                    "county": notif.county,
                    "message": notif.message,
                    "is_read": notif.is_read,
                    "record_id": notif.record_id,
                }
        except ValueError:
            pass

        try:
            clean_id = alert_id.replace("alert-", "")
            record_uuid = uuid.UUID(clean_id)
            record = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.record_id == record_uuid).first()
            if record:
                return {
                    "id": str(record.record_id),
                    "timestamp": record.created_at.isoformat(),
                    "county": record.county,
                    "message": f"Prediction record {clean_id}",
                    "record_id": str(record.record_id),
                }
        except ValueError:
            pass

        raise HTTPException(status_code=404, detail="Alert not found")

    @app.get("/predictions/{record_id}/explanation")
    async def prediction_explanation(record_id: str, db: Session = Depends(get_db)):
        try:
            record_uuid = uuid.UUID(record_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid record ID format")

        record = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.record_id == record_uuid).first()
        if not record:
            raise HTTPException(status_code=404, detail="Prediction record not found")

        explanation = compute_shap_explanation(record_to_feature_dict(record))
        return explanation

    @app.get("/alerts/{alert_id}/explanation")
    async def alert_explanation(alert_id: str, db: Session = Depends(get_db)):
        try:
            int_id = int(alert_id)
            notif = db.query(DashboardNotification).filter(DashboardNotification.id == int_id).first()
            if notif:
                raise HTTPException(status_code=404, detail="No linked prediction record for this alert")
        except ValueError:
            pass

        try:
            clean_id = alert_id.replace("alert-", "")
            record_uuid = uuid.UUID(clean_id)
            record = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.record_id == record_uuid).first()
            if record:
                return compute_shap_explanation(record_to_feature_dict(record))
        except ValueError:
            pass

        raise HTTPException(status_code=404, detail="Alert or prediction not found")

    class LLMRequest(BaseModel):
        alert_id: str

    @app.post("/llm/generate")
    async def generate_llm(req: LLMRequest, db: Session = Depends(get_db)):
        record = None

        try:
            int_id = int(req.alert_id)
            notif = db.query(DashboardNotification).filter(DashboardNotification.id == int_id).first()
            if notif:
                raise HTTPException(status_code=404, detail="No linked prediction record for this alert")
        except ValueError:
            pass

        try:
            clean_id = req.alert_id.replace("alert-", "")
            record_uuid = uuid.UUID(clean_id)
            record = db.query(AMRIsolateRecord).filter(AMRIsolateRecord.record_id == record_uuid).first()
        except ValueError:
            pass

        if not record:
            raise HTTPException(status_code=404, detail="Prediction record not found")

        explanation = compute_shap_explanation(record_to_feature_dict(record))
        text = generate_llm_response(record_to_feature_dict(record), explanation)
        return {"text": text}

    class InsightRequest(BaseModel):
        context: str
        data: Dict[str, Any]

    def _narrative(context: str, data: Dict[str, Any]) -> str:
        """Deterministic narrative generator. Produces factual prose from structured data."""
        ctx = (context or "").lower()

        def pct(v):
            try:
                return f"{float(v):.1f}%"
            except (TypeError, ValueError):
                return "—"

        def num(v):
            try:
                return f"{int(v):,}"
            except (TypeError, ValueError):
                return "—"

        def tone_for(rate):
            try:
                r = float(rate)
            except (TypeError, ValueError):
                return "within expected range"
            if r >= 60:
                return "critically high"
            if r >= 30:
                return "elevated"
            if r >= 15:
                return "moderate"
            return "low"

        parts = []

        # National / county summary
        if "summary" in ctx or "national" in ctx or "county" in ctx:
            cur = data.get("current") or data
            prev = data.get("previous")
            total = cur.get("total_records")
            rate = cur.get("mdr_rate")
            anom = cur.get("anomaly_count")
            counties = cur.get("active_counties")

            if total is not None:
                parts.append(
                    f"{num(total)} isolates were recorded during this period, "
                    f"with an overall MDR rate of {pct(rate)} — {tone_for(rate)} "
                    f"by current surveillance thresholds."
                )
            if anom is not None and anom > 0:
                parts.append(
                    f"{num(anom)} isolates were flagged as anomalous, "
                    f"indicating patterns that warrant epidemiological review."
                )
            if counties:
                parts.append(f"Data was reported from {num(counties)} {'county' if counties == 1 else 'counties'}.")

            if prev and prev.get("mdr_rate") is not None and rate is not None:
                delta = round(float(rate) - float(prev.get("mdr_rate")), 1)
                if delta > 2:
                    parts.append(
                        f"MDR rose {delta} percentage points compared to the previous period, "
                        f"which is a meaningful deterioration."
                    )
                elif delta < -2:
                    parts.append(
                        f"MDR fell {abs(delta)} percentage points compared to the previous period, "
                        f"indicating improvement."
                    )
                elif abs(delta) <= 2:
                    parts.append(
                        f"The rate is essentially unchanged from the previous period "
                        f"(difference of {abs(delta)} percentage points)."
                    )

            if rate is not None and float(rate) >= 30:
                parts.append(
                    "Recommended next step: review antimicrobial stewardship practices "
                    "in the highest-burden counties and verify that first-line agents "
                    "remain effective."
                )

        # Pathogen detail
        elif "pathogen" in ctx:
            code = data.get("code") or "This pathogen"
            s = data.get("summary") or {}
            samples = s.get("samples")
            rate = s.get("mdr_rate")
            by_class = data.get("by_class") or []

            parts.append(
                f"{code} accounted for {num(samples)} isolates with an MDR rate of {pct(rate)} "
                f"— {tone_for(rate)}."
            )
            if by_class:
                top = sorted(by_class, key=lambda x: x.get("resistance", 0), reverse=True)[:3]
                tops = ", ".join(
                    f"{t.get('antibiotic_class')} ({pct(t.get('resistance'))}, n={t.get('samples', 0)})"
                    for t in top
                )
                parts.append(f"Highest resistance was observed for {tops}.")
            by_sector = data.get("by_sector") or []
            if by_sector:
                top_sector = sorted(by_sector, key=lambda x: x.get("mdr_rate", 0), reverse=True)[0]
                parts.append(
                    f"The {top_sector.get('sector')} sector showed the highest MDR rate at "
                    f"{pct(top_sector.get('mdr_rate'))}."
                )
            if rate is not None and float(rate) >= 60:
                parts.append(
                    "Recommended next step: escalate to the county surveillance team and "
                    "consider empiric therapy adjustments pending culture confirmation."
                )
            elif rate is not None and float(rate) >= 30:
                parts.append(
                    "Recommended next step: review treatment protocols and reinforce "
                    "culture-directed prescribing."
                )

        # Period comparison
        elif "compare" in ctx:
            a = data.get("a", {}).get("summary", {})
            b = data.get("b", {}).get("summary", {})
            rate_a = a.get("mdr_rate")
            rate_b = b.get("mdr_rate")
            if rate_a is not None and rate_b is not None:
                delta = round(float(rate_b) - float(rate_a), 1)
                direction = "increase" if delta > 0 else "decrease" if delta < 0 else "no change"
                parts.append(
                    f"Period A recorded an MDR rate of {pct(rate_a)} and Period B recorded "
                    f"{pct(rate_b)}, representing a {direction} of {abs(delta)} percentage points."
                )
                if abs(delta) > 5:
                    parts.append(
                        "This magnitude of change is clinically meaningful and should be "
                        "investigated for underlying causes — policy changes, outbreak activity, "
                        "or shifts in reporting coverage."
                    )
            total_a = a.get("total_records")
            total_b = b.get("total_records")
            if total_a and total_b:
                parts.append(
                    f"Sample volume moved from {num(total_a)} in Period A to {num(total_b)} in Period B."
                )

        # Single prediction record
        elif "record" in ctx or "prediction" in ctx:
            pathogen = data.get("pathogen") or "The isolate"
            county = data.get("county") or "an unspecified county"
            mdr = data.get("mdr_flag")
            prob = data.get("mdr_probability")
            antibiotic = data.get("antibiotic_class")
            sector = data.get("sector")
            specimen = data.get("specimen")

            prob_pct = None
            try:
                prob_pct = float(prob) * 100 if prob is not None else None
            except (TypeError, ValueError):
                pass

            parts.append(
                f"{pathogen} isolated from {specimen or 'an unspecified specimen'} in "
                f"{county}, submitted by the {sector or 'unspecified'} sector."
            )
            if antibiotic:
                parts.append(f"Tested against {antibiotic}.")
            if mdr:
                if prob_pct is not None:
                    parts.append(
                        f"The isolate is classified as multidrug resistant with a "
                        f"model probability of {prob_pct:.1f}%."
                    )
                else:
                    parts.append("The isolate is classified as multidrug resistant.")
            else:
                if prob_pct is not None:
                    parts.append(
                        f"The isolate is classified as susceptible with an MDR "
                        f"probability of {prob_pct:.1f}%, "
                        f"{tone_for(prob_pct)}."
                    )
                else:
                    parts.append("The isolate is classified as susceptible.")

            if data.get("anomaly_flag"):
                score = data.get("anomaly_score")
                try:
                    score_str = f"{float(score):.3f}"
                except (TypeError, ValueError):
                    score_str = "unspecified"
                parts.append(
                    f"The record was flagged as anomalous (score {score_str}), "
                    f"indicating an unusual pattern worth review."
                )

            if mdr and prob_pct and prob_pct >= 80:
                parts.append(
                    "Recommended next step: confirm with culture and susceptibility, "
                    "review empiric therapy, and consider infection control measures."
                )
            elif mdr:
                parts.append(
                    "Recommended next step: verify with laboratory confirmation before "
                    "adjusting treatment."
                )

        # Anomalies
        elif "anomal" in ctx or "alert" in ctx:
            total = data.get("total") or len(data.get("items") or [])
            last24 = data.get("last24h")
            parts.append(f"{num(total)} anomalies are currently open in the system.")
            if last24:
                parts.append(f"{num(last24)} were detected in the last 24 hours, indicating active signal.")
            top = data.get("top_counties") or []
            if top:
                c, n = top[0]
                parts.append(f"The highest concentration is in {c} with {n} flagged isolates.")
            parts.append(
                "Recommended next step: triage by severity, acknowledge alerts already "
                "under investigation, and escalate critical signals to the county health officer."
            )

        # Fallback
        if not parts:
            parts.append(
                "Summary unavailable for this data shape. Provide a context string such as "
                "'national summary', 'pathogen detail', 'period compare', or 'alert summary'."
            )

        return " ".join(parts)

    @app.post("/llm/insight")
    async def llm_insight(req: InsightRequest):
        try:
            from src.services.llm_service import generate_insight_response
            narrative = generate_insight_response(req.context, req.data)
            return {"text": narrative, "source": "llm"}
        except Exception as e:
            err_str = str(e)
            logger.warning(f"LLM insight failed, falling back to deterministic: {err_str}")

            if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str:
                quota_note = (
                    "\n\n---\n"
                    "*AI summary quota reached for today (20 requests/day on free tier). "
                    "Showing the deterministic interpretation instead. "
                    "The full AI summary will return tomorrow, or enable billing on the Gemini key.*"
                )
            else:
                quota_note = ""

            try:
                narrative = _narrative(req.context, req.data)
                return {"text": narrative + quota_note, "source": "deterministic"}
            except Exception as e2:
                logger.error(f"Narrative generation error: {e2}")
                raise HTTPException(status_code=500, detail="Failed to generate narrative")

    class CompareRequest(BaseModel):
        record_a: Dict[str, Any]
        record_b: Dict[str, Any]

    @app.post("/llm/compare")
    async def compare_llm(req: CompareRequest):
        try:
            prompt = f"""
            Compare these two AMR prediction records and explain in plain English why they are different.
            Record A: {json.dumps(req.record_a, default=str)}
            Record B: {json.dumps(req.record_b, default=str)}
            Focus on differences in pathogen, antibiotic class, sector, county, MDR probability, anomaly flags, and key features.
            Keep explanation under 150 words and use simple language.
            """
            text = generate_comparison_response(prompt)
            return {"text": text}
        except Exception as e:
            logger.error(f"Comparison LLM error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    class SMSRequest(BaseModel):
        phone: str
        message: str

    @app.post("/send-sms")
    async def send_sms_endpoint(req: SMSRequest):
        result = send_sms(req.phone, req.message)
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["detail"])
        return result

    @app.get("/analytics/pathogen_antibiotic_matrix")
    async def pathogen_antibiotic_matrix(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        county: Optional[str] = None,
        db: Session = Depends(get_db)
    ) -> Dict[str, Any]:
        query = db.query(
            AMRIsolateRecord.pathogen_code,
            AMRIsolateRecord.antibiotic_class,
            func.count(AMRIsolateRecord.record_id).label("total"),
            func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)).label("mdr_count")
        ).group_by(AMRIsolateRecord.pathogen_code, AMRIsolateRecord.antibiotic_class)

        if start_date:
            query = query.filter(AMRIsolateRecord.sample_collection_date >= start_date)
        if end_date:
            query = query.filter(AMRIsolateRecord.sample_collection_date <= end_date)
        if county:
            query = query.filter(AMRIsolateRecord.county == county)

        rows = query.all()
        if not rows:
            return {"pathogens": [], "antibiotics": [], "matrix": []}

        pathogens = sorted(set(r[0] for r in rows))
        antibiotics = sorted(set(r[1] for r in rows))
        data = {}
        for r in rows:
            pathogen, antibiotic, total, mdr = r
            rate = (mdr or 0) / total * 100 if total else 0.0
            data[(pathogen, antibiotic)] = round(rate, 1)

        matrix = [
            [data.get((p, a), 0.0) for a in antibiotics]
            for p in pathogens
        ]

        return {
            "pathogens": pathogens,
            "antibiotics": antibiotics,
            "matrix": matrix
        }

    @app.get("/me")
    async def direct_me(current_user: User = Depends(get_current_user)):
        return {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
            "assigned_county": current_user.assigned_county,
            "must_change_password": bool(current_user.must_change_password),
            "last_login_at": current_user.last_login_at.isoformat() if current_user.last_login_at else None,
        }

    @app.on_event("startup")
    async def startup_event():
        print("\n Registered routes:")
        for route in app.routes:
            print(f"  {route.methods} {route.path}")
        print("\n")

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request, exc):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail, "status_code": exc.status_code}
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc):
        return JSONResponse(
            status_code=422,
            content={"error": "Validation error", "details": exc.errors()}
        )

    app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["notifications"])
    app.include_router(admin_users_router, prefix="/api/v1/admin", tags=["admin"])
    app.include_router(analyst_router, prefix="/api/v1/analyst", tags=["analyst"])
    app.include_router(model_health_router, prefix="/api/v1/ml", tags=["ml"])
    app.include_router(user_actions_router, prefix="/api/v1/user", tags=["user-actions"])
    app.include_router(audit_router, prefix="/api/v1/audit", tags=["audit"])
    app.include_router(auth_router, prefix="/auth", tags=["auth"])
    app.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
    app.include_router(admin_users_router, prefix="/admin", tags=["admin"])
    app.include_router(analyst_router, prefix="/analyst", tags=["analyst"])
    app.include_router(model_health_router, prefix="/ml", tags=["ml"])
    app.include_router(user_actions_router, prefix="/user", tags=["user-actions"])
    app.include_router(audit_router, prefix="/audit", tags=["audit"])

    return app


app = create_app()
combined_app = socketio.ASGIApp(socketio_server=sio, other_asgi_app=app)
app.sio = sio


@sio.event
async def connect(sid: str, environ: Dict[str, Any]) -> None:
    logger.info(f"SocketIO client connected securely. Session ID: {sid}")


@sio.event
async def disconnect(sid: str) -> None:
    logger.info(f"SocketIO client disconnected cleanly. Session ID: {sid}")


@sio.event
async def stream_isolate_data(sid: str, data: Dict[str, Any]) -> None:
    logger.info(f"Real-time pipeline payload received via socket channel from: {sid}")
    db = SessionLocal()
    try:
        service = PredictionService(db)
        processed = await service.predict(data, background_tasks=None)

        if processed.get("anomaly_detected"):
            msg = (
                f"Alert: High anomaly score flagged for "
                f"{data.get('pathogen_code', 'unknown').upper()} in "
                f"{data.get('county', 'unknown')} county."
            )
            notif = DashboardNotification(
                county=str(data.get("county", "unknown")),
                message=msg,
            )
            db.add(notif)
            db.commit()

            await sio.emit("dashboard_notification_push", {
                "county": notif.county,
                "message": notif.message,
                "timestamp": datetime.utcnow().isoformat(),
            })

        await sio.emit("prediction_complete", processed, to=sid)
    except Exception as e:
        logger.error(f"Failed to process streamed socket payload: {str(e)}")
        await sio.emit("prediction_failed", {"error": str(e)}, to=sid)
    finally:
        db.close()


if __name__ == "__main__":
    try:
        host = getattr(settings, "SERVER_HOST", "0.0.0.0")
        port = getattr(settings, "SERVER_PORT", 8000)
        logger.info(f"Starting ASGI server on {host}:{port}")
        uvicorn.run(
            "src.main:combined_app",
            host=host,
            port=port,
            workers=1,
            log_level="info",
        )
    except Exception as e:
        logger.critical(f"Server boot crashed: {str(e)}")
        sys.exit(1)