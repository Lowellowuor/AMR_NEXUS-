from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

import src.modules.actions.models  # noqa: F401
import src.modules.amu.models  # noqa: F401
import src.modules.role_routing.models  # noqa: F401
import src.modules.sampling_sites.models  # noqa: F401
from src.core.config import settings
from src.db.models import Base

SQLITE_URL = "sqlite:///./amr_data.db"

PARENT_FIRST = [
    "users",
    "system_config",
    "sector_taxonomy",
    "glass_reference_mappings",
    "sampling_sites",
    "hotspots",
    "amu_drug_reference",
    "cases",
    "amr_isolate_records",
    "amu_consumption",
    "prediction_logs",
    "audit_events",
    "action_plans",
    "dashboard_notifications",
    "notification_logs",
    "notification_preferences",
    "comments",
    "saved_analyses",
    "drift_snapshots",
    "model_registry",
    "risk_scores",
    "alert_acknowledgements",
    "user_templates",
    "sub_county_locations",
    "role_routing",
]

BATCH_SIZE = 250


def _mapper_for(table_name: str):
    for m in Base.registry.mappers:
        if m.class_.__tablename__ == table_name:
            return m.class_
    return None


def main() -> int:
    if "postgresql" not in (settings.DIRECT_URL or ""):
        print("[copy] DIRECT_URL is not Postgres - aborting")
        return 1

    src_engine = create_engine(SQLITE_URL)

    dst_engine = create_engine(
        settings.DIRECT_URL,
        pool_pre_ping=True,
        pool_recycle=120,
    )

    src_db = Session(src_engine)

    try:
        for table_name in PARENT_FIRST:
            model = _mapper_for(table_name)
            if model is None:
                print(f"[copy] {table_name}: no mapper, skipping")
                continue

            table = model.__table__

            with dst_engine.begin() as conn:
                conn.exec_driver_sql(f'TRUNCATE TABLE "{table_name}" CASCADE')

            rows = src_db.execute(select(model)).scalars().all()
            if not rows:
                print(f"[copy] {table_name}: 0 rows")
                continue

            payload = [{c.name: getattr(row, c.name) for c in table.columns} for row in rows]

            with dst_engine.begin() as conn:
                for i in range(0, len(payload), BATCH_SIZE):
                    batch = payload[i : i + BATCH_SIZE]
                    conn.execute(table.insert(), batch)

            print(f"[copy] {table_name}: {len(rows)} rows")

        print("[copy] resetting Postgres sequences...")
        for table_name in PARENT_FIRST:
            model = _mapper_for(table_name)
            if model is None:
                continue
            table = model.__table__
            pk_cols = [c for c in table.columns if c.primary_key and c.autoincrement]
            if len(pk_cols) != 1:
                continue
            pk_col = pk_cols[0]
            pk_name = pk_col.name
            pk_type = str(pk_col.type).upper()
            if "UUID" in pk_type:
                continue
            try:
                with dst_engine.begin() as conn:
                    conn.exec_driver_sql(
                        f"SELECT setval("
                        f"pg_get_serial_sequence('{table_name}', '{pk_name}'), "
                        f"COALESCE((SELECT MAX({pk_name}) FROM {table_name}), 1), "
                        f"true)"
                    )
            except Exception as e:
                print(f"[copy] sequence reset skipped for {table_name}: {e}")

        print("[copy] done")
        return 0
    finally:
        src_db.close()
        dst_engine.dispose()


if __name__ == "__main__":
    raise SystemExit(main())
