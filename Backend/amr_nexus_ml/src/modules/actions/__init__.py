"""Action layer package.

Importing this package pulls in the SQLAlchemy model so it registers on
``Base.metadata`` before ``create_all()`` runs at startup.
"""
from src.modules.actions.models import ActionPlan
from src.modules.actions.router import MODULE_META, router

__all__ = ["MODULE_META", "router", "ActionPlan"]
