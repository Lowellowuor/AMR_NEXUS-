# ADR-0004: Action Layer

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

County stakeholder feedback (September 2026) returned to one question
repeatedly:

    "Once the system provides information or a prediction, what happens next?"

    "Every piece of loaded data communicating clear next steps and driving
    explicit action."

Today, the platform generates alerts and predictions but has no first-class
entity representing "someone is doing something about this." Alerts have
`resolution_note` and `resolved_by` fields, but those describe a conclusion,
not an in-progress action with an owner and a due date. A prediction has no
follow-up mechanism at all.

The stakeholder concern is not a UI concern. It is a missing domain:
there is no work-tracking entity on the platform.

## Decision

Introduce an **Action** as a first-class domain and implement it as a
module under `src/modules/actions/`, registered in `src/modules/__init__.py`.

### Table: `action_plans`

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| title | String(200) | required |
| description | Text | optional |
| source_type | String(20) | "alert" \| "prediction" \| "manual" |
| source_id | String(100) | UUID or identifier of the source record |
| assigned_to | Integer FK users.id | nullable, defaults to creator |
| due_date | DateTime | nullable |
| status | String(20) | "open" \| "in_progress" \| "done" \| "cancelled" |
| priority | String(20) | "low" \| "medium" \| "high" \| "critical" |
| county | String(100) | nullable |
| sub_county | String(100) | nullable |
| created_by | Integer FK users.id | required |
| created_at | DateTime | |
| updated_at | DateTime | |
| closed_at | DateTime | nullable |
| closing_note | Text | nullable |

Indexes on: status, priority, assigned_to, county, source_type, source_id.

### API surface (v1)

| Method | Path | Purpose |
|--------|------|---------|
| GET    | /modules/actions                | List actions, filterable |
| POST   | /modules/actions                | Create an action |
| GET    | /modules/actions/{id}           | Get one |
| PATCH  | /modules/actions/{id}           | Update fields |
| POST   | /modules/actions/{id}/close     | Close with note |
| GET    | /modules/actions/mine           | Actions assigned to caller |

### Write policy

- Any authenticated user can create an action.
- Only the assignee, the creator, or admin can update or close an action.
- All roles can read all actions within their scope (county filtering not
  yet enforced; see "Deferred" below).

### Deferred to a follow-up PR

- Auto-creation of actions from alert acknowledgement.
- Auto-creation from high-risk predictions.
- Enforcement that an alert cannot be resolved without a linked action.
- County-scoped visibility (analyst sees only their county's actions).

These are behaviour changes to existing flows. Separating them keeps this
PR reviewable.

## Consequences

- The "what happens next" question now has an answer in the data model.
- This is the first migration **produced by** the Alembic setup from
  ADR-0003. The migration is generated and reviewed like any other.
- Frontend work (E3) can begin once this lands: an Actions page, an
  Actions drawer in the alert view, an Actions section in the prediction
  detail panel.

## Rejected alternatives

- **Store actions as JSON inside alerts.** Rejected: not queryable, not
  assignable, not auditable.

- **Reuse the existing `alert_acknowledgements` table.** Rejected: an
  acknowledgement is "I saw this"; an action is "I am doing this by date".
  Conflating them makes both weaker.

- **Auto-create actions in this PR.** Rejected: mixes a new domain with
  changes to existing alert/prediction behaviour. Two concerns, two PRs.
