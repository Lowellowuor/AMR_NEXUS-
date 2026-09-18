# src/api/routers/__init__.py
from src.api.routers.health_router import health_router
from src.api.routers.predictions import router as prediction_router
from src.api.routers.analytics import analytics_router
from src.api.routers.alerts import alerts_router
from src.api.routers.reports import reports_router
from src.api.routers.comments_router import comments_router
from src.api.routers.guidance_router import guidance_router
from src.api.routers.search_router import search_router
from src.api.routers.user_router import user_router
from src.api.routers.ews import ews_router
from src.api.routers.hotspots import router as hotspot_router
from src.api.routers.auth import router as auth_router
from src.api.routers.audit import audit_router
from src.api.routers.user_actions import router as user_actions_router
from src.api.routers.analyst import router as analyst_router
from src.api.routers.model_health import router as model_health_router
from src.api.routers.admin_users import router as admin_users_router
from src.api.routers.notifications import router as notifications_router
