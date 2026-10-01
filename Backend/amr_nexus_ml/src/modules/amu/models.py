"""SQLAlchemy models for the AMU/AMC module."""
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from src.db.models import Base


class AMUDrug(Base):
    __tablename__ = "amu_drug_reference"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False, index=True)
    atc_code = Column(String(20), nullable=True, index=True)
    who_category = Column(String(20), nullable=True)
    route = Column(String(50), nullable=True)
    species_approved = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False
    )

    consumption = relationship("AMUConsumption", back_populates="drug")


class AMUConsumption(Base):
    __tablename__ = "amu_consumption"

    id = Column(Integer, primary_key=True, autoincrement=True)
    drug_id = Column(
        Integer,
        ForeignKey("amu_drug_reference.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    county = Column(String(100), nullable=False, index=True)
    sub_county = Column(String(100), nullable=True, index=True)
    sector = Column(String(20), nullable=False, index=True)
    species = Column(String(100), nullable=True, index=True)
    quantity = Column(Numeric(14, 4), nullable=False)
    unit = Column(String(20), nullable=False)
    period_start = Column(DateTime, nullable=False, index=True)
    period_end = Column(DateTime, nullable=False)
    source = Column(String(200), nullable=True)
    recorded_by = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )

    drug = relationship("AMUDrug", back_populates="consumption")
