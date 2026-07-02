# src/main.py (updated to include ews_router)
from datetime import datetime
import logging
import sys
from contextlib import asynccontextmanager
from typing import Dict, Any, Generator

import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.core.ml import load_models
from src.db.session import engine
from src.db.models import Base, DashboardNotification
from src.services.prediction_service import PredictionService
from src.database import SessionLocal
from src.utils.logger import logger
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

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS
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
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(prediction_router, prefix="/api/v1", tags=["predictions"])
    app.include_router(prediction_router, tags=["predictions"])

    app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["analytics"])
    app.include_router(analytics_router, prefix="/analytics", tags=["analytics"])

    app.include_router(alerts_router, prefix="/api/v1/alerts", tags=["alerts"])
    app.include_router(alerts_router, prefix="/alerts", tags=["alerts"])

    app.include_router(reports_router, prefix="/api/v1", tags=["reports"])
    app.include_router(reports_router, tags=["reports"])

    app.include_router(guidance_router, prefix="/api/v1", tags=["guidance"])
    app.include_router(guidance_router, tags=["guidance"])

    app.include_router(search_router, prefix="/api/v1", tags=["search"])
    app.include_router(search_router, tags=["search"])

    app.include_router(user_router, prefix="/api/v1", tags=["user"])
    app.include_router(user_router, tags=["user"])

    app.include_router(health_router, prefix="/api/v1", tags=["health"])
    app.include_router(health_router, tags=["health"])

    app.include_router(ews_router, tags=["ews"])

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
    logger.info(f"Real‑time pipeline payload received via socket channel from: {sid}")
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