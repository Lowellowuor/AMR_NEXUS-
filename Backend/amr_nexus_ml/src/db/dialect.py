from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement


def is_postgres(db: Session) -> bool:
    return db.bind.dialect.name == "postgresql"


def year_month(
    db: Session,
    column: ColumnElement,
) -> ColumnElement:
    if is_postgres(db):
        return func.to_char(column, "YYYY-MM").label("ym")
    return func.strftime("%Y-%m", column).label("ym")
