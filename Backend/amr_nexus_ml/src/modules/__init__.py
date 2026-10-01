"""Bootstrap for the AMR Nexus module registry."""
import importlib

from src.modules.registry import (
    Module,
    ModuleMeta,
    all_modules,
    clear,
    get_module,
    include_all,
    register,
)

__all__ = [
    "Module",
    "ModuleMeta",
    "register",
    "all_modules",
    "get_module",
    "clear",
    "include_all",
    "bootstrap",
]


# (import_path, meta_attr, router_attr)
_BUILTIN: list[tuple[str, str, str]] = [
    ("src.modules.example.router", "MODULE_META", "router"),
    ("src.modules.amu.router", "MODULE_META", "router"),
]


def bootstrap() -> None:
    """Idempotently register every built-in module."""
    for import_path, meta_attr, router_attr in _BUILTIN:
        mod = importlib.import_module(import_path)
        meta: ModuleMeta = getattr(mod, meta_attr)
        rt = getattr(mod, router_attr)
        if get_module(meta.name) is None:
            register(Module(meta=meta, router=rt))
