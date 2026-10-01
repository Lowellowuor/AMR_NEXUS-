"""Business logic for role-based alert routing."""
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.modules.role_routing.models import RoleRouting
from src.modules.role_routing.schemas import RoleRoutingUpdate

# Severity ordering - higher is more severe. Used for >= comparisons.
_SEVERITY_ORDER = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
}


# Default routing rules. Applied on first access if the table is empty.
# Each tuple is (role, channel, min_severity, enabled).
_DEFAULTS = [
    ("admin", "email", "low", True),
    ("admin", "sms", "high", True),
    ("admin", "desktop", "low", True),
    ("analyst", "email", "medium", True),
    ("analyst", "sms", "critical", True),
    ("analyst", "desktop", "medium", True),
    ("clinician", "email", "high", True),
    ("clinician", "sms", "critical", True),
    ("clinician", "desktop", "medium", True),
    ("viewer", "email", "medium", True),
    ("viewer", "sms", "critical", False),  # viewers do not get SMS by default
    ("viewer", "desktop", "medium", True),
]


def _severity_rank(severity: str) -> int:
    return _SEVERITY_ORDER.get((severity or "").lower(), 0)


def seed_defaults_if_empty(db: Session) -> int:
    """Seed default rules if the table is empty. Returns rows created."""
    existing = db.execute(select(RoleRouting.id).limit(1)).first()
    if existing is not None:
        return 0
    now = datetime.now(UTC)
    rows = [
        RoleRouting(
            role=role,
            channel=channel,
            min_severity=min_sev,
            enabled=enabled,
            updated_at=now,
        )
        for role, channel, min_sev, enabled in _DEFAULTS
    ]
    db.add_all(rows)
    db.commit()
    return len(rows)


def list_all(db: Session) -> list[RoleRouting]:
    """Return all routing rules, seeding defaults on first call."""
    seed_defaults_if_empty(db)
    stmt = select(RoleRouting).order_by(RoleRouting.role, RoleRouting.channel)
    return list(db.execute(stmt).scalars().all())


def get_rule(db: Session, rule_id: int) -> RoleRouting | None:
    return db.get(RoleRouting, rule_id)


def update_rule(
    db: Session,
    rule: RoleRouting,
    payload: RoleRoutingUpdate,
    updated_by: int | None,
) -> RoleRouting:
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(rule, key, value)
    rule.updated_by = updated_by
    rule.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(rule)
    return rule


def reset_defaults(db: Session, updated_by: int | None) -> int:
    """Delete all rules and re-seed from defaults. Returns rows created."""
    db.query(RoleRouting).delete()
    db.commit()
    created = seed_defaults_if_empty(db)
    # Mark updated_by on the just-seeded rows
    now = datetime.now(UTC)
    for row in db.execute(select(RoleRouting)).scalars().all():
        row.updated_by = updated_by
        row.updated_at = now
    db.commit()
    return created


def role_allows(
    db: Session,
    role: str,
    channel: str,
    severity: str,
) -> bool:
    """Return True if role is allowed to receive this severity on this channel.

    Fail-open: if no rule exists for (role, channel), the answer is True.
    This preserves current behaviour for roles not yet configured.
    """
    if not role or not channel or not severity:
        return True
    stmt = (
        select(RoleRouting)
        .where(RoleRouting.role == role)
        .where(RoleRouting.channel == channel)
        .limit(1)
    )
    rule = db.execute(stmt).scalars().first()
    if rule is None:
        return True
    if not rule.enabled:
        return False
    return _severity_rank(severity) >= _severity_rank(rule.min_severity)
