from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application
    PROJECT_NAME: str = "AMR-Nexus ML API"
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str

    # Model & data paths
    MODEL_DIR: str = "./saved_models"
    MODEL_PATH: str = "./saved_models/mdr_model.pkl"
    TRAINING_DATA_PATH: str = "./data/kenya_amr_3000_isolates.csv"
    SHAP_BACKGROUND_PATH: str = "./saved_models/shap_background.parquet"
    DATA_FILE_PATH: str = "./data/kenya_amr_3000_isolates.csv"
    ANOMALY_FILE_PATH: Optional[str] = "./data/kenya_amr_anomaly_200.csv"
    ANOMALY_RATIO: float = 0.05

    # Training
    TARGET_COL: Optional[str] = "mdr_flag"
    MDR_THRESHOLD: float = 0.5
    CSV_ENCODING: str = "utf-8"
    LIMIT: Optional[int] = 3000
    SPLIT_BY_TIME: bool = False

    # Feature list
    FRONTEND_FEATURES: List[str] = [
        'sector', 'sub_sector', 'pathogen_code', 'specimen_type',
        'county', 'antibiotic_class', 'test_method', 'sample_month',
        'prior_antibiotic_exposure'
    ]

    # SHAP
    SHAP_TOP_FEATURES: int = 3

    # Alerts & risk
    ALERT_MDR_THRESHOLD: float = 30.0
    ALERT_ANOMALY_DAYS: int = 7
    RISK_WEIGHTS: dict = {"anomaly": 0.4, "mdr": 0.4, "sample": 0.2}
    ANOMALY_CONTAMINATION: float = 0.05

    # Africa's Talking (SMS)
    AFRICASTALKING_USERNAME: str = "sandbox"
    AFRICASTALKING_API_KEY: str = ""
    AT_SENDER_ID: str = "AMRNexus"
    ENABLE_SMS: bool = False

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = "reports@amrnexus.org"

    # Gemini API
    GEMINI_API_KEY: str = ""

    # Default user
    DEFAULT_USER_NAME: str = "John Doe"
    DEFAULT_USER_EMAIL: str = "john.doe@amrnexus.org"
    DEFAULT_USER_ROLE: str = "epidemiologist"
    DEFAULT_USER_COUNTY: str = "Nairobi"

    # Server
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000

    # XGBoost hyperparameters
    XGB_N_ESTIMATORS: int = 200
    XGB_MAX_DEPTH: int = 6
    XGB_LEARNING_RATE: float = 0.05
    XGB_TREE_METHOD: str = "hist"
    XGB_RANDOM_STATE: int = 42

    # Misc
    RESISTANCE_THRESHOLD: float = 0.5
    GEOGRAPHY_COLUMN: str = "county"
    DEFAULT_SAMPLE_MONTH: int = 1
    DEFAULT_AGE_FALLBACK: float = -1.0
    DEFAULT_STRING_FALLBACK: str = "unknown"
    DEFAULT_TEST_METHOD: str = "Disk diffusion"

    # Pydantic v2 configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


settings = Settings()