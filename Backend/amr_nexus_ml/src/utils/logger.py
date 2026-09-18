from loguru import logger
import sys
from src.core.config import settings

logger.remove()
logger.add(sys.stdout, level=settings.LOG_LEVEL, format="<green>{time}</green> | <level>{level}</level> | <cyan>{name}</cyan> - <white>{message}</white>")
logger.add("logs/amr_ml.log", rotation="1 week", retention="1 month", level="DEBUG")
