"""Pydantic v2 schemas for the Sampling Sites module."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SiteType = Literal[
    "farm", "clinic", "market", "abattoir", "environmental", "other"
]
Sector = Literal["human", "animal", "environment"]


class SamplingSiteBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    site_type: SiteType = "other"
    sector: Sector = "human"
    county: str = Field(..., min_length=1, max_length=100)
    sub_county: str | None = Field(None, max_length=100)
    latitude: float | None = Field(None, ge=-90.0, le=90.0)
    longitude: float | None = Field(None, ge=-180.0, le=180.0)
    owner_name: str | None = Field(None, max_length=200)
    owner_contact: str | None = Field(None, max_length=100)
    notes: str | None = None


class SamplingSiteCreate(SamplingSiteBase):
    pass


class SamplingSiteUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    site_type: SiteType | None = None
    sector: Sector | None = None
    county: str | None = Field(None, min_length=1, max_length=100)
    sub_county: str | None = Field(None, max_length=100)
    latitude: float | None = Field(None, ge=-90.0, le=90.0)
    longitude: float | None = Field(None, ge=-180.0, le=180.0)
    owner_name: str | None = Field(None, max_length=200)
    owner_contact: str | None = Field(None, max_length=100)
    notes: str | None = None
    is_active: bool | None = None


class SamplingSiteRead(SamplingSiteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime


class LinkedIsolate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    record_id: str
    pathogen_code: str | None = None
    antibiotic_class: str | None = None
    sir_result: str | None = None
    sample_collection_date: datetime | None = None
    county: str | None = None
    sub_county: str | None = None
    sector: str | None = None
    mdr_probability: float | None = None
    mdr_flag: bool | None = None
