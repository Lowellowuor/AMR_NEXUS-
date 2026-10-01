"""Alembic environment for AMR Nexus.

Reads the database URL from src.core.config.settings so migrations and the
running application always target the same database. Imports Base.metadata
from src.db.models, plus any module models, so autogenerate sees the full
schema. Uses batch mode for SQLite compatibility (SQLite cannot ALTER
columns in place).
"""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# --- Application imports ---
from src.core.config import settings
from src.db.models import Base

# Import module models so they register on Base.metadata
from src.modules.amu import models as _amu_models  # noqa: F401
from src.modules.actions import models as _actions_models  # noqa: F401


config = context.config

# Override the placeholder in alembic.ini with the app's real URL
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (emit SQL to stdout)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=False,
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=False,
            render_as_batch=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()