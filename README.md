#  AMR-Nexus – Full-Stack AMR Surveillance Platform

### lowell owuor  README

> **Production-grade • Offline-first • AI-powered • One Health**

[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688.svg)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://python.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-ML-orange.svg)](https://xgboost.ai)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://docker.com)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)

---

#  Project Overview

AMR-Nexus is an enterprise-grade, end-to-end platform for antimicrobial resistance (AMR) surveillance and prediction.

The system combines:

*  React + Vite frontend
*  FastAPI backend
*  XGBoost MDR prediction
*  Isolation Forest anomaly detection
*  SHAP explainability
*  Real-time alert streaming
*  Offline-first PWA capabilities

Designed for:

* Epidemiologists
* Laboratory technicians
* Veterinary officers
* Public health agencies
* National surveillance teams

---

#  Key Differentiators

| Feature                | Description                               |
| ---------------------- | ----------------------------------------- |
|  ML Interpretability | SHAP values explain every prediction      |
|  Offline-first       | IndexedDB drafts + service worker caching |
|  Real-time Alerts    | WebSocket anomaly notifications           |
|  Professional UX     | Dark mode, shortcuts, glassmorphism       |
|  Production-ready    | Dockerised & CI/CD friendly               |

---

#  Architecture

```text id="g0nrlf"
┌────────────────────────────────────────────────────────────┐
│                    Browser / PWA                          │
│ React 19 │ Vite │ Zustand │ Recharts │ Socket.IO Client  │
└───────────────────────┬────────────────────────────────────┘
                        │
                 HTTP / WebSocket
                        │
                        ▼
┌────────────────────────────────────────────────────────────┐
│                FastAPI Backend (Uvicorn)                  │
│                                                            │
│ • REST APIs                                                │
│ • Socket.IO server                                         │
│ • Background tasks                                         │
│ • SQLAlchemy ORM                                           │
└──────────────┬───────────────────────────────┬─────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│      ML Models           │   │       PostgreSQL         │
│ • XGBoost                │   │ • Predictions            │
│ • Isolation Forest       │   │ • Alerts                 │
│ • SHAP Explainer         │   │ • Comments               │
└──────────────────────────┘   └──────────────────────────┘
```

---

#  Technology Stack

| Layer            | Technology                      |
| ---------------- | ------------------------------- |
| Frontend         | React 19, Vite, Tailwind CSS    |
| State Management | Zustand                         |
| Forms            | React Hook Form + Zod           |
| Charts           | Recharts                        |
| Backend          | FastAPI, Uvicorn, SQLAlchemy    |
| Authentication   | JWT-ready (python-jose)         |
| Machine Learning | XGBoost, SHAP, Isolation Forest |
| Data Processing  | Pandas, NumPy                   |
| Database         | PostgreSQL / SQLite             |
| Real-Time        | Socket.IO                       |
| PDF Generation   | reportlab                       |
| Infrastructure   | Docker + Docker Compose         |

---

#  Quick Start (Local Development)

##  Prerequisites

* Node.js 18+
* Python 3.11+
* PostgreSQL (optional)

---

# 1️⃣ Clone Repository

```bash id="9n8v13"
git clone https://github.com/your-org/amr-nexus.git

cd amr-nexus
```

---

# 2️⃣ Backend Setup

## Create Virtual Environment

```bash id="d80tsn"
cd backend/amr_nexus_ml

python -m venv venv
```

### Linux / macOS

```bash id="kg4e0o"
source venv/bin/activate
```

### Windows

```bash id="cd6ydv"
venv\Scripts\activate
```

---

## Install Dependencies

```bash id="ryo8yq"
pip install -r requirements.txt
```

---

## Configure Environment Variables

Create `.env`

```ini id="4kr5qz"
DATABASE_URL=sqlite:///./amr.db

MODEL_DIR=./models
```

---

## Load Trained Models

Place these files in:

```text id="uw4xg8"
backend/amr_nexus_ml/models/
```

| File                  | Description             |
| --------------------- | ----------------------- |
| `mdr_xgb.pkl`         | XGBoost classifier      |
| `anomaly_iso.pkl`     | Isolation Forest        |
| `preprocessor.pkl`    | Feature preprocessor    |
| `feature_names.pkl`   | Feature list            |
| `numeric_indices.pkl` | Numeric feature indices |
| `shap_explainer.pkl`  | SHAP explainer          |

---

## Create Database Tables

```bash id="0ujl4y"
python -c "from src.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

---

## Start Backend

```bash id="c57gl6"
python serve.py
```

Backend URL:

```text id="x6zwu7"
http://localhost:8000
```

Swagger Docs:

```text id="78xkzc"
http://localhost:8000/docs
```

---

# 3️⃣ Frontend Setup

```bash id="a8mqwn"
cd ../../frontend/Frotend

