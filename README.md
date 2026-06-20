# AMR-Nexus - Full-Stack AMR Surveillance Platform

**Production-grade - Offline-first - AI-powered - One Health**

[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688.svg)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://python.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-ML-orange.svg)](https://xgboost.ai)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://docker.com)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)

---

## Project Overview

AMR-Nexus is a full-stack, AI-powered platform for antimicrobial resistance (AMR) surveillance and prediction.

It combines:

- XGBoost for MDR prediction
- Isolation Forest for anomaly detection
- SHAP for explainability
- Real-time alerts via WebSocket and SMS
- Offline-first PWA with IndexedDB drafts
- Claude-powered stewardship guidance
- Interactive county heatmap
- Role-based dashboards (National / County)

Designed for:
- Epidemiologists
- Laboratory technicians
- Veterinary officers
- Public health agencies
- National AMR coordinators

---

## Key Differentiators

| Feature | Description |
|---------|-------------|
| ML Interpretability | SHAP values explain every prediction in plain language |
| Offline-first | IndexedDB drafts + service worker caching; sync when online |
| Real-time Alerts | WebSocket pushes anomalies + SMS notifications (Africa's Talking) |
| Role-based Views | National vs County dashboards with filtered data |
| Decision Support | Claude API generates role-specific stewardship recommendations |
| Professional UX | Dark mode, keyboard shortcuts, glass-morphic design |
| Production-ready | Dockerised, CI/CD friendly, scalable |

---

## Architecture

```
+----------------------------------------------------------------+
|                        Browser / PWA                            |
|  React 19 | Vite | Zustand | Recharts | Socket.IO Client        |
+---------------------------+--------------------------------------+
                            |
                    HTTP / WebSocket
                            |
                            v
+----------------------------------------------------------------+
|                  FastAPI Backend (Uvicorn)                      |
|                                                                  |
|  - REST APIs (25+ endpoints)                                    |
|  - Socket.IO server (real-time alerts)                          |
|  - Background tasks (email/SMS reports)                         |
|  - SQLAlchemy ORM (PostgreSQL / SQLite)                         |
+---------------+--------------------------------+----------------+
                |                                 |
                v                                 v
+---------------------------+      +---------------------------+
|         ML Models          |      |        PostgreSQL          |
|  - XGBoost                 |      |  - Predictions              |
|  - Isolation Forest        |      |  - Alerts                   |
|  - SHAP Explainer          |      |  - Comments                 |
|  - Prophet (forecast)      |      |  - Risk Scores              |
+---------------------------+      +---------------------------+
```

---

## Technology Stack

| Layer            | Technology                      |
| ---------------- | -------------------------------- |
| Frontend         | React 19, Vite, Tailwind CSS    |
| State Management | Zustand                         |
| Forms            | React Hook Form + Zod           |
| Charts           | Recharts                        |
| Backend          | FastAPI, Uvicorn, SQLAlchemy    |
| Authentication   | JWT-ready (python-jose)         |
| ML & Forecasting | XGBoost, SHAP, Isolation Forest, Prophet, LinearRegression |
| Data Processing  | Pandas, NumPy                   |
| Database         | PostgreSQL / SQLite             |
| Real-Time        | Socket.IO                       |
| SMS              | Africa's Talking                |
| LLM Guidance     | Claude API (Anthropic)          |
| PDF Generation   | reportlab, jsPDF (frontend)     |
| Infrastructure   | Docker + Docker Compose         |

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL (optional - SQLite works out of the box)

---

### 1. Clone Repository

```bash
git clone https://github.com/your-org/amr-nexus.git
cd amr-nexus
```

### 2. Backend Setup

```bash
cd backend/amr_nexus_ml
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` file:

```ini
DATABASE_URL=sqlite:///./amr.db
MODEL_DIR=./models
```

Place trained ML models (`*.pkl`) in `models/`.

Create database tables:

```bash
python -c "from src.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

Start backend:

```bash
python serve.py
```

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd ../../Frotend   # adjust to your frontend folder
npm install
```

Create `.env`:

```ini
VITE_API_URL=http://localhost:8000
```

Start frontend:

```bash
npm run dev
```

Frontend: http://localhost:5173

### 4. (Optional) Offline PWA Testing

```bash
npm run build
npx serve dist -s
```

---

## Project Structure (Key Files)

```
amr-nexus/
├── backend/
│   └── amr_nexus_ml/
│       ├── src/
│       │   ├── api/
│       │   │   └── app.py               # all endpoints
│       │   ├── db_models.py             # SQLAlchemy models
│       │   ├── features/                # preprocessing
│       │   ├── utils/                   # config, logger
│       │   └── database.py              # DB session
│       ├── models/                      # .pkl files
│       ├── serve.py                     # ASGI + Socket.IO entry
│       └── requirements.txt
├── frontend/
│   └── Frotend/
│       ├── src/
│       │   ├── api/                     # client.js
│       │   ├── components/              # UI components
│       │   ├── pages/                   # route components
│       │   ├── hooks/                   # custom hooks
│       │   ├── stores/                  # Zustand stores
│       │   ├── utils/                   # helpers
│       │   └── main.jsx
│       ├── public/                      # static assets, sw.js
│       ├── tailwind.config.js
│       └── package.json
└── docker-compose.yml
```

---

## Core API Endpoints (selected)

| Method | Endpoint | Description |
|--------|----------|--------------|
| POST   | /predict | MDR prediction + SHAP + store |
| GET    | /predictions | Paginated history |
| DELETE | /predictions/{record_id} | Delete a record |
| GET    | /analytics/summary | Aggregated metrics |
| GET    | /analytics/mdr_trend | Monthly trend |
| GET    | /analytics/by_pathogen | Pathogen resistance |
| GET    | /analytics/by_sector | MDR % by sector |
| GET    | /analytics/top_counties | Highest MDR counties |
| GET    | /analytics/county_mdr | Per-county rates (heatmap) |
| GET    | /analytics/pathogen_trend | Pathogen-specific trend |
| GET    | /analytics/risk_scores | Risk scores per county/pathogen |
| GET    | /forecast/trend | Prophet forecast |
| GET    | /alerts | Active alerts |
| GET    | /alerts/count | Unacknowledged count |
| GET    | /search?q= | Global search |
| POST   | /guidance | Claude-generated guidance |
| GET    | /ews/forecast | County-level MDR forecast |
| GET    | /export/predictions | Full CSV export |
| POST   | /reports/email | Schedule email report |

---

## Frontend Features (page by page)

| Route | Features |
|-------|----------|
| / | Dashboard - metrics, trend, anomaly feed, county heatmap, system health |
| /predict | Offline drafts, speech-to-text, barcode, SHAP explanation, stewardship recommendation |
| /analytics | Interactive charts, date filters, forecast overlay, heatmap |
| /history | Paginated table, bulk actions, column customisation, compare modal |
| /alerts | Real-time anomalies, acknowledge, filter, export CSV |
| /reports | Generate custom reports, CSV/PDF export, email scheduling |
| /settings | Profile, notifications, API keys, backup/restore, offline sync |
| /pathogen-explorer | Drill-down by pathogen: resistance per antibiotic, trend, heatmap |
| /bulk-import | Upload Excel/CSV with predictions |
| /compare-analytics | Side-by-side date range comparison |
| /data-quality | Completeness metrics |

---

## Integration Testing

Health check

```bash
curl http://localhost:8000/health
```

Browser console test

```js
fetch('http://localhost:8000/predictions')
  .then(r => r.json())
  .then(console.log)
```

Submit a test prediction

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sector": "ANIMAL",
    "sub_sector": "Poultry-Broiler",
    "pathogen_code": "eco",
    "specimen_type": "Cloacal swab",
    "county": "Nairobi",
    "antibiotic_class": "Fluoroquinolone",
    "test_method": "Disk diffusion",
    "sample_month": 6
  }'
