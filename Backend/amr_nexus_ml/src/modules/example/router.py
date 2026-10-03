"""Example module - proves the module framework works end to end.

This module does nothing useful. It exists so that PR #1 has a real
module to register, test, and verify in OpenAPI. Delete it once the
first real module (AMU/AMC) is in place, or keep it as a template.
"""

from fastapi import APIRouter

from src.modules.registry import ModuleMeta

MODULE_META = ModuleMeta(
    name="example",
    version="0.1.0",
    description="Example module proving the module framework.",
    nav_label="Example",
    nav_order=999,
)

router = APIRouter(prefix="/modules/example", tags=["example"])


@router.get("/ping")
def ping() -> dict:
    return {"module": "example", "status": "ok", "version": MODULE_META.version}
