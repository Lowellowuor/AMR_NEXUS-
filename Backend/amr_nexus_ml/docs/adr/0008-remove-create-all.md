# ADR-0008: Remove create_all from Startup

- **Status:** Accepted
- **Date:** 2026-10-01
- **Supersedes:** ADR-0003, "Startup behaviour" section

## Context

ADR-0003 introduced Alembic as the schema migration tool but retained
`Base.metadata.create_all(engine)` in the FastAPI lifespan handler. The
stated reason was convenience: fresh installs worked without running
`alembic upgrade head` first, and it was idempotent.

In practice this created a recurring failure mode. Three times in a
single session:

1. A developer generates an Alembic migration that adds a table.
2. The dev DB is dropped so the migration can be applied cleanly.
3. Any Python process that imports `src.main` - a pytest run, a
   background server, a scratch script - triggers `create_all`, which
   creates the table again.
4. `alembic upgrade head` then fails with `table already exists`.

The workaround each time was to stop every Python process, drop the
table, and run the migration immediately. That is not maintainable.

More seriously: `create_all` and Alembic are two authorities over the
same schema. When they disagree - which they will as migrations evolve -
`create_all` silently creates a table that a migration was supposed to
create. The DB ends up in a state Alembic does not know about.

## Decision

Remove `Base.metadata.create_all(engine)` from `src/main.py`.

Replace it with a single call to `ensure_schema_at_head()` in
`src/db/schema_check.py`. That helper:

1. Uses the Alembic Python API (not a subprocess) to read the head
   revision and the DB's current revision.
2. If the DB is behind head, runs `alembic upgrade head`.
3. If the DB is at head, logs and returns - no-op.
4. If the DB has no `alembic_version` table, treats it as empty and
   runs `alembic upgrade head` from the baseline.
5. On any error, raises. Startup fails loudly.

Alembic becomes the only authority over schema.

## Alternatives considered

### Fail hard if not at head (don't auto-upgrade)

Rejected for the pilot. The platform runs as a single process
(documented constraint). There is no multi-worker race. Forcing the
operator to run `alembic upgrade head` before every startup adds an
operational step for zero safety benefit at this scale. Auto-upgrade
gives the same "clone and run" experience `create_all` provided,
without the drift risk.

This can be revisited if we ever add multiple workers or a separate
migration step in a deployment pipeline.

### Keep `create_all` and require migrations elsewhere

Rejected: that is the current state and the reason for this ADR.

### Use a subprocess: `subprocess.run(["alembic", "upgrade", "head"])`

Rejected: subprocesses add a dependency on the CLI being on `PATH`,
make errors harder to catch, and are slower. The Alembic Python API
covers the same functionality.

## Consequences

- Single source of truth for schema.
- Every Python process that imports the app triggers a cheap check
  (two SELECTs against `alembic_version`), then a no-op if at head.
- Test suite startup is slightly slower the first time (migrations run),
  then the same as before.
- Fresh clone + `python -c "from src.main import app"` creates a fully
  migrated DB. Same ergonomics as before, without the drift.
- The workaround we used three times today - "stop everything, drop
  the table, run the migration immediately" - becomes unnecessary.

## Rollout

- New file `src/db/schema_check.py`.
- `src/main.py` lifespan: replace one line, keep the surrounding logs.
- No changes to `alembic.ini`, `migrations/env.py`, or any migration.