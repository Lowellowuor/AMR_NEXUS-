"""Ensure the database schema is at the current Alembic head.

Called from the FastAPI lifespan handler. Replaces the previous
`Base.metadata.create_all(engine)` so that Alembic is the single
authority over schema (ADR-0008).
"""

from pathlib import Path

from alembic import command
from alembic.config import Config as AlembicConfig
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine

from src.core.config import settings
from src.utils.logger import logger

_REPO_ROOT = Path(__file__).resolve().parents[2]
_ALEMBIC_INI = _REPO_ROOT / "alembic.ini"
_MIGRATIONS_DIR = _REPO_ROOT / "migrations"


def _make_config() -> AlembicConfig:
    cfg = AlembicConfig(str(_ALEMBIC_INI))
    cfg.set_main_option("script_location", str(_MIGRATIONS_DIR))
    cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    return cfg


def _current_revision() -> str | None:
    """Read the DB's current alembic revision, or None if untracked."""
    engine = create_engine(settings.DATABASE_URL)
    try:
        with engine.connect() as conn:
            ctx = MigrationContext.configure(conn)
            return ctx.get_current_revision()
    finally:
        engine.dispose()


def ensure_schema_at_head() -> None:
    """Upgrade the DB to Alembic head. No-op if already there."""
    cfg = _make_config()
    script = ScriptDirectory.from_config(cfg)
    head = script.get_current_head()

    if head is None:
        logger.warning("No Alembic migrations found; schema check skipped.")
        return

    current = _current_revision()

    if current == head:
        logger.info("Database schema at head (%s).", head)
        return

    if current is None:
        logger.info("Database has no alembic version; running full upgrade to %s.", head)
    else:
        logger.info("Database at %s, upgrading to %s.", current, head)

    command.upgrade(cfg, "head")
    logger.info("Database schema upgraded to %s.", head)
