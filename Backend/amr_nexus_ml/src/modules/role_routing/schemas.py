"""Pydantic v2 schemas for the role routing module."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["admin", "analyst", "clinician", "viewer"]
Channel = Literal["email", "sms", "desktop"]
Severity = Literal["critical", "high", "medium", "low"]


class RoleRoutingUpdate(BaseModel):
    min_severity: Severity | None = None
    enabled: bool | None = None


class RoleRoutingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: Role
    channel: Channel
    min_severity: Severity
    enabled: bool
    updated_by: int | None = None
    updated_at: datetime | None = None


class RoleRoutingResetResponse(BaseModel):
    restored: int
    message: str = Field(default="Defaults restored")
