import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Config:
    DATA_FILE_PATH = os.getenv("DATA_FILE_PATH", "")
    DB_URL = os.getenv("DB_URL", "")
    MODEL_DIR = Path(os.getenv("MODEL_DIR", "./saved_models"))
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    ANOMALY_CONTAMINATION = float(os.getenv("ANOMALY_CONTAMINATION", "0.05"))
    XGB_PARAMS = {
        "n_estimators": 200,
        "max_depth": 6,
        "learning_rate": 0.05,
        "tree_method": "hist",
        "random_state": 42,
    }

config = Config()