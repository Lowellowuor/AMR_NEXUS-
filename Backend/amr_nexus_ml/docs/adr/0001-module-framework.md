# ADR-0001: Module Framework

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

The county feedback asks for AMU/AMC, WASH, food safety and environmental
sampling as *onboardable modules*. Today the codebase has 26 routers under
`src/api/routers/` and 14 inline routes in `src/main.py`. There is no pattern
for "adding a module." Building AMU/AMC, then WASH, then food safety without
one guarantees a rewrite within six months.

## Decision

Adopt a three-layer module pattern:

1. **Domain layer** - `src/modules/<name>/` containing `models.py`,
   `schemas.py`, `service.py`, `router.py`, `permissions.py`.
2. **Registry** - `src/modules/registry.py`. One dict of `Module` objects.
3. **Convention** - every module exposes `MODULE_META: ModuleMeta` and
   `router: APIRouter` at its `router.py` top level.

`create_app()` calls `bootstrap()` once and `include_all(app)`. Existing
routers under `src/api/routers/` are migrated module-by-module over time;
this ADR does not force a big-bang refactor.

## Consequences

- `main.py` shrinks as inline routes and router imports are migrated.
- Frontend can drive navigation from a future `GET /api/v1/modules`.
- Onboarding a new module becomes a checklist, not a redesign.

## Rejected alternatives

- **Monolith + more routers:** the reason we are here.
- **Microservices:** overkill for on-prem single-process deployment.
