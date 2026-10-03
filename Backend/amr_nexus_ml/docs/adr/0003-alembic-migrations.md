# ADR-0003: Adopt Alembic for Schema Migrations

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

The database schema is currently created at application startup by
`Base.metadata.create_all(engine)` inside the FastAPI lifespan handler.
This works for a fresh install and for additive changes, but it cannot:

- drop or rename a column,
- alter an existing column type,
- add a non-nullable column to a populated table,
- apply the same change to more than one environment deterministically,
- be reviewed before it lands.

PR #2 added two AMU tables. Those landed safely because they were new.
The next change to an existing table - adding a field to `amr_isolate_records`,
or tightening `amu_consumption` - will not be safe without a migration tool.

This is a hard blocker for any production schema change and is a stated
roadmap item ("No Alembic migrations ... Required before first production
schema change").

## Decision

Adopt **Alembic** as the schema migration tool for the project.

### Layout

    Backend/amr_nexus_ml/
    ├── alembic.ini
    └── migrations/
        ├── env.py
        ├── script.py.mako
        └── versions/
            └── <hash>_baseline_schema.py

### Configuration

- `alembic.ini` holds boilerplate. `sqlalchemy.url` is left blank and set
  in `env.py` from `src.core.config.settings.DATABASE_URL`.
- `env.py` imports `Base` from `src.db.models` and the AMU models, so
  autogenerate sees the full metadata. This is the same metadata the
  application uses at startup.
- A **baseline migration** captures the current schema (all tables,
  indexes, foreign keys) as a single revision.

### Startup behaviour

`Base.metadata.create_all(engine)` is retained in `src/main.py` for now:

- On a fresh developer machine or a fresh SQLite file, it creates tables
  so the app is immediately usable without running alembic first.
- It is idempotent: it does nothing if tables already exist.

Alembic owns **schema changes**. Every future change follows this sequence:

1. Developer edits the SQLAlchemy model.
2. `alembic revision --autogenerate -m "describe change"`.
3. Developer reviews the generated migration. Edits are hand-curated for
   data backfills and index strategy.
4. Migration is committed with the model change in the same PR.
5. On every environment, `alembic upgrade head` is run as part of
   deployment.

### Baseline handling

The existing developer database (`amr_data.db`) already contains all
tables. After generating the baseline migration, that database is marked
as being at the baseline revision with `alembic stamp head`. This records
"this database is already at the baseline" without re-running CREATE
statements.

## Consequences

- Schema changes are now reviewable, reversible, and deterministic across
  environments.
- A production deployment against PostgreSQL can be reproduced from an
  empty database by running `alembic upgrade head`.
- There are now two places that can create tables: `create_all` (idempotent,
  fresh installs) and alembic (all changes). This is documented and
  intentional. The alternative - removing `create_all` entirely - would
  break the current developer workflow and every test fixture.
- The migrations directory must be committed. It is not git-ignored.

## Rejected alternatives

- **Hand-rolled migration scripts.** Rejected: no autogenerate, no
  version tracking, no rollback, no cross-environment determinism.

- **No migrations - continue with `create_all`.** Rejected: this is the
  current state and it is the blocker this ADR exists to resolve.

- **Remove `create_all` and require `alembic upgrade head` on every fresh
  install.** Rejected for now: too disruptive to tests, local development,
  and the CI script that does not yet exist. Revisit when CI is added.
