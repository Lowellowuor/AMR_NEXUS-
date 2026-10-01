# ADR-0006: Sampling Sites and Triangulation

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

County stakeholder feedback (September 2026):

    "Geo-location coordinates should be added so that samples can be
    tagged to specific sites, supporting first-time users in capturing
    precise location data at the point of collection."

    "This should include the ability to triangulate data to support
    decision-making, e.g. linking laboratory sample results to a
    particular sampling site or farm."

Today `amr_isolate_records` stores `county` and `sub_county`. That is a
region, not a place. There is no entity representing a farm, clinic,
market, abattoir, or environmental sampling point. Consequences:

- No way to ask "show me every sample from this farm over time".
- No way to trace a resistance spike back to a specific site.
- Food-safety and environmental traceability, called out in feedback,
  cannot be built without it.
- The "farm traceback" mechanism described in the AMU ADR has no anchor.

## Decision

Introduce **Sampling Site** as a first-class domain and link isolates to
it via a nullable foreign key.

### Table: `sampling_sites`

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| name | String(200) | required |
| site_type | String(30) | farm \| clinic \| market \| abattoir \| environmental \| other |
| sector | String(20) | human \| animal \| environment |
| county | String(100) | required |
| sub_county | String(100) | nullable |
| latitude | Numeric(8, 6) | nullable |
| longitude | Numeric(9, 6) | nullable |
| owner_name | String(200) | nullable - for farm traceback |
| owner_contact | String(100) | nullable |
| notes | Text | nullable |
| is_active | Boolean | default true |
| created_by | Integer FK users.id | nullable |
| created_at | DateTime | |
| updated_at | DateTime | |

Indexes on: name, county, sector, site_type, is_active.

### Change to `amr_isolate_records`

Add one nullable column:

    site_id INTEGER NULL REFERENCES sampling_sites(id) ON DELETE SET NULL

Indexed. Existing rows have NULL and are unaffected. This is the first
migration that **modifies** an existing table (previous migrations only
created new tables). It exercises the ALTER path of the Alembic system
adopted in ADR-0003 while the data volume is small.

### API surface

| Method | Path | Purpose |
|--------|------|---------|
| GET    | /modules/sampling-sites                        | List sites, filterable |
| POST   | /modules/sampling-sites                        | Create site |
| GET    | /modules/sampling-sites/{id}                   | Get one |
| PATCH  | /modules/sampling-sites/{id}                   | Update |
| POST   | /modules/sampling-sites/{id}/deactivate        | Soft delete |
| GET    | /modules/sampling-sites/{id}/isolates          | Triangulation: isolates from this site |

### Write policy

- Any authenticated user can read.
- admin, analyst: create, update, deactivate.
- Same policy as AMU and Actions.

### Triangulation

The triangulation endpoint returns isolates linked to a given site,
ordered by `sample_collection_date` descending. This is the primitive
that later features (farm traceback, resistance trend by site, food
safety residue tracking) will build on.

## Consequences

- First ALTER migration under Alembic. The migration uses
  `batch_alter_table` for SQLite compatibility.
- Existing isolates continue to work with `site_id = NULL`.
- Frontend work can begin after this lands: a Sites page, a
  "sampling site" selector on the isolate submission form, and a
  site detail drawer accessible from isolate listings.
- No behaviour change to existing endpoints.

## Rejected alternatives

- **Store coordinates directly on `amr_isolate_records`.** Rejected:
  the same farm sends dozens of samples. Duplicating owner name and
  coordinates per isolate is a data integrity problem, not a feature.

- **Junction table `isolate_sites`.** Rejected: an isolate is collected
  at one site. Many-to-many adds complexity with no use case.

- **Reuse `sub_county_locations`.** Rejected: that table holds directory
  data (58 rows of county centroids), not user-created sampling points.