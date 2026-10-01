"""Module registry for AMR Nexus.

A "module" is a self-contained domain (AMU/AMC, WASH, food safety, etc.)
with its own router, models, schemas, service and permissions. This registry
holds the list of modules the app knows about and gives the app a single
way to include them all.
"""
from dataclasses import dataclass

from fastapi import APIRouter, FastAPI


@dataclass(frozen=True)
class ModuleMeta:
    name: str
    version: str = "0.1.0"
    description: str = ""
    nav_label: str | None = None
    nav_order: int = 100
    enabled: bool = True


@dataclass(frozen=True)
class Module:
    meta: ModuleMeta
    router: APIRouter


_REGISTRY: dict[str, Module] = {}


def register(module: Module) -> None:
    """Register a module. Raises if the name is already taken."""
    if module.meta.name in _REGISTRY:
        raise ValueError(f"Module '{module.meta.name}' is already registered")
    _REGISTRY[module.meta.name] = module


def get_module(name: str) -> Module | None:
    return _REGISTRY.get(name)


def all_modules() -> list[Module]:
    """Enabled modules, sorted by nav_order then name."""
    return sorted(
        (m for m in _REGISTRY.values() if m.meta.enabled),
        key=lambda m: (m.meta.nav_order, m.meta.name),
    )


def clear() -> None:
    """Test helper. Do not call from application code."""
    _REGISTRY.clear()


def include_all(app: FastAPI) -> None:
    """Include every enabled module's router on the app."""
    for module in all_modules():
        app.include_router(module.router, tags=[module.meta.name])
