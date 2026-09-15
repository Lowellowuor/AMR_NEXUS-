# AMR Nexus

**Antimicrobial Resistance Surveillance Platform · Republic of Kenya**

[![Status](https://img.shields.io/badge/status-active--development-yellow)]()
[![License](https://img.shields.io/badge/license-Proprietary-red)]()
[![Compliance](https://img.shields.io/badge/DPA%202019-compliant-blue)]()
[![WHO GLASS](https://img.shields.io/badge/WHO%20GLASS-aligned-green)]()

---

AMR Nexus is a national surveillance and clinical decision support platform for antimicrobial resistance (AMR) in Kenya. It ingests isolate-level data from health facilities, laboratories, veterinary sites, and environmental surveillance points, and provides early warning, predictive analytics, and Ministry of Health compliant reporting under a single, secure, auditable system.

---

## Table of Contents

- [What's Working Today](#whats-working-today)
- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Core Modules](#core-modules)
- [API Reference](#api-reference)
- [Machine Learning](#machine-learning)
- [Security & Compliance](#security--compliance)
- [Development](#development)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## What's Working Today

This section is kept honest against the code. If a claim here doesn't match the code, that is a documentation bug.

### Backend

- JWT authentication with bcrypt password hashing; `SECRET_KEY` is required at startup and there is **no silent fallback**
- Role-based access control: `admin`, `analyst`, `clinician`, `viewer`
- Isolate submission and MDR prediction via XGBoost with SHAP explainability
- **Deterministic rule-based fallback** when the ML model is unavailable — every prediction is labelled with `source: "ml"` or `source: "fallback"` and `fallback_used: true|false`
- Alert lifecycle: create, acknowledge, resolve, assign, bulk-acknowledge
- Multi-channel notification dispatch: in-app, SMTP email, Africa's Talking SMS
- Analytics: summary, MDR trend, by-pathogen, by-sector, by-county, sub-county GeoJSON, WHO GLASS indicator set
- `GET /analytics/county_detail` — full per-county medical panel (95% Wilson CI, top pathogens, sector and specimen breakdowns, antibiotic-class resistance, recent isolates, delta vs national) computed under the caller's own filter context
- Pathogen Explorer: overview, resistance, geography, trends, and recent views
- Audit trail: every privileged action recorded automatically with actor, IP, and timestamp
- Data subject rights: export and deletion-request workflows
- Model health: calibration, feature drift, live accuracy from confirmed outcomes
- Retraining script at `Backend/amr_nexus_ml/scripts/retrain.py` — reads confirmed laboratory outcomes, trains a new candidate model, writes to `saved_models/candidates/<timestamp>/`, and **does not** overwrite production unless invoked with `--promote`

### Frontend

- React 19 + Vite 8 + Tailwind 4 with light and dark themes
- Interactive maps on four views — National Dashboard, County Dashboard, Analytics, Pathogen Explorer — sharing a single detail drawer
- The drawer opens instantly with map data and enriches asynchronously from `/analytics/county_detail`
- Filter-aware tables with denominators (n), confidence intervals, and delta-vs-national colour coding
- WCAG AA colour contrast in both themes

### In progress or not yet automated

- Retraining is **manual**. Nothing schedules it; no cron job exists.
- The model registry table exists but is empty — no promoted model versions yet.
- Champion/challenger comparison is a **design pattern** (candidate directory + manual `--promote`), not an automated gate.
- The feedback loop requires clinician confirmation. As of this writing, real confirmed outcomes are sparse.
- Automated backups are not in the repository; deployment is not containerised yet.

---

## Overview

Antimicrobial resistance is one of the most urgent public health threats of the 21st century. In Kenya, the Ministry of Health has identified AMR surveillance as a national priority under the Kenya AMR National Action Plan and its commitment to the WHO Global Antimicrobial Resistance and Use Surveillance System (GLASS).

AMR Nexus provides the technical infrastructure to support this mission:

- **Surveillance** — aggregate and visualise resistance patterns across all 47 counties and 290+ sub-counties
- **Prediction** — machine-learning based estimation of multidrug resistance (MDR) with per-prediction explainability
- **Early warning** — real-time detection of anomalies and high-risk isolates with configurable alerting
- **Reporting** — Ministry of Health compliant reports aligned with GLASS indicators
- **Governance** — full audit trail and Data Protection Act 2019 compliant data subject rights

The platform is designed for self-hosted, on-premise deployment within Kenya, in line with data sovereignty requirements.

---

## Key Features

### Clinical

- **MDR prediction** with SHAP explainability — every prediction shows *why* it was made
- **Confidence tiers** — High / Moderate / Borderline with calibration-aware messaging
- **Antimicrobial stewardship** — WHO AWaRe classification (Access / Watch / Reserve) surfaced per antibiotic class
- **Laboratory confirmation loop** — clinicians confirm outcomes; confirmed records feed calibration metrics and retraining
- **Graceful degradation** — if the ML model cannot load or inference fails, a deterministic rule-based score is returned and labelled as fallback
- **Clinical guidance** — deterministic narrative generation from surveillance data

### Surveillance

- **Interactive maps** — clickable markers on four views with a shared detail drawer
- **Per-county medical panel** — isolates, MDR rate with 95% CI, top pathogens, sector split, specimen split, antibiotic-class resistance, recent isolates, delta vs national baseline
- **Time slider** — animated month-by-month evolution of resistance
- **Pathogen Explorer** — five-tab deep dive with geographic, resistance, trend, and recent views
- **Period comparison** — side-by-side delta across any two date ranges or scopes
- **WHO GLASS indicator strip** — *E. coli*, *Klebsiella pneumoniae*, *Staphylococcus aureus*

### Alerts & Notifications

- **Real-time alert stream** via Socket.IO
- **Severity triage** — Critical / High / Medium / Low with colour-coded cards
- **Age tracking** — automatic escalation by time elapsed since detection
- **Bulk acknowledge** — fast triage for outbreak scenarios
- **Multi-channel delivery** — in-app, email (SMTP), SMS (Africa's Talking), desktop browser notifications
- **Per-user preferences** — severity thresholds per channel
- **Notification log** — every delivery attempt recorded for audit

### Machine Learning Operations

- **Prediction log** — every inference recorded with features, latency, and outcome
- **Calibration curve** — predicted vs laboratory-confirmed outcomes
- **Feature drift detection** — symmetric total variation across five dimensions
- **Live performance** — accuracy, sensitivity, specificity, PPV, NPV computed from confirmed outcomes
- **Fallback logic** — deterministic rule-based risk score if the model is unavailable, labelled in the response and in the prediction log
- **Manual retraining** — `scripts/retrain.py` produces a candidate without touching production; `--promote` swaps it in with a backup

### Administration

- **User management** — create, disable, reset passwords, assign roles and counties
- **Role-based access control** — admin, analyst, clinician, viewer
- **Force password change** — on first login and after admin reset
- **Session invalidation** — "sign out everywhere" and automatic invalidation on role change
- **Audit log** — every privileged action recorded with actor, IP, and result
- **Data subject rights** — DPA 2019 export and deletion request workflows

### Design & UX

- **Light mode** — neutral palette, calm and readable
- **Dark mode** — deep navy medical-grade theme, WCAG AA compliant
- **Responsive** — mobile-first from 375 px up
- **Keyboard shortcuts** — `/`, `g` sequences, `r`, `e`, `c`
- **Print & PDF** — print stylesheets on report and prediction views
- **Accessibility** — semantic HTML, ARIA labels, focus rings, tabular numerals

---

## Architecture

The platform is a single-process ASGI application. FastAPI serves HTTP routes and Socket.IO is mounted alongside it as a combined ASGI app.

```
+------------------------------------------------------------------+
|                     PRESENTATION (React 19)                       |
|      Web · Light + Dark · Responsive · Keyboard shortcuts         |
+----------------------------+---------------------------------------+
                             | HTTPS + JWT
+----------------------------v---------------------------------------+
|               ASGI GATEWAY (FastAPI + Socket.IO)                   |
|          Auth · RBAC · Audit middleware · CORS                     |
+----------------------------+---------------------------------------+
                             |
          +------------------+------------------+
          |                  |                   |
    +-----v-----+      +-----v------+      +-----v------+
    | Analytics |      | Prediction |      |   Alerts   |
    |  Service  |      |  Service   |      |  Service   |
    +-----+-----+      +-----+------+      +-----+------+
          |                  |                   |
          +------------------+-------------------+
                             |
+----------------------------v---------------------------------------+
|                 DATA LAYER (SQLite / PostgreSQL)                   |
|          Row-level scope · Immutable audit tables                  |
+----------------------------+---------------------------------------+
                             |
          +------------------+------------------+
          |                  |                   |
    +-----v-----+      +-----v------+      +-----v------+
    |ML Pipeline|      |Notification|      |   Report   |
    | (XGBoost) |      |  Dispatch  |      |  Builder   |
    +-----------+      +------------+      +------------+
```

The ASGI wrapper is defined in `Backend/amr_nexus_ml/src/main.py`:

```python
combined_app = socketio.ASGIApp(socketio_server=sio, other_asgi_app=app)
```

This is what `uvicorn` is pointed at. It serves both HTTP and WebSocket traffic on the same port.

---

## Technology Stack

### Backend

| Component | Technology |
|---|---|
| Framework | FastAPI |
| Language | Python 3.11 |
| ORM | SQLAlchemy 2.x |
| Database | SQLite (dev) · PostgreSQL (prod) |
| Auth | JWT (python-jose) + bcrypt |
| Realtime | Socket.IO (python-socketio) |
| ML | XGBoost, scikit-learn, SHAP |
| ML Registry | MLflow (local tracking) |
| Server | Uvicorn (ASGI) |

### Frontend

| Component | Version |
|---|---|
| React | 19.2 |
| Vite | 8.0 |
| Tailwind CSS | 4.3 |
| TanStack Query | 5.102 |
| React Router | 7.x |
| Maps | React Leaflet + OpenStreetMap |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Export | jsPDF, html2canvas |

---

## Quick Start

### Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer

### Backend

```bash
cd Backend/amr_nexus_ml
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt

# Create the .env file (see Configuration below)
cp .env.example .env
# Edit .env and set SECRET_KEY

# Start the ASGI server
uvicorn src.main:combined_app --host 0.0.0.0 --port 8000
```

The backend serves at `http://localhost:8000`. The first launch creates the SQLite database, loads ML artifacts, and seeds a default admin:

```
Email:    admin@amrnexus.com
Password: ChangeMe123!
```

> Change this password immediately after first login.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend serves at `http://localhost:5173`.

---

## Configuration

All configuration lives in `.env` at the backend root (`Backend/amr_nexus_ml/.env`). Copy `.env.example` and edit:

```bash
cp Backend/amr_nexus_ml/.env.example Backend/amr_nexus_ml/.env
```

### Required

| Variable | Description |
|---|---|
| `SECRET_KEY` | Long random string used for JWT signing. Generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DATABASE_URL` | `sqlite:///./amr_data.db` (dev) or `postgresql://user:pass@host/db` (production) |
| `CORS_ORIGINS` | JSON list of allowed frontend origins |

> The backend will not start without `SECRET_KEY`. This is intentional — no fallback value exists in the source.

### Optional — Notifications

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default `587`) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password or app password |
| `SMTP_FROM` | Sender address |
| `AFRICASTALKING_USERNAME` | Africa's Talking username |
| `AFRICASTALKING_API_KEY` | Africa's Talking API key |
| `AT_SENDER_ID` | Registered sender ID |

> When SMTP or Africa's Talking credentials are missing, the notification dispatcher records the attempt with status `skipped` rather than failing — the platform stays functional.

---

## Project Structure

```
amr-nexus/
├── Backend/
│   └── amr_nexus_ml/
│       ├── src/
│       │   ├── api/
│       │   │   ├── deps.py                  # Auth and DB dependencies
│       │   │   ├── schemas.py               # Pydantic request/response models
│       │   │   └── routers/                 # Feature routers
│       │   │       ├── auth.py
│       │   │       ├── predictions.py
│       │   │       ├── analytics.py
│       │   │       ├── hotspots.py
│       │   │       ├── alerts.py
│       │   │       ├── reports.py
│       │   │       ├── audit.py
│       │   │       ├── admin_users.py
│       │   │       ├── user_actions.py
│       │   │       ├── analyst.py
│       │   │       ├── notifications.py
│       │   │       ├── guidance.py
│       │   │       ├── search.py
│       │   │       ├── ews.py
│       │   │       └── model_health.py
│       │   ├── core/
│       │   │   ├── config.py                # Settings (Pydantic BaseSettings)
│       │   │   ├── security.py              # JWT + bcrypt; loads .env at import
│       │   │   ├── ml.py                    # Shared ML artifact loader
│       │   │   └── audit_middleware.py      # Automatic audit trail
│       │   ├── db/
│       │   │   └── models.py                # SQLAlchemy models
│       │   ├── services/
│       │   │   ├── prediction_service.py    # ML inference + fallback
│       │   │   ├── shap_service.py          # Explainability
│       │   │   ├── notification_service.py  # Multi-channel dispatch
│       │   │   ├── email_service.py
│       │   │   ├── sms_service.py
│       │   │   ├── model_health.py          # Calibration, drift, fallback
│       │   │   ├── forecast_service.py
│       │   │   ├── forecast_utils.py
│       │   │   ├── geospatial_service.py
│       │   │   └── llm_service.py
│       │   ├── features/
│       │   │   └── preprocessing.py
│       │   ├── database.py
│       │   └── main.py                      # FastAPI + Socket.IO combined app
│       ├── scripts/
│       │   └── retrain.py                   # Manual retraining entry point
│       ├── saved_models/                    # ML artifacts (.pkl)
│       │   └── candidates/                  # Retrain candidates (not auto-promoted)
│       ├── requirements.txt
│       └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js
│   │   │   └── endpoints.js
│   │   ├── components/
│   │   │   ├── alerts/                      # Live alert components
│   │   │   ├── analytics/                   # Live analytics components
│   │   │   ├── auth/                        # Login, force password
│   │   │   ├── compare/
│   │   │   ├── dashboard/
│   │   │   ├── geo/                         # RegionDetailDrawer + per-page drawers
│   │   │   │   └── drawers/
│   │   │   ├── history/
│   │   │   ├── Layout/
│   │   │   ├── map/                         # Leaflet map components
│   │   │   ├── pathogen/
│   │   │   ├── predictions/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   └── ui/
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── design-system/
│   │   │   ├── tokens.css
│   │   │   ├── ThemeProvider.jsx
│   │   │   └── primitives/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── .editorconfig
├── .env.example
├── .gitignore
└── README.md
```

---

## Core Modules

### Authentication

- JWT-based with bcrypt password hashing
- Token version field invalidates all existing tokens when password changes, role changes, or account is disabled
- Force password change on first login and after admin reset
- `SECRET_KEY` is loaded from `.env` at import time inside `core/security.py`; if missing, the app refuses to start

### Prediction

Every isolate submission flows through:

```
Input -> Pydantic validation -> Feature engineering -> XGBoost inference
     -> SHAP explanation -> Anomaly detection -> Confidence tier
     -> Database record -> Prediction log -> Notification dispatch
```

The response carries two fields that make the execution path explicit:

- `source`: `"ml"` or `"fallback"`
- `fallback_used`: boolean

If the ML model is unavailable, a deterministic rule-based scorer runs. It is based on WHO-published risk factors (pathogen type, prior antibiotic exposure, sector, ward type) and is logged with `fallback_used: true`.

### Analytics

- Summary with previous-period comparison
- MDR trend (monthly)
- By pathogen, sector, county
- Sub-county MDR GeoJSON with coordinates
- `county_detail` endpoint: 95% Wilson CI, top pathogens, sector and specimen breakdowns, antibiotic-class resistance, recent isolates, delta vs national baseline
- Month range derived from live data

### Alerts

- Severity classification: Critical (anomaly + high MDR), High, Medium, Low
- Age-based escalation
- Real-time stream via Socket.IO
- Bulk acknowledge with confirmation
- Per-alert assignment, comments, and resolution notes

### Reports

Report generation produces Ministry of Health formatted output suitable for county and national distribution. Report types, layouts, and scheduling are documented on the Reports page in the app.

### Notifications

Multi-channel dispatch with per-user preferences:

- **In-app** — always on
- **Email** — SMTP, severity threshold per user
- **SMS** — Africa's Talking, severity threshold per user
- **Desktop** — browser notifications, permission-based

Every attempt is logged with recipient, status, error, and timestamp.

### Compliance

- Audit trail — every privileged action recorded
- Data subject export — CSV containing records and audit events for the requesting user
- Deletion request — logged and routed to admin review
- Privacy notice — DPA 2019 compliant

---

## API Reference

Interactive documentation: `http://localhost:8000/docs` (Swagger UI).

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Sign in, returns JWT |
| `GET` | `/me` | Current user profile |
| `POST` | `/user/change-password` | Change own password |
| `POST` | `/user/force-change-password` | Change on first login |
| `POST` | `/user/logout-all` | Invalidate all sessions |

### Predictions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/predict` | Submit isolate, get MDR prediction (`source`, `fallback_used` included) |
| `GET` | `/predictions` | Paginated history with filters |
| `GET` | `/predictions/stats` | Summary statistics |
| `GET` | `/predictions/{id}` | Full record detail |
| `PATCH` | `/predictions/{id}/outcome` | Confirm laboratory outcome |
| `GET` | `/predictions/confirmed-stats` | Accuracy from confirmed outcomes |
| `DELETE` | `/predictions/{id}` | Delete record (admin) |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/analytics/summary` | Aggregated metrics |
| `GET` | `/analytics/mdr_trend` | Monthly MDR trend |
| `GET` | `/analytics/by_pathogen` | Resistance by pathogen |
| `GET` | `/analytics/by_sector` | MDR by sector |
| `GET` | `/analytics/county_mdr` | County-level rates |
| `GET` | `/analytics/sub_county_mdr` | Sub-county GeoJSON |
| `GET` | `/analytics/dashboard_summary` | With previous period |
| `GET` | `/analytics/county_detail` | Per-county medical panel under filters |
| `GET` | `/analytics/pathogens` | Pathogen list |
| `GET` | `/analytics/pathogens/{code}` | Pathogen detail |
| `GET` | `/analytics/compare_periods` | Two-period comparison |
| `GET` | `/analytics/glass_indicators` | WHO GLASS priority |

### Alerts

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/alerts` | Filtered list |
| `GET` | `/alerts/stats` | Severity counts |
| `PATCH` | `/alerts/{id}/acknowledge` | Mark acknowledged |
| `PATCH` | `/alerts/{id}/resolve` | Resolve with note |
| `PATCH` | `/alerts/{id}/assign` | Assign to reviewer |
| `POST` | `/alerts/bulk-acknowledge` | Bulk action |

### Machine Learning

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/ml/model-card` | Model card metadata |
| `GET` | `/ml/registry` | Version history |
| `GET` | `/ml/active` | Active model |
| `GET` | `/ml/performance` | Live metrics from confirmed outcomes |
| `GET` | `/ml/calibration` | Calibration curve |
| `GET` | `/ml/drift` | Feature drift |
| `GET` | `/ml/recent-predictions` | Prediction log |

### Administration

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/users` | List users |
| `POST` | `/admin/users` | Create user |
| `PATCH` | `/admin/users/{id}` | Update user |
| `POST` | `/admin/users/{id}/reset-password` | Reset password |
| `DELETE` | `/admin/users/{id}` | Disable user |
| `GET` | `/audit/events` | Audit log |
| `GET` | `/audit/stats` | Audit summary |

### Notifications

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/notifications/preferences` | Own preferences |
| `PATCH` | `/notifications/preferences` | Update preferences |
| `GET` | `/notifications/status` | Channel availability |
| `POST` | `/notifications/send` | Manual send (admin) |
| `GET` | `/notifications/log` | Delivery log |

---

## Machine Learning

### Model

- **Algorithm:** XGBoost gradient boosted trees
- **Task:** Binary classification of multidrug resistance
- **Output:** Probability between 0 and 1, plus a confidence tier
- **Explainability:** SHAP values per prediction
- **Anomaly detection:** Isolation Forest on SVD-reduced features

### Response contract

Every prediction carries:

- `mdr_probability`: float
- `mdr_flag`: boolean (threshold 0.5)
- `confidence_tier`: string
- `shap_top_feature`, `shap_value`, `shap_summary`
- `source`: `"ml"` or `"fallback"`
- `fallback_used`: boolean

When the model cannot be loaded or inference fails, the fallback scorer returns a value between 0.15 and 0.95 and the response is clearly labelled.

### Feedback loop

Every prediction is logged. When a clinician confirms the actual laboratory outcome through `PATCH /predictions/{id}/outcome`, that record becomes a training signal. Calibration and live-performance metrics are computed from the confirmed subset.

Automated retraining is not scheduled. To retrain manually:

```bash
cd Backend/amr_nexus_ml
python scripts/retrain.py --dry-run     # report confirmed count and class balance
python scripts/retrain.py --min-rows 50 # write candidate if enough confirmed rows
python scripts/retrain.py --promote     # swap candidate into production (with backup)
```

Candidates are written to `saved_models/candidates/<timestamp>/`. Production artifacts at `saved_models/*.pkl` are only replaced when `--promote` is passed, at which point the previous artifacts are copied to `saved_models/backup/<timestamp>/`.

### Model performance

Live performance metrics are exposed at `GET /ml/performance` and rendered on the Model Health page. Those values are computed from confirmed outcomes and reflect the current data, not a snapshot recorded in this document.

### Champion / challenger

The candidate-directory pattern provides a manual champion/challenger workflow: a new model is trained and written to a candidate directory; after comparing validation metrics, the operator promotes it with `--promote` or discards it. An automated promotion gate is not implemented.

---

## Security & Compliance

### Kenya Data Protection Act 2019

| Requirement | Implementation |
|---|---|
| Data minimisation | No patient names, national IDs, or direct identifiers collected |
| Pseudonymisation | Records keyed by random UUID, not patient identifiers |
| Right to access | Settings → Privacy & Data → Download my data |
| Right to erasure | Settings → Privacy & Data → Request account deletion |
| Privacy notice | `/privacy` page |
| Audit trail | Every privileged action logged with actor, IP, timestamp |
| Breach response | Structured 72-hour notification workflow |
| ODPC registration | Deploying organisation must register as data controller |

### Security controls

- **Authentication:** JWT with bcrypt password hashing
- **Authorisation:** Role-based access control (admin, analyst, clinician, viewer)
- **Session management:** Token versioning invalidates all tokens on password change, role change, or account disable
- **Secrets:** Environment variables only; `.env` is excluded from version control; the app fails hard if `SECRET_KEY` is missing
- **Input validation:** Pydantic strict mode on all endpoints
- **CORS:** Restricted to specific frontend origins
- **Audit:** Every mutation logged automatically
- **Transport:** TLS in production (recommended at the reverse proxy)

### Medical safety

- Every prediction carries a "Decision support only — not a diagnosis" disclaimer
- Confidence tiers clearly flag borderline predictions
- Fallback predictions are labelled distinctly and logged with `fallback_used: true`
- The model card documents intended use, limitations, and fairness considerations

---

## Development

### Local setup

```bash
# Backend
cd Backend/amr_nexus_ml
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS / Linux
pip install -r requirements.txt
uvicorn src.main:combined_app --host 0.0.0.0 --port 8000 --log-level info

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Code style

- **Backend:** PEP 8, type hints on public functions, docstrings on modules
- **Frontend:** Functional components with hooks; no class components
- **Commits:** Present tense, imperative mood ("Add user management" not "Added")

### Branching

- `main` — stable
- `feature/<name>` — new features
- `fix/<name>` — bug fixes
- `hotfix/<name>` — production fixes

---

## Roadmap

The following items are designed but not yet built or automated:

- **Automated retraining schedule** — run `scripts/retrain.py` on a cadence once a threshold of confirmed outcomes exists
- **Champion/challenger gate** — compare candidate vs production metrics automatically and promote only on improvement
- **Model registry population** — record every promoted version with metrics, timestamp, and operator
- **Drift snapshot job** — write daily drift snapshots to the database for trend analysis
- **Container deployment** — Dockerfile and `docker-compose.yml` for the backend and frontend
- **Backup scripts** — scheduled SQLite hot-copy with rotation
- **Smoke-test scripts** — end-to-end checks for CI
- **Deployment guide** — `README-DEPLOY.md` covering server setup, HTTPS, and DPA registration

---

## Contributing

This is a Ministry of Health supervised project. Contributions are accepted via pull request to `main` with the following requirements:

- Backend changes must not break existing API contracts
- Frontend changes must pass `npm run build` with zero errors
- New endpoints must have Pydantic schemas
- New UI must be WCAG AA compliant in both light and dark modes
- Security-impacting changes require a second reviewer

---

## License

Proprietary. Republic of Kenya, Ministry of Health.

All rights reserved. Redistribution, modification, or commercial use without written permission is prohibited.

---

## Contact

| Purpose | Contact |
|---|---|
| Technical support | tech@amrnexus.org |
| Data Protection Officer | dpo@amrnexus.org |
| Ministry of Health | amr@health.go.ke |
| ODPC | complaints@odpc.go.ke |

<div align="center">

**Built for Kenya · Deployed in Kenya · Serving Kenya**

Data Protection Act 2019 compliant · WHO GLASS aligned

</div>
