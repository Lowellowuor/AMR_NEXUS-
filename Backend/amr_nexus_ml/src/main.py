from datetime import datetime
import sys
import json
import uuid
from contextlib import asynccontextmanager
from typing import Dict, Any, Generator, List, Optional

import socketio
import uvicorn
from fastapi import FastAPI, Depends, Query, HTTPException
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
from src.db.models import Base, DashboardNotification, AMRIsolateRecord
from src.services.prediction_service import PredictionService
from src.services.shap_service import compute_shap_explanation, record_to_feature_dict
from src.services.llm_service import generate_llm_response, generate_comparison_response
from src.services.sms_service import send_sms
from src.database import SessionLocal
from src.utils.logger import logger
from src.api.deps import get_db
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
)
from src.services.forecast_utils import generate_time_series_forecast


def get_cors_origins() -> List[str]:
    raw = settings.CORS_ORIGINS
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return [raw]
    return raw


CORS_ORIGINS = get_cors_origins()

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