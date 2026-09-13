from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Date, Numeric, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.database import Base


class AMRIsolateRecord(Base):
    __tablename__ = "amr_isolate_records"

    record_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    submission_type = Column(String(20))

    pathogen_code = Column(String(100))
    mdr_flag = Column(Boolean)

    antibiotic_class = Column(String(100))
    sir_result = Column(String(1))
    test_method = Column(String(50))

    sector = Column(String(20))
    sub_sector = Column(String(50))
    specimen_type = Column(String(100))
    animal_species = Column(String(100))
    production_system = Column(String(50))

    county = Column(String(100))
    sub_county = Column(String(100))          
    urban_rural = Column(String(10))

    sample_collection_date = Column(Date)    
    sample_month = Column(Integer)

    patient_age_years = Column(Numeric(5, 1))
    patient_sex = Column(String(1))
    ward_type = Column(String(50))
    prior_antibiotic_exposure = Column(Boolean)
    infection_origin = Column(String(20))

    anomaly_score = Column(Numeric(5, 4))
    anomaly_flag = Column(Boolean)
    shap_top_feature = Column(String(100))
    shap_value = Column(Numeric(8, 4))
    model_version = Column(String(20))
    mdr_probability = Column(Numeric(5, 4))
    shap_summary = Column(Text, nullable=True)

    lab_confirmed_mdr = Column(Boolean, nullable=True)
    outcome_confirmed_at = Column(DateTime, nullable=True)
    outcome_confirmed_by = Column(String(100), nullable=True)
    outcome_notes = Column(Text, nullable=True)

    gene_marker_blandm = Column(Boolean, nullable=True, default=False)
    gene_marker_mcr1 = Column(Boolean, nullable=True, default=False)

    # NEW: Optional link to a Hotspot (facility)
    hotspot_id = Column(Integer, ForeignKey("hotspots.id"), nullable=True)


class SubCountyLocation(Base):
    __tablename__ = "sub_county_locations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    county = Column(String(100), index=True)
    sub_county = Column(String(100), index=True)
    latitude = Column(Numeric(8, 6))
    longitude = Column(Numeric(9, 6))


class Hotspot(Base):
    __tablename__ = "hotspots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    type = Column(String(50), nullable=False)  
    latitude = Column(Numeric(8, 6), nullable=False)
    longitude = Column(Numeric(9, 6), nullable=False)
    county = Column(String(100), nullable=False, index=True)
    sub_county = Column(String(100), nullable=True)
    address = Column(String(300), nullable=True)
    contact = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(UUID(as_uuid=True), ForeignKey("amr_isolate_records.record_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user_name = Column(String(100), nullable=False)
    text = Column(Text, nullable=False)


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(UUID(as_uuid=True), ForeignKey("amr_isolate_records.record_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    overall_risk_score = Column(Numeric(5, 4), nullable=False)
    anomaly_component = Column(Numeric(5, 4), nullable=False)
    mdr_component = Column(Numeric(5, 4), nullable=False)
    sample_component = Column(Numeric(5, 4), nullable=False)


class DashboardNotification(Base):
    __tablename__ = "dashboard_notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    county = Column(String(100), nullable=False)
    message = Column(String(500), nullable=False)
    is_read = Column(Boolean, default=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(100), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="analyst")
    token_version = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    must_change_password = Column(Boolean, default=False, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    assigned_county = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    templates = relationship("UserTemplate", back_populates="user", cascade="all, delete-orphan")


class UserTemplate(Base):
    __tablename__ = "user_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    form_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="templates")


class AlertAcknowledgement(Base):
    __tablename__ = "alert_acknowledgements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(UUID(as_uuid=True), ForeignKey("amr_isolate_records.record_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(100), nullable=True)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(100), nullable=True)
    resolution_note = Column(Text, nullable=True)
    assigned_to = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    occurred_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    actor_id = Column(Integer, nullable=True, index=True)
    actor_email = Column(String(100), nullable=True)
    actor_role = Column(String(20), nullable=True)
    action = Column(String(20), nullable=False, index=True)
    resource = Column(String(50), nullable=True, index=True)
    resource_id = Column(String(100), nullable=True, index=True)
    method = Column(String(10), nullable=True)
    path = Column(String(500), nullable=True)
    status_code = Column(Integer, nullable=True)
    result = Column(String(20), nullable=True, index=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(500), nullable=True)
    detail = Column(Text, nullable=True)


class SavedAnalysis(Base):
    __tablename__ = "saved_analyses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    created_by = Column(Integer, nullable=True, index=True)
    created_by_email = Column(String(100), nullable=True)
    title = Column(String(200), nullable=False)
    question = Column(Text, nullable=True)
    answer = Column(Text, nullable=False)
    context_type = Column(String(50), nullable=True)
    context_data = Column(JSON, nullable=True)
    tags = Column(String(500), nullable=True)


class ModelRegistry(Base):
    __tablename__ = "model_registry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    version = Column(String(50), nullable=False, unique=True, index=True)
    algorithm = Column(String(100), nullable=True)
    trained_at = Column(DateTime, nullable=True)
    metrics = Column(JSON, nullable=True)
    feature_names = Column(JSON, nullable=True)
    artifact_path = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(UUID(as_uuid=True), ForeignKey("amr_isolate_records.record_id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    model_version = Column(String(50), nullable=True)
    latency_ms = Column(Numeric(10, 2), nullable=True)
    mdr_probability = Column(Numeric(5, 4), nullable=True)
    mdr_flag = Column(Boolean, nullable=True)
    anomaly_flag = Column(Boolean, nullable=True)
    confidence_tier = Column(String(20), nullable=True)
    fallback_used = Column(Boolean, default=False)
    feature_snapshot = Column(JSON, nullable=True)


class DriftSnapshot(Base):
    __tablename__ = "drift_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    window_days = Column(Integer, nullable=False)
    drift_score = Column(Numeric(5, 4), nullable=True)
    per_feature = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    email_enabled = Column(Boolean, default=True)
    email_severity = Column(String(20), default="critical")
    sms_enabled = Column(Boolean, default=False)
    sms_severity = Column(String(20), default="critical")
    sms_phone = Column(String(30), nullable=True)
    desktop_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    channel = Column(String(20), nullable=False, index=True)
    severity = Column(String(20), nullable=True, index=True)
    recipient_user_id = Column(Integer, nullable=True)
    recipient_email = Column(String(100), nullable=True)
    recipient_phone = Column(String(30), nullable=True)
    subject = Column(String(200), nullable=True)
    body = Column(Text, nullable=True)
    alert_id = Column(String(100), nullable=True, index=True)
    status = Column(String(20), nullable=False, default="queued", index=True)
    error = Column(Text, nullable=True)
    provider_ref = Column(String(200), nullable=True)
    sent_at = Column(DateTime, nullable=True)
