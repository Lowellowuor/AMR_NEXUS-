from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.db.models import User
from src.services import case_service

cases_router = APIRouter()


class LinkPayload(BaseModel):
    record_id: int


class CaseUpdate(BaseModel):
    notes: str | None = None
    status: str | None = None


class MergePayload(BaseModel):
    source_case_id: int


class SplitPayload(BaseModel):
    record_id: str


@cases_router.get("", response_model=list[dict[str, Any]])
async def list_cases(
    county: str | None = None,
    status: str | None = None,
    sector: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return case_service.list_cases(
        db,
        county=county,
        status=status,
        sector=sector,
        limit=limit,
        offset=offset,
    )


@cases_router.get("/{case_id}", response_model=dict[str, Any])
async def get_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    detail = case_service.get_case_detail(db, case_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="case not found")
    return detail


@cases_router.post("/{case_id}/link", response_model=dict[str, Any])
async def link_isolate_to_case(
    case_id: int,
    payload: LinkPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        case_service.link_isolate(db, payload.record_id, case_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    db.commit()
    detail = case_service.get_case_detail(db, case_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="case not found")
    return detail


@cases_router.post("/{case_id}/detach", response_model=dict[str, Any])
async def detach_isolate_from_case(
    case_id: int,
    payload: LinkPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        case_service.detach_isolate(db, payload.record_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    db.commit()
    detail = case_service.get_case_detail(db, case_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="case not found")
    return detail


@cases_router.patch("/{case_id}", response_model=dict[str, Any])
async def update_case(
    case_id: int,
    payload: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    from src.db.models import Case

    case = db.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="case not found")

    if payload.status is not None:
        if payload.status not in ("open", "closed"):
            raise HTTPException(status_code=400, detail="status must be open or closed")
        case.status = payload.status

    if payload.notes is not None:
        case.notes = payload.notes

    from datetime import UTC, datetime

    case.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(case)

    detail = case_service.get_case_detail(db, case_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="case not found")
    return detail


@cases_router.post("/{case_id}/merge", response_model=dict[str, Any])
async def merge_case(
    case_id: int,
    payload: MergePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        return case_service.merge_cases(
            db,
            target_case_id=case_id,
            source_case_id=payload.source_case_id,
            user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@cases_router.post("/{case_id}/split", response_model=dict[str, Any])
async def split_case(
    case_id: int,
    payload: SplitPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        return case_service.split_isolate(
            db,
            record_id=payload.record_id,
            source_case_id=case_id,
            user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
