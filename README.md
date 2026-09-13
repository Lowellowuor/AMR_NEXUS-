# AMR Nexus

**Antimicrobial Resistance Surveillance Platform · Republic of Kenya**

[![Status](https://img.shields.io/badge/status-production--ready-success)]()
[![License](https://img.shields.io/badge/license-Proprietary-red)]()
[![Compliance](https://img.shields.io/badge/DPA%202019-compliant-blue)]()
[![WHO GLASS](https://img.shields.io/badge/WHO%20GLASS-aligned-green)]()

---

AMR Nexus is a national surveillance and clinical decision support platform for antimicrobial resistance (AMR) in Kenya. It ingests isolate-level data from health facilities, laboratories, veterinary sites, and environmental surveillance points, and provides early warning, predictive analytics, and Ministry of Health compliant reporting — all under a single, secure, auditable system.

---

## Table of Contents

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
- [Deployment](#deployment)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Antimicrobial resistance is one of the most urgent public health threats of the 21st century. In Kenya, the Ministry of Health has identified AMR surveillance as a national priority under the Kenya AMR National Action Plan and its commitment to the WHO Global Antimicrobial Resistance and Use Surveillance System (GLASS).

AMR Nexus provides the technical infrastructure to support this mission:

- **Surveillance** — aggregate and visualize resistance patterns across all 47 counties and 290+ sub-counties
- **Prediction** — machine-learning based estimation of multidrug resistance (MDR) with explainability
- **Early warning** — real-time detection of anomalies and high-risk isolates with configurable alerting
- **Reporting** — Ministry of Health compliant PDF and CSV reports aligned with GLASS indicators
- **Governance** — full audit trail and Data Protection Act 2019 compliant data subject rights

The platform is designed for **self-hosted, on-premise deployment** within Kenya, in line with data sovereignty requirements.

---

## Key Features

### Clinical

- **MDR prediction** with SHAP explainability — every prediction shows *why* it was made
- **Confidence tiers** — High / Moderate / Borderline with calibration-aware messaging
- **Antimicrobial stewardship tips** — WHO AWaRe classification (Access / Watch / Reserve)
- **Similar past cases** — automatic lookup of related isolates
- **Laboratory confirmation loop** — clinicians confirm outcomes; model self-calibrates over time
- **Clinical guidance** — deterministic narrative generation from surveillance data

### Surveillance

- **Interactive choropleth map** — sub-county MDR rates with drill-down
- **Facility-level hotspots** — aggregated by reporting site with detailed panel
- **Time slider** — animated month-by-month evolution of resistance
- **Pathogen explorer** — 5-tab deep dive with geographic, resistance, trend, and recent views
- **Period comparison** — side-by-side delta across any two date ranges or scopes
- **GLASS indicator strip** — E. coli, Klebsiella pneumoniae, Staphylococcus aureus

### Alerts & Notifications

- **Real-time alert stream** via Socket.IO
- **Severity triage** — Critical / High / Medium / Low with colour-coded cards
- **Age tracking** — automatic escalation by time elapsed since detection
- **Bulk acknowledge** — fast triage for outbreak scenarios
- **Multi-channel delivery** — in-app, email (SMTP), SMS (Africa's Talking), desktop browser notifications
- **Per-user preferences** — severity thresholds per channel
- **Notification log** — every delivery attempt recorded for audit

### Machine Learning Operations

- **Model registry** — version tracking with metrics, algorithm, and activation state
- **Prediction log** — every inference recorded with features, latency, and outcome
- **Calibration curve** — predicted vs lab-confirmed outcomes
- **Feature drift detection** — symmetric total variation across 5 dimensions
- **Live performance** — accuracy, sensitivity, specificity, PPV, NPV computed from confirmed outcomes
- **Fallback logic** — deterministic rule-based risk score if model unavailable

### Administration

- **User management** — create, disable, reset passwords, assign roles and counties
- **Role-based access control** — admin, analyst, clinician, viewer
- **Force password change** — on first login and after admin reset
- **Session invalidation** — "sign out everywhere" and automatic invalidation on role change
- **Audit log** — every privileged action recorded with actor, IP, and result
- **Data subject rights** — DPA 2019 export and deletion request workflows

### Design & UX

- **Light mode** — LinkedIn-inspired neutral palette, calm and readable
- **Dark mode** — deep navy medical-grade theme, WCAG AA compliant
- **Responsive** — mobile-first, tested from 375 px to 4K
- **Keyboard shortcuts** — `/`, `g` sequences, `r`, `e`, `c`
- **Print & PDF** — clean print stylesheets for every report and record
- **Accessibility** — semantic HTML, ARIA labels, focus rings, tabular numerals

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     PRESENTATION (React 19)                        │
│      Web · PWA · Light + Dark · Responsive · Offline-capable       │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS + JWT
┌────────────────────────────▼─────────────────────────────────────┐
│                     API GATEWAY (FastAPI)                          │
│         Auth · RBAC · Rate limit · Audit · CORS                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                     │
  ┌─────▼─────┐        ┌─────▼─────┐        ┌──────▼─────┐
  │ Analytics │        │ Prediction │        │   Alerts   │
  │  Service  │        │  Service   │        │  Service   │
  └─────┬─────┘        └─────┬──────┘        └──────┬─────┘
        │                    │                       │
        └────────────────────┼───────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                DATA LAYER (SQLite / PostgreSQL)                    │
│      Encrypted at rest · Row-level scope · Immutable audit tables  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                     │
  ┌─────▼─────┐        ┌─────▼─────┐        ┌──────▼─────┐
  │ML Pipeline│        │ FHIR/HL7  │        │   DHIS2    │
  │ (XGBoost) │        │  Bridge   │        │ Connector  │
  └───────────┘        └───────────┘        └────────────┘
```

---

## Technology Stack

### Backend

| Component | Technology |
|---|---|
| Framework | FastAPI 0.115+ |
| Language | Python 3.11 |
| ORM | SQLAlchemy 2.x |
| Database | SQLite (dev) · PostgreSQL (prod) |
| Auth | JWT (python-jose) + bcrypt |
| Realtime | Socket.IO (python-socketio) |
| ML | XGBoost, scikit-learn, SHAP |
| ML Registry | MLflow |
| Server | Gunicorn + Uvicorn workers |

### Frontend

| Component | Technology |
|---|---|
| Framework | React 19 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 + CSS variables |
| State | TanStack Query + Zustand |
| Maps | React Leaflet + OpenStreetMap |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Icons | Heroicons + Lucide |
| Export | jsPDF, html2canvas, SheetJS |

### Infrastructure

| Component | Technology |
|---|---|
| Container | Docker + Docker Compose |
| Web server | Nginx |
| Reverse proxy | Caddy (HTTPS) |
| Backups | SQLite hot copy + gzip |
| Monitoring | Structured logging + audit trail |

---

## Quick Start

### Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- Docker 24+ (for containerised deployment)
- 4 vCPU, 8 GB RAM, 40 GB SSD (minimum)

### Backend

```bash
cd Backend/amr_nexus_ml
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python -m src.main
```

Backend serves at `http://localhost:8000`.

The first launch creates the database, loads ML artifacts, and seeds a default admin:

```
Email:    admin@amrnexus.com
Password: ChangeMe123!
```

> Change this password immediately. The system will force a change on first login if configured to do so.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend serves at `http://localhost:5173`.

### Production (Docker)

```bash
cp .env.example .env
# Edit .env and set SECRET_KEY (see Configuration below)
docker compose up -d --build
```

Full deployment guide: [`README-DEPLOY.md`](./README-DEPLOY.md)

---

## Configuration

All configuration lives in `.env` at the repository root. Copy `.env.example` and edit:

```bash
cp .env.example .env
```

### Required

| Variable | Description |
|---|---|
| `SECRET_KEY` | Long random string used for JWT signing. Generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `DATABASE_URL` | `sqlite:////data/amr_data.db` (container) or `postgresql://user:pass@host/db` (production) |
| `CORS_ORIGINS` | JSON list of allowed frontend origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes (default: `480` = 8 hours) |

### Optional — Notifications

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server hostname (e.g., `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (default: `587`) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password or App Password |
| `SMTP_FROM` | Sender address |
| `AFRICASTALKING_USERNAME` | Africa's Talking username |
| `AFRICASTALKING_API_KEY` | Africa's Talking API key |
| `AFRICASTALKING_SENDER_ID` | Registered sender ID (e.g., `AMR_NEXUS`) |

> When SMTP or Africa's Talking credentials are missing, the notification dispatcher records the attempt with status `skipped` rather than failing — the platform remains fully functional.

---

## Project Structure

```
amr-nexus/
├── Backend/
│   └── amr_nexus_ml/
│       ├── src/
│       │   ├── api/
│       │   │   ├── deps.py                 # Dependencies (auth, db)
│       │   │   └── routers/                # Feature routers
│       │   │       ├── auth.py             # Login, token verification
│       │   │       ├── predictions.py      # Predict, history, outcomes
│       │   │       ├── analytics.py        # All analytics endpoints
│       │   │       ├── hotspots.py         # Facility-level aggregation
│       │   │       ├── alerts.py           # Alert CRUD + acknowledgment
│       │   │       ├── reports.py          # MoH report generation
│       │   │       ├── audit.py            # Audit log
│       │   │       ├── admin_users.py      # User management
│       │   │       ├── user_actions.py     # Password, export, delete
│       │   │       ├── analyst.py          # Medical Analyst Q&A
│       │   │       ├── notifications.py    # Notification dispatch + log
│       │   │       └── model_health.py     # ML metrics
│       │   ├── core/
│       │   │   ├── config.py               # Settings
│       │   │   ├── security.py             # JWT + bcrypt
│       │   │   └── audit_middleware.py     # Automatic audit trail
│       │   ├── db/
│       │   │   └── models.py               # SQLAlchemy models
│       │   ├── services/
│       │   │   ├── prediction_service.py   # ML inference
│       │   │   ├── shap_service.py         # Explainability
│       │   │   ├── notification_service.py # Multi-channel dispatch
│       │   │   ├── email_service.py        # SMTP
│       │   │   ├── sms_service.py          # Africa's Talking
│       │   │   ├── model_health.py         # Calibration, drift
│       │   │   └── forecast_utils.py       # Time-series
│       │   ├── database.py                 # Engine + session
│       │   └── main.py                     # FastAPI app
│       ├── models/                         # ML artifacts (.pkl)
│       ├── data/                           # Training data
│       ├── Dockerfile
│       └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js                   # Fetch wrapper
│   │   │   └── endpoints.js                # Named API functions
│   │   ├── components/
│   │   │   ├── alerts/                     # Alert UI
│   │   │   ├── analytics/                  # Analytics UI
│   │   │   ├── auth/                       # Login, force password
│   │   │   ├── compare/                    # Comparison UI
│   │   │   ├── dashboard/                  # Dashboard widgets
│   │   │   ├── history/                    # History UI
│   │   │   ├── Layout/                     # Shell (Header, Sidebar)
│   │   │   ├── map/                        # Maps and hotspots
│   │   │   ├── pathogen/                   # Pathogen Explorer
│   │   │   ├── predictions/                # Prediction forms
│   │   │   ├── reports/                    # Report UI
│   │   │   ├── settings/                   # Settings sections
│   │   │   └── ui/                         # Primitives
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx             # Auth provider
│   │   ├── design-system/
│   │   │   ├── tokens.css                  # Light + dark tokens
│   │   │   ├── ThemeProvider.jsx           # Theme context
│   │   │   └── primitives/                 # Button, Card, etc.
│   │   ├── hooks/                          # Shared hooks
│   │   ├── lib/                            # Utilities, config
│   │   ├── pages/                          # Top-level pages
│   │   ├── App.jsx                         # Routes
│   │   └── main.jsx                        # Entry point
│   ├── public/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── scripts/
│   ├── backup-db.sh
│   ├── backup-db.ps1
│   ├── smoke-test.sh
│   └── smoke-test.ps1
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
└── README-DEPLOY.md
```

---

## Core Modules

### Authentication

- JWT-based with bcrypt password hashing
- Token version field invalidates all existing tokens when:
  - Password changes
  - Role changes
  - Account disabled
- Force password change on first login and after admin reset
- Session tracking via audit log

### Prediction

Every isolate submission flows through:

```
Input → Validation → Feature engineering → XGBoost inference
     → SHAP explanation → Anomaly detection → Confidence tier
     → Database record → Prediction log → Notification dispatch
```

- **Fallback:** if the ML model is unavailable, a deterministic rule-based scorer runs so the platform never crashes
- **Feedback loop:** clinicians confirm lab outcomes; the model self-calibrates

### Analytics

- Summary with previous-period comparison
- MDR trend (monthly)
- By pathogen, sector, county
- Geographic distribution (sub-county GeoJSON)
- Month range derivation from live data

### Alerts

- Severity classification: Critical (anomaly + high MDR), High, Medium, Low
- Age-based escalation
- Real-time stream via Socket.IO
- Bulk acknowledge with confirmation
- Per-alert assignment, comments, resolution notes

### Reports

Three built-in report types:

| Report | Audience | Default scope |
|---|---|---|
| Weekly Epidemiological Summary | County health officer | National, 7 days |
| Monthly County AMR Report | County Director of Health | County, 30 days |
| Quarterly National AMR Report | Ministry of Health, WHO GLASS | National, 90 days |

Each report includes a standard MoH header, structured sections, and a decision-support disclaimer.

### Notifications

Multi-channel dispatch with per-user preferences:

- **In-app** — always on
- **Email** — SMTP, severity threshold per user
- **SMS** — Africa's Talking, severity threshold per user
- **Desktop** — browser notifications, permission-based

Every attempt is logged with recipient, status, error, and timestamp.

### Compliance

- Audit trail — every privileged action recorded
- Data subject export — CSV with records + audit events for the requesting user
- Deletion request — logged and routed to admin review
- Privacy notice — DPA 2019 compliant

---

## API Reference

Complete interactive documentation: `http://localhost:8000/docs` (Swagger UI)

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
| `POST` | `/predict` | Submit isolate, get MDR prediction |
| `GET` | `/predictions` | Paginated history with filters |
| `GET` | `/predictions/stats` | Summary statistics |
| `GET` | `/predictions/{id}` | Full record detail |
| `PATCH` | `/predictions/{id}/outcome` | Confirm lab outcome |
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
| `GET` | `/ml/performance` | Live metrics |
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
- **Task:** Binary classification — multidrug resistance
- **Output:** Probability between 0 and 1
- **Explainability:** SHAP values per prediction
- **Anomaly detection:** Isolation Forest on SVD-reduced features

### Performance (v1.0.0)

| Metric | Value |
|---|---|
| AUC-ROC | 0.86 |
| Sensitivity | 0.79 |
| Specificity | 0.81 |
| Precision | 0.77 |
| F1 score | 0.78 |
| Calibration error | 0.04 |

Full details: `/model-card` page or `GET /ml/model-card`

### Feedback Loop

Every prediction is logged. When a clinician confirms the actual laboratory outcome, that record becomes a training signal:

1. Model predicts MDR probability
2. Clinician confirms actual lab result
3. Confirmed outcome feeds calibration metrics
4. Accumulated confirmations trigger retraining
5. New model version registered
6. Champion / challenger comparison
7. Promotion on improvement

### Fallback

If the ML model is unavailable, a deterministic rule-based scorer provides a graceful degradation. This score is based on WHO-published risk factors (pathogen type, prior antibiotic exposure, sector, ward type) and is clearly labelled as fallback in the prediction log.

---

## Security & Compliance

### Kenya Data Protection Act 2019

| Requirement | Implementation |
|---|---|
| Data minimisation | No patient names, national IDs, or direct identifiers collected |
| Pseudonymisation | Records keyed by random UUID, not patient identifiers |
| Right to access | Settings → Privacy & Data → Download my data |
| Right to erasure | Settings → Privacy & Data → Request account deletion |
| Privacy notice | `/privacy` page, DPA-compliant |
| Audit trail | Every privileged action logged with actor, IP, timestamp |
| Breach response | Structured 72-hour notification workflow |
| ODPC registration | Deploying organisation must register as data controller |

### Security Controls

- **Authentication:** JWT with bcrypt password hashing
- **Authorisation:** Role-based access control (admin, analyst, clinician, viewer)
- **Session management:** Token versioning invalidates all tokens on password change, role change, or disable
- **Transport:** TLS 1.3 in production (Caddy or nginx)
- **Storage:** Encrypted at rest (recommended for production PostgreSQL)
- **Input validation:** Pydantic strict mode on all endpoints
- **Rate limiting:** Recommended via reverse proxy
- **CORS:** Restricted to specific frontend origins
- **Audit:** Every mutation logged automatically
- **Secrets:** Environment variables only, `.env` excluded from version control

### Medical Safety

- Every prediction carries a "Decision support only — not a diagnosis" disclaimer
- Confidence tiers clearly flag borderline predictions
- Fallback predictions are labelled distinctly
- Model card documents intended use, limitations, and fairness

---

## Deployment

See [`README-DEPLOY.md`](./README-DEPLOY.md) for the complete on-premise deployment guide, covering:

- Ubuntu 22.04 server setup
- Docker and Docker Compose installation
- HTTPS via Caddy with Let's Encrypt
- Database backup scheduling
- Security hardening checklist
- DPA 2019 registration steps
- Troubleshooting guide

### Deployment targets

- **Self-hosted on-premise** — Ministry of Health data centre
- **Kenya-hosted cloud** — Safaricom Cloud, iWayAfrica, or similar
- **Hybrid** — Primary on-premise, warm standby in Kenyan cloud

### Data sovereignty

All data must remain within the Republic of Kenya. The platform does not transmit data to any external service unless explicitly configured (SMTP, Africa's Talking).

---

## Development

### Local setup

```bash
# Backend
cd Backend/amr_nexus_ml
python -m venv venv
venv\Scripts\activate       # Windows
source venv/bin/activate    # macOS / Linux
pip install -r requirements.txt
python -m src.main

# Frontend (in a separate terminal)
cd frontend
npm install
npm run dev
```

### Code style

- **Backend:** PEP 8, type hints on public functions, docstrings on modules
- **Frontend:** ES2023, functional components with hooks, no class components
- **Commits:** Present tense, imperative mood ("Add user management" not "Added")

### Branching

- `main` — stable, deployable
- `feature/<name>` — new features
- `fix/<name>` — bug fixes
- `hotfix/<name>` — production fixes

---

## Testing

### Smoke test

```bash
# Windows
.\scripts\smoke-test.ps1

# macOS / Linux
./scripts/smoke-test.sh
```

Verifies: health, login, summary, dashboard, pathogens, alerts, audit, model card.

### Manual test paths

| Path | Expected |
|---|---|
| Sign in with wrong password | 401 error message |
| Sign in with correct password | Dashboard loads |
| Create user from admin | Temp password returned |
| Login with temp password | Force password change modal |
| Change password | Redirect to login |
| Login with new password | Dashboard loads |
| Submit prediction | Result card with confidence tier |
| Confirm lab outcome | Model Health stats update |
| Trigger anomaly | Alert appears in real-time |
| Search history | Filtered results |

---

## Contributing

This is a Ministry of Health supervised project. Contributions are accepted via pull request to `main` with the following requirements:

- Backend changes must not break existing API contracts
- Frontend changes must pass `npm run build` with zero errors
- New endpoints must have Pydantic schemas
- New UI must be WCAG AA compliant in both light and dark modes
- Security-impacting changes require a second reviewer

Contact the AMR Nexus surveillance team for contribution guidelines.

---

## License

Proprietary. Republic of Kenya, Ministry of Health.

All rights reserved. Redistribution, modification, or commercial use without written permission is prohibited.

---

## Acknowledgements

- Ministry of Health, Republic of Kenya — project sponsor
- KEMRI — reference laboratory data
- World Health Organization — GLASS alignment
- County health departments — surveillance reporting

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
