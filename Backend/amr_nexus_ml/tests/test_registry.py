"""Tests for the module registry (PR #1)."""
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.modules import (
    bootstrap,
    clear,
    get_module,
    include_all,
)
from src.modules.example.router import MODULE_META
from src.modules.example.router import router as example_router
from src.modules.registry import Module, register


def setup_function(_):
    clear()


def test_registry_starts_empty():
    from src.modules import all_modules

    assert all_modules() == []


def test_bootstrap_registers_example_module():
    bootstrap()
    mod = get_module("example")
    assert mod is not None
    assert mod.meta.name == "example"
    assert mod.meta.version == "0.1.0"


def test_bootstrap_is_idempotent():
    bootstrap()
    bootstrap()  # must not raise
    mod = get_module("example")
    assert mod is not None


def test_register_rejects_duplicate():
    register(Module(meta=MODULE_META, router=example_router))
    try:
        register(Module(meta=MODULE_META, router=example_router))
    except ValueError:
        return
    raise AssertionError("register() should reject duplicate module names")


def test_include_all_mounts_module_routes():
    bootstrap()
    app = FastAPI()
    include_all(app)
    client = TestClient(app)
    resp = client.get("/modules/example/ping")
    assert resp.status_code == 200
    body = resp.json()
    assert body["module"] == "example"
    assert body["status"] == "ok"


def test_module_routes_appear_in_openapi():
    bootstrap()
    app = FastAPI()
    include_all(app)
    spec = app.openapi()
    assert "/modules/example/ping" in spec["paths"]
