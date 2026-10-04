from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db, require_admin
from src.db.models import AuditEvent, GlassReferenceMapping, User
from src.services import glass_service

glass_router = APIRouter(tags=["glass"])

VALID_MAPPING_TYPES = {"specimen", "sector", "antibiotic_class"}


def _default_window() -> tuple[date, date]:
    end = date.today()
    start = end - timedelta(days=365)
    return start, end


class MappingCreate(BaseModel):
    mapping_type: str = Field(..., min_length=1, max_length=30)
    raw_value: str = Field(..., min_length=1, max_length=100)
    glass_code: str = Field(..., min_length=1, max_length=50)
    glass_label: str | None = Field(default=None, max_length=200)
    display_order: int = Field(default=100, ge=0, le=10000)


class MappingUpdate(BaseModel):
    glass_code: str | None = Field(default=None, min_length=1, max_length=50)
    glass_label: str | None = Field(default=None, max_length=200)
    display_order: int | None = Field(default=None, ge=0, le=10000)


def _audit(
    db: Session,
    user: User,
    *,
    action: str,
    resource: str,
    resource_id: str,
    method: str,
    path: str,
    result: str = "success",
) -> None:
    db.add(
        AuditEvent(
            actor_id=user.id,
            actor_email=user.email,
            actor_role=user.role,
            action=action,
            resource=resource,
            resource_id=resource_id,
            method=method,
            path=path,
            result=result,
        )
    )


def _serialise(m: GlassReferenceMapping) -> dict[str, Any]:
    return {
        "id": m.id,
        "mapping_type": m.mapping_type,
        "raw_value": m.raw_value,
        "glass_code": m.glass_code,
        "glass_label": m.glass_label,
        "display_order": m.display_order,
    }


@glass_router.get("/export", response_model=dict[str, Any])
async def export(
    start: date | None = None,
    end: date | None = None,
    county: str | None = None,
    strict: bool = False,
    download: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if start is None or end is None:
        d_start, d_end = _default_window()
        start = start or d_start
        end = end or d_end

    if start > end:
        raise HTTPException(status_code=400, detail="start must be <= end")

    result = glass_service.export_glass(db, start=start, end=end, county=county, strict=strict)

    if result.get("error") == "strict_mode_failed":
        raise HTTPException(status_code=422, detail=result)

    if download:
        filename = f"glass_export_{start.isoformat()}_{end.isoformat()}.csv"
        return Response(
            content=result["csv"],
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Export-Coverage-Pct": str(result["summary"]["coverage_pct"]),
                "X-Export-Total-Isolates": str(result["summary"]["total_isolates"]),
                "X-Export-Mapped-Isolates": str(result["summary"]["mapped_isolates"]),
            },
        )

    return result


@glass_router.get("/unmapped", response_model=dict[str, Any])
async def unmapped(
    start: date | None = None,
    end: date | None = None,
    county: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if start is None or end is None:
        d_start, d_end = _default_window()
        start = start or d_start
        end = end or d_end

    missing = glass_service.unmapped_values(db, start=start, end=end, county=county)
    total_missing = sum(len(v) for v in missing.values())

    return {
        "scope": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "county": county,
        },
        "unmapped": missing,
        "total_unmapped_values": total_missing,
        "has_gaps": total_missing > 0,
    }


@glass_router.get("/mappings", response_model=list[dict[str, Any]])
async def list_mappings(
    mapping_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if mapping_type and mapping_type not in VALID_MAPPING_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"mapping_type must be one of {sorted(VALID_MAPPING_TYPES)}",
        )
    q = select(GlassReferenceMapping)
    if mapping_type:
        q = q.where(GlassReferenceMapping.mapping_type == mapping_type)
    q = q.order_by(
        GlassReferenceMapping.mapping_type,
        GlassReferenceMapping.display_order,
        GlassReferenceMapping.raw_value,
    )
    rows = db.execute(q).scalars().all()
    return [_serialise(m) for m in rows]


@glass_router.post("/mappings", response_model=dict[str, Any], status_code=201)
async def create_mapping(
    payload: MappingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if payload.mapping_type not in VALID_MAPPING_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"mapping_type must be one of {sorted(VALID_MAPPING_TYPES)}",
        )

    raw_norm = payload.raw_value.strip().lower()
    existing = (
        db.execute(
            select(GlassReferenceMapping).where(
                GlassReferenceMapping.mapping_type == payload.mapping_type,
                GlassReferenceMapping.raw_value == raw_norm,
            )
        )
        .scalars()
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail=f"mapping already exists for {payload.mapping_type}:{raw_norm}",
        )

    m = GlassReferenceMapping(
        mapping_type=payload.mapping_type,
        raw_value=raw_norm,
        glass_code=payload.glass_code,
        glass_label=payload.glass_label,
        display_order=payload.display_order,
    )
    db.add(m)
    db.flush()

    _audit(
        db,
        current_user,
        action="create",
        resource="glass_mapping",
        resource_id=str(m.id),
        method="POST",
        path="/glass/mappings",
    )
    db.commit()
    db.refresh(m)
    return _serialise(m)


@glass_router.patch("/mappings/{mapping_id}", response_model=dict[str, Any])
async def update_mapping(
    mapping_id: int,
    payload: MappingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    m = db.get(GlassReferenceMapping, mapping_id)
    if m is None:
        raise HTTPException(status_code=404, detail="mapping not found")

    if payload.glass_code is not None:
        m.glass_code = payload.glass_code
    if payload.glass_label is not None:
        m.glass_label = payload.glass_label
    if payload.display_order is not None:
        m.display_order = payload.display_order

    _audit(
        db,
        current_user,
        action="update",
        resource="glass_mapping",
        resource_id=str(m.id),
        method="PATCH",
        path=f"/glass/mappings/{mapping_id}",
    )
    db.commit()
    db.refresh(m)
    return _serialise(m)


@glass_router.delete("/mappings/{mapping_id}", status_code=204)
async def delete_mapping(
    mapping_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    m = db.get(GlassReferenceMapping, mapping_id)
    if m is None:
        raise HTTPException(status_code=404, detail="mapping not found")

    _audit(
        db,
        current_user,
        action="delete",
        resource="glass_mapping",
        resource_id=str(m.id),
        method="DELETE",
        path=f"/glass/mappings/{mapping_id}",
    )
    db.delete(m)
    db.commit()
    return Response(status_code=204)
