# ADR-0002: AMU/AMC Module

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

County stakeholder feedback (September 2026) identified a concrete gap:
the platform has no module showing Antimicrobial Use (AMU) or
Antimicrobial Consumption (AMC) patterns. Stakeholders asked specifically
for utilisation in animals as well as humans, breakdown by county, sector,
species and period, and input to resistance analysis rather than a
standalone page.

The existing isolate record (37 columns) does not model consumption. A new
domain is required.

## Decision

Implement AMU as the first real module on the framework introduced in
ADR-0001. The module lives under `src/modules/amu/` and is registered in
`src/modules/__init__.py` with a single line. No changes to `src/main.py`.

### Data model - two tables

1. `amu_drug_reference` - canonical drug list. Fields: id, name,
   atc_code, who_category (Access/Watch/Reserve), route,
   species_approved, is_active, created_at.

2. `amu_consumption` - one row per use event. Fields: id, drug_id (FK),
   county, sub_county, sector (human/animal/environment), species,
   quantity, unit, period_start, period_end, source, recorded_by,
   notes, created_at.

### Units - raw + unit

Users enter the raw quantity and the unit (mg, g, ml, tablets, doses).
Normalisation is performed at aggregation time. This keeps input
ergonomic for field collection while allowing the analytics layer to
convert to standard units without a schema change.

### Write policy

- admin, analyst: create consumption records and drug reference entries.
- clinician, viewer: read-only.

Same policy as isolates.

### API surface (v1)

| Method | Path | Purpose |
|--------|------|---------|
| GET    | /modules/amu/drugs        | List drug reference |
| POST   | /modules/amu/drugs        | Admin/analyst: add drug |
| GET    | /modules/amu/consumption  | List records, filterable |
| POST   | /modules/amu/consumption  | Admin/analyst: record use |
| GET    | /modules/amu/summary      | Aggregate by dimension |
| GET    | /modules/amu/trend        | Monthly trend |
| GET    | /modules/amu/top-drugs    | Top N by quantity |

## Consequences

- The framework from ADR-0001 is now proven by a real customer.
- Two new tables are created by `Base.metadata.create_all()` at startup.
  Alembic is still absent; this is acceptable for the pilot and MUST be
  resolved before any schema change against production data.
- The module feeds future work: AMU-to-resistance linkage model,
  opportunity-cost / M&E module, policy output generation.
- Units normalisation lives in `service.py` and can be extended without
  touching the schema.

## Rejected alternatives

- One giant `amr_use` table mixing human/animal/environment. Breaks at
  the first policy question (e.g. veterinary-only AMU oversight). Field
  separation is cheap; a split later is not.

- Standalone `/analytics/amu` endpoint. Would have worked, but sets the
  wrong precedent - every future domain would bolt onto `analytics.py`
  (already 1115 lines) instead of becoming a module.

- Normalise quantity at input. Rejected: field collection is
  ergonomic-first. Users measure in ml on a farm, not in mg/kg. Convert
  in the service layer.