npm install
```

---

## Configure Frontend Environment

Create `.env`

```ini id="u6bfec"
VITE_API_URL=http://localhost:8000
```

---

## Start Frontend

```bash id="thk2qj"
npm run dev
```

Frontend URL:

```text id="6g1wxg"
http://localhost:5173
```

---

# 4️⃣ Optional PWA Testing

Build production version:

```bash id="0lrq9u"
npm run build
```

Serve locally:

```bash id="a5vq9y"
npx serve dist -s
```

---

#  Project Structure

```text id="xk0v13"
amr-nexus/
├── backend/
│   └── amr_nexus_ml/
│       ├── src/
│       │   ├── api/
│       │   │   └── app.py
│       │   ├── db_models.py
│       │   ├── features/
│       │   ├── utils/
│       │   └── database.py
│       │
│       ├── models/
│       ├── serve.py
│       └── requirements.txt
│
├── frontend/
│   └── Frotend/
│       ├── src/
│       │   ├── api/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   ├── stores/
│       │   ├── utils/
│       │   └── main.jsx
│       │
│       ├── public/
│       ├── tailwind.config.js
│       └── package.json
│
└── docker-compose.yml
```

---

#  Core API Endpoints

| Method | Endpoint                   | Description                  |
| ------ | -------------------------- | ---------------------------- |
| POST   | `/predict`                 | Run MDR prediction           |
| GET    | `/predictions`             | Paginated prediction history |
| DELETE | `/predictions/{record_id}` | Delete prediction            |
| GET    | `/analytics/summary`       | Aggregated metrics           |
| GET    | `/analytics/mdr_trend`     | MDR trend                    |
| GET    | `/analytics/by_pathogen`   | Pathogen resistance          |
| GET    | `/analytics/by_sector`     | Sector MDR rates             |
| GET    | `/analytics/top_counties`  | High MDR counties            |
| GET    | `/analytics/county_mdr`    | County MDR map               |
| GET    | `/alerts`                  | Active alerts                |
| GET    | `/alerts/count`            | Alert counts                 |
| GET    | `/search?q=`               | Global search                |
| GET    | `/ews/forecast`            | County MDR forecast          |

---

#  Frontend Features

| Route                | Features                           |
| -------------------- | ---------------------------------- |
| `/`                  | Dashboard + anomaly feed           |
| `/predict`           | Offline drafts + SHAP explanations |
| `/analytics`         | Interactive charts                 |
| `/history`           | Bulk actions + comparison modal    |
| `/alerts`            | Real-time alerts                   |
| `/reports`           | CSV/PDF export                     |
| `/settings`          | Notifications + backup             |
| `/pathogen-explorer` | Pathogen drill-down                |
| `/bulk-import`       | CSV/Excel upload                   |
| `/compare-analytics` | Date range comparison              |
| `/data-quality`      | Completeness metrics               |

---

#  Integration Testing

## Health Check

```bash id="4zh7eu"
curl http://localhost:8000/health
```

---

## Browser Console Test

```javascript id="5v1kkm"
fetch('http://localhost:8000/predictions')
  .then(r => r.json())
  .then(console.log)
```

---

## Sample Prediction Request

```bash id="2e70t5"
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

---

#  Docker Deployment

## docker-compose.yml

```yaml id="vyl7zj"
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

---

## Build & Run

```bash id="fgbh9h"
docker-compose up -d
```

---

#  Environment Variables

## Backend `.env`

```ini id="sgx43q"
DATABASE_URL=postgresql://user:pass@localhost/amr_db

MODEL_DIR=./models

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=reports@amrnexus.org
SMTP_PASS=******
```

---

## Frontend `.env`

```ini id="hmt9ci"
VITE_API_URL=http://localhost:8000
```

---

#  License

```text id="1w7t2j"
Proprietary – AMR-Nexus One Health Project

All rights reserved.

For internal research and public health use only.
```

---

# Contributors

| Role               | Responsibility                   |
| ------------------ | -------------------------------- |
| Senior Developer   | Full-stack architecture & DevOps |
| ML Engineer        | Model training & explainability  |
| Frontend Developer | PWA + offline sync               |

---


---

#  Mission

AMR-Nexus is built to strengthen antimicrobial stewardship and One Health surveillance through:

* Explainable AI
* Early warning systems
* Offline-first data collection
* Real-time anomaly detection
* Actionable public health intelligence

---

##  Last Updated

```text id="9s7u8o"
2026-06-09
```
