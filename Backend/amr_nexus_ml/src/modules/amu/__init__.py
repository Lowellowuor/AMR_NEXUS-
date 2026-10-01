"""AMU/AMC module package.

Importing this package pulls in the SQLAlchemy models so they register on
``Base.metadata`` before ``create_all()`` runs at startup.
"""
from src.modules.amu.models import AMUConsumption, AMUDrug
from src.modules.amu.router import MODULE_META, router

__all__ = ["MODULE_META", "router", "AMUDrug", "AMUConsumption"]
