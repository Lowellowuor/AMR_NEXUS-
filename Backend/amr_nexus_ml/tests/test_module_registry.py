"""Smoke tests for the module registry (PR #1 framework, ADR-0001).

These guard against common mistakes when adding a new module:
- duplicate names or nav_order values
- missing router
- empty router
- non-idempotent bootstrap
"""

import pytest
from fastapi import APIRouter, FastAPI

from src.modules import all_modules, bootstrap, include_all
from src.modules.registry import clear


@pytest.fixture(autouse=True)
def clean_registry():
    clear()
    yield
    clear()


def test_bootstrap_registers_at_least_one_module():
    bootstrap()
    assert len(all_modules()) > 0


def test_module_names_are_unique():
    bootstrap()
    names = [m.meta.name for m in all_modules()]
    assert len(names) == len(set(names))


def test_nav_orders_are_unique():
    bootstrap()
    orders = [m.meta.nav_order for m in all_modules()]
    assert len(orders) == len(set(orders))


def test_every_module_has_a_router():
    bootstrap()
    for m in all_modules():
        assert isinstance(m.router, APIRouter), m.meta.name


def test_every_module_has_at_least_one_route():
    bootstrap()
    for m in all_modules():
        assert len(m.router.routes) > 0, m.meta.name


def test_bootstrap_is_idempotent():
    bootstrap()
    first = [m.meta.name for m in all_modules()]
    bootstrap()
    second = [m.meta.name for m in all_modules()]
    assert first == second


def test_register_rejects_duplicate_name():
    from src.modules.registry import Module, ModuleMeta, register

    bootstrap()
    m = all_modules()[0]
    with pytest.raises(ValueError):
        register(Module(meta=ModuleMeta(name=m.meta.name), router=m.router))


def test_all_modules_sorted_by_nav_order():
    bootstrap()
    orders = [m.meta.nav_order for m in all_modules()]
    assert orders == sorted(orders)


def test_include_all_mounts_module_routes():
    bootstrap()
    app = FastAPI()
    include_all(app)
    paths = [r.path for r in app.routes]
    assert any(p.startswith("/modules/") for p in paths)
