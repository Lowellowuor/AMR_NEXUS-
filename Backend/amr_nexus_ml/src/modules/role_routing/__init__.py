"""Role-based alert routing module.

Importing this package pulls in the SQLAlchemy model so it registers on
``Base.metadata`` before ``create_all()`` runs at startup.
"""
from src.modules.role_routing.models import RoleRouting
from src.modules.role_routing.router import MODULE_META, router

__all__ = ["MODULE_META", "router", "RoleRouting"]
