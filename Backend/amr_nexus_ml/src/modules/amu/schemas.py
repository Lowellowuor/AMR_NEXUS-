"""Pydantic v2 schemas for the AMU/AMC module."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Sector = Literal["human", "animal", "environment"]
WHOCategory = Literal["Access", "Watch", "Reserve"]


class DrugReferenceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    atc_code: str | None = Field(None, max_length=20)
    who_category: WHOCategory | None = None
    route: str | None = Field(None, max_length=50)
    species_approved: str | None = Field(None, max_length=200)
    is_active: bool = True


class DrugReferenceCreate(DrugReferenceBase):
    pass


class DrugReferenceRead(DrugReferenceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class ConsumptionBase(BaseModel):
    drug_id: int
    county: str = Field(..., min_length=1, max_length=100)
    sub_county: str | None = Field(None, max_length=100)
    sector: Sector
    species: str | None = Field(None, max_length=100)
    quantity: float = Field(..., gt=0)
    unit: str = Field(..., min_length=1, max_length=20)
    period_start: datetime
    period_end: datetime
    source: str | None = Field(None, max_length=200)
    recorded_by: str | None = Field(None, max_length=100)
    notes: str | None = None


class ConsumptionCreate(ConsumptionBase):
    pass


class ConsumptionRead(ConsumptionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class SummaryBucket(BaseModel):
    key: str
    quantity: float
    records: int


class SummaryResponse(BaseModel):
    dimension: str
    buckets: list[SummaryBucket]
    total_quantity: float
    total_records: int


class TrendPoint(BaseModel):
    period: str
    quantity: float
    records: int


class TrendResponse(BaseModel):
    county: str | None
    drug_id: int | None
    points: list[TrendPoint]


class TopDrug(BaseModel):
    drug_id: int
    name: str
    quantity: float
    records: int


class TopDrugsResponse(BaseModel):
    items: list[TopDrug]
    limit: int