```

Test all endpoints (PowerShell)

```powershell
.\test-all.ps1   # see project root for the script
```

---

## Docker Deployment

`docker-compose.yml`

```yaml
version: '3'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: amr_db
      POSTGRES_USER: amr_user
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
  backend:
    build: ./backend/amr_nexus_ml
    ports:
      - "8000:8000"
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://amr_user:secret@db:5432/amr_db
  frontend:
    build: ./frontend/Frotend
    ports:
      - "80:80"
volumes:
  pgdata:
```

Build and run

```bash
docker-compose up -d
```

---

## Environment Variables

Backend `.env`

```ini
DATABASE_URL=postgresql://user:pass@localhost/amr_db
MODEL_DIR=./models
AT_USERNAME=sandbox
AT_API_KEY=your_africastalking_key
AT_SENDER_ID=AMRNexus
CLAUDE_API_KEY=your_claude_key
ENABLE_SMS=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=reports@amrnexus.org
SMTP_PASS=******
```

Frontend `.env`

```ini
VITE_API_URL=http://localhost:8000
```

---

## License

```
Proprietary - AMR-Nexus One Health Project

All rights reserved.
For internal research and public health use only.
```

---

## Contributors

| Role | Responsibility |
|------|------------------|
| Senior Developer | Full-stack architecture, DevOps, integration |
| ML Engineer | Model training, SHAP, Prophet, risk scoring |
| Frontend Developer | UI/UX, PWA, offline sync, charts |

---

## Current Status (June 2026)

- MVP ready for July 14, 2026 demonstration.
- Synthetic data backbone with 500+ records, 5+ counties.
- AI Early Warning Engine: trend analysis, anomaly detection, risk scores, heatmap, SHAP.
- Decision-Support Layer: Claude-powered guidance, role-based views.
- Real-time alerts (WebSocket + SMS sandbox).
- Offline-capable PWA.
- Full reporting and export.

---

## Contact

For technical support or collaboration:

- Email: your-email@amrnexus.org
- Repository: internal Git URL

Built for antimicrobial stewardship and One Health surveillance.
Last updated: 2026-06-21
