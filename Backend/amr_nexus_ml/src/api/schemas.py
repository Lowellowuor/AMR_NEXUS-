from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class AMRRecordIn(BaseModel):
    sector: str = Field(..., max_length=20)
    sub_sector: str = Field(..., max_length=50)
    pathogen_code: str = Field(..., max_length=100)
    specimen_type: str = Field(..., max_length=100)
    animal_species: str | None = Field(default=None, max_length=100)
    production_system: str | None = Field(default=None, max_length=50)
    county: str = Field(..., max_length=100)
    sub_county: str | None = Field(default=None, max_length=100)
    urban_rural: str | None = Field(default=None, max_length=10)
    patient_age_years: float | None = Field(default=None, ge=0, le=120)
    patient_sex: str | None = Field(default=None, max_length=1)
    ward_type: str | None = Field(default=None, max_length=50)
    prior_antibiotic_exposure: bool | None = None
    infection_origin: str | None = Field(default=None, max_length=20)
    antibiotic_class: str = Field(..., max_length=100)
    test_method: str = Field(..., max_length=50)
    sample_month: int = Field(..., ge=1, le=12)
    sample_collection_date: date | None = None
    phone_number: str | None = Field(default=None, max_length=20)
    site_id: int | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    qualitative_context: str | None = Field(default=None, max_length=2000)
    suspected_driver: str | None = Field(default=None, max_length=100)
    treatment_history: str | None = Field(default=None, max_length=2000)


class PredictionResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    mdr_flag: bool
    mdr_probability: float
    anomaly_detected: bool
    anomaly_score: float
    shap_top_feature: str
    shap_value: float
    shap_summary: str
    source: str = "ml"
    fallback_used: bool = False
    calibration_applied: bool = False
    model_version: str = "1.0.0"
    record_id: str | None = None
    case_id: int | None = None
    case_code: str | None = None
    confidence_tier: str | None = None
    next_actions: list[dict] | None = None
    contributing_factors: list[dict] | None = None
    outbreak_context: dict | None = None
    data_quality: dict | None = None


class EmailReportRequest(BaseModel):
    email: str
    format: str = Field(default="pdf", max_length=10)


class CommentCreate(BaseModel):
    text: str = Field(..., max_length=1000)
    user_name: str = Field(default="Anonymous", max_length=100)


class GuidanceRequest(BaseModel):
    pathogen_code: str = Field(..., max_length=100)
    resistance_pattern: str = Field(..., max_length=200)
    user_role: str = Field(..., max_length=50)
    county: str | None = Field(default=None, max_length=100)
