"""Sampling Sites module package.

Importing this package pulls in the SQLAlchemy model so it registers on
``Base.metadata`` before ``create_all()`` runs at startup.
"""
from src.modules.sampling_sites.models import SamplingSite
from src.modules.sampling_sites.router import MODULE_META, router

__all__ = ["MODULE_META", "router", "SamplingSite"]
