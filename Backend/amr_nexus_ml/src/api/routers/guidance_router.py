"""Clinical guidance based on observed resistance data.

Delegates to src.services.guidance_service, which falls back to mdr_flag
when sir_result is missing (as it is for the majority of current isolates).
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.api.deps import get_db
from src.api.schemas import GuidanceRequest
from src.services import guidance_service

guidance_router = APIRouter()


@guidance_router.post(
    "/recommend",
    status_code=status.HTTP_200_OK,
    response_model=dict[str, Any],
)
async def get_clinical_guidance_recommendation(
    payload: GuidanceRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if not payload.pathogen_code or not payload.pathogen_code.strip():
        raise HTTPException(status_code=400, detail="pathogen_code is required")

    try:
        result = guidance_service.observed_resistance_for_pathogen(
            db,
            pathogen_code=payload.pathogen_code,
            county=payload.county or None,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Observed resistance lookup failed: {e}",
        ) from e

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No observed resistance data for {payload.pathogen_code} "
                f"in the last {guidance_service.DATA_WINDOW_DAYS} days"
                + (f" in {payload.county}" if payload.county else "")
            ),
        )

    result["requested_resistance_pattern"] = payload.resistance_pattern
    result["user_role_context"] = payload.user_role
    result["regional_demographic_context"] = (
        payload.county if payload.county else "National Registry baseline"
    )
    return result
