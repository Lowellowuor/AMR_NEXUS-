from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from src.database import SessionLocal
from src.db.models import AuditEvent
from src.core.security import decode_token
from src.utils.logger import logger

AUDIT_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_PATHS = {
    "/health",
    "/api/v1/health",
    "/metrics",
    "/favicon.ico",
    "/api/v1/auth/login",
    "/auth/login",
}
SKIP_PREFIXES = ("/docs", "/redoc", "/openapi.json", "/static")


def _infer_action(method: str, path: str) -> str:
    if "/export" in path or "/csv" in path:
        return "export"
    if method == "POST":
        return "create"
    if method in {"PUT", "PATCH"}:
        return "update"
    if method == "DELETE":
        return "delete"
    return "other"


def _infer_resource(path: str) -> str:
    parts = [p for p in path.split("/") if p and p not in {"api", "v1"}]
    if not parts:
        return "unknown"
    # Take the first non-numeric segment
    for part in parts:
        if not part.isdigit() and not _is_uuid(part):
            return part
    return parts[0]


def _is_uuid(value: str) -> bool:
    if len(value) != 36:
        return False
    return value.count("-") == 4


def _extract_resource_id(path: str) -> str:
    parts = [p for p in path.split("/") if p]
    for part in reversed(parts):
        if part.isdigit() or _is_uuid(part):
            return part
    return None


def _extract_actor(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return {}
    try:
        payload = decode_token(auth[7:])
        sub = payload.get("sub")
        return {
            "id": int(sub) if sub and str(sub).isdigit() else None,
            "role": payload.get("role"),
            "email": payload.get("email") or None,
        }
    except Exception:
        return {}


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method

        should_audit = (
            method in AUDIT_METHODS
            and path not in SKIP_PATHS
            and not any(path.startswith(p) for p in SKIP_PREFIXES)
        )

        if not should_audit:
            return await call_next(request)

        actor = _extract_actor(request)
        response = await call_next(request)

        try:
            result = "success"
            if 400 <= response.status_code < 500:
                result = "denied" if response.status_code in {401, 403} else "client_error"
            elif response.status_code >= 500:
                result = "error"

            with SessionLocal() as db:
                db.add(AuditEvent(
                    actor_id=actor.get("id"),
                    actor_email=actor.get("email"),
                    actor_role=actor.get("role"),
                    action=_infer_action(method, path),
                    resource=_infer_resource(path),
                    resource_id=_extract_resource_id(path),
                    method=method,
                    path=path,
                    status_code=response.status_code,
                    result=result,
                    ip_address=request.client.host if request.client else None,
                    user_agent=(request.headers.get("user-agent") or "")[:500],
                ))
                db.commit()
        except Exception as exc:
            logger.warning(f"Audit write failed: {exc}")

        return response
