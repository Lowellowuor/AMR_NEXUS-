from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.db.models import User
from src.services import onehealth_service

onehealth_router = APIRouter()


@onehealth_router.get("/pillar-activity", response_model=dict[str, Any])
async def pillar_activity(
    days: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return onehealth_service.pillar_activity_breakdown(db, days=days)


@onehealth_router.get("/amu-resistance", response_model=dict[str, Any])
async def amu_resistance(
    days: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return onehealth_service.amu_resistance_short(db, days=days)


@onehealth_router.get("/pillar-definitions", response_model=list[dict[str, Any]])
async def pillar_definitions(
    current_user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return [
        {
            "sector": "human",
            "label": "Human",
            "definition": (
                "Isolates from human patients: hospitals, clinics, outpatient "
                "departments, and community-acquired infections. Captures "
                "clinical resistance patterns that inform empiric therapy "
                "and infection prevention and control."
            ),
            "source": "WHO One Health Priority Setting",
        },
        {
            "sector": "animal",
            "label": "Animal",
            "definition": (
                "Isolates from livestock and poultry production: dairy, beef, "
                "small ruminants, broiler and layer operations, hatcheries. "
                "Captures antimicrobial use in food-producing animals and the "
                "reservoir of resistance that can transfer to humans through "
                "the food chain and direct contact."
            ),
            "source": "WHO One Health Priority Setting",
        },
        {
            "sector": "environment",
            "label": "Environment",
            "definition": (
                "Isolates from environmental sampling: wastewater, soil, water "
                "bodies, and surface sampling. Captures the environmental "
                "reservoir of resistance and the routes by which resistance "
                "genes move between animal, human, and environmental "
                "compartments."
            ),
            "source": "WHO One Health Priority Setting",
        },
    ]
