from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.db.models import User
from src.services import lab_service

labs_router = APIRouter()


class CreateRequestPayload(BaseModel):
    record_id: str
    priority: str = Field(default="routine", max_length=20)
    notes: str | None = Field(default=None, max_length=2000)


class UpdateStatusPayload(BaseModel):
    status: str = Field(..., max_length=20)
    result_notes: str | None = Field(default=None, max_length=2000)
    confirmed_mdr: bool | None = None


@labs_router.get("/requests", response_model=list[dict[str, Any]])
async def list_requests(
    status: str | None = None,
    priority: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    return lab_service.list_requests(db, status=status, priority=priority, limit=limit, offset=offset)


@labs_router.get("/requests/{request_id}", response_model=dict[str, Any])
async def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    row = lab_service.get_request(db, request_id)
    if row is None:
        raise HTTPException(status_code=404, detail="request not found")
    return row


@labs_router.get("/requests/for-record/{record_id}", response_model=dict[str, Any] | None)
async def get_pending_for_record(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        uid = UUID(record_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid record id") from None
    return lab_service.pending_for_record(db, uid)


@labs_router.post("/requests", response_model=dict[str, Any], status_code=201)
async def create_request(
    payload: CreateRequestPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        uid = UUID(payload.record_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid record id") from None
    try:
        return lab_service.create_request(
            db,
            record_id=uid,
            user=current_user,
            priority=payload.priority,
            notes=payload.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@labs_router.patch("/requests/{request_id}", response_model=dict[str, Any])
async def update_status(
    request_id: int,
    payload: UpdateStatusPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        return lab_service.update_status(
            db,
            request_id=request_id,
            user=current_user,
            status=payload.status,
            result_notes=payload.result_notes,
            confirmed_mdr=payload.confirmed_mdr,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
