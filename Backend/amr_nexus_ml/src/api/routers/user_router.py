from typing import Dict, Any
from fastapi import APIRouter
from src.core.config import settings

user_router = APIRouter()


@user_router.get("/profile")
def get_current_user_profile() -> Dict[str, Any]:
    return {
        "name": settings.DEFAULT_USER_NAME,
        "email": settings.DEFAULT_USER_EMAIL,
        "role": settings.DEFAULT_USER_ROLE,
        "assigned_county": settings.DEFAULT_USER_COUNTY,
    }
