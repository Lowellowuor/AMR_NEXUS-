# AMR-Nexus One Health

**AI-Powered AMR Early Warning, Risk Assessment & Decision-Support Platform**

`Production-grade` · `Offline-first` · `Role-based` · `Explainable ML`

---

## Overview

AMR-Nexus is a full-stack, AI-driven platform for antimicrobial resistance (AMR) surveillance and prediction. It transforms fragmented AMR data into actionable intelligence for national policymakers, county clinicians, and veterinarians.

The system combines:

- **XGBoost** for multidrug resistance (MDR) probability prediction
- **Isolation Forest + TruncatedSVD** for anomaly detection with a learned threshold
- **SHAP** for model explainability
- **Gemini (or Claude)** for plain-language stewardship guidance and comparison explanations
- **Real-time alerts** via WebSocket and SMS (Africa's Talking)
- **Offline-first PWA** with IndexedDB drafts
- **Role-based dashboards** (National / County) with dynamic county selection
- **Interactive county heatmap** using backend-driven data
- **Compare predictions** with AI-generated difference summaries

---

## Key Features

| Module | Description |
|---|---|
| **Predict** | Accepts clinical/lab inputs, returns MDR probability, anomaly flag, SHAP explanation, and stewardship guidance. Supports barcode/QR scanning, speech-to-text, offline drafts. |
| **Anomaly Detection** | Isolation Forest trained on SVD-reduced features; threshold automatically derived from training data. No hardcoded rules. |
| **Explainability** | SHAP values computed for every prediction, presented as plain-language summary and top contributing factors. |
| **LLM Guidance** | Gemini API generates role-specific recommendations and compares two records in plain English. |
| **Surveillance Map** | County and sub-county choropleth using real GeoJSON from backend, current rates and difference mode. |
| **Analytics** | MDR trend, sector monthly trends, pathogen resistance, county rankings, and pathogen-antibiotic heatmaps. |
| **Pathogen Explorer** | Drill-down by pathogen: resistance per antibiotic class, 12-month trend, geographic distribution. |
| **Alerts** | Real-time anomaly alerts, severity filtering, acknowledgement, SMS notifications. |
| **Reports** | Summary, anomaly, sector, county, pathogen, and trend reports. Export to CSV, Excel, PDF. Email scheduling. |
| **Compare** | Side-by-side comparison of records or uploaded files with LLM-generated plain-language difference summary. |
| **Offline** | IndexedDB drafts saved automatically, sync when back online. |
| **Data Quality** | Completeness metrics and validation warnings. |

---

## Architecture

```
+----------------------------------------------------------------+
|                        Browser / PWA                            |
|   React 19 | Vite | Zustand | Recharts | Socket.IO Client       |
+---------------------------+--------------------------------------+
                            |
                     HTTP / WebSocket
                            |
                            v
+----------------------------------------------------------------+
|                  FastAPI Backend (Uvicorn)                      |
|                                                                  |
|  - REST APIs (30+ endpoints)                                    |
|  - Socket.IO server (real-time alerts)                          |
|  - Background tasks (email/SMS reports)                         |
|  - SQLAlchemy ORM (PostgreSQL / SQLite)                         |
+---------------+--------------------------------+----------------+
                |                                 |
                v                                 v
+---------------------------+       +---------------------------+
|         ML Models          |       |        PostgreSQL          |
|  - XGBoost                 |       |  - Predictions              |
|  - Isolation Forest        |       |  - Alerts                   |
|  - TruncatedSVD            |       |  - Comments                 |
|  - SHAP Explainer          |       |  - Risk Scores               |
|  - Linear Regression       |       |  - User Templates            |
|  - Gemini API              |       |  - SubCountyLocation         |
+---------------------------+       +---------------------------+
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS |
| State Management | Zustand |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Backend | FastAPI, Uvicorn, SQLAlchemy |
| Authentication | JWT-ready |
| ML & Forecasting | XGBoost, Isolation Forest, TruncatedSVD, SHAP, Linear Regression |
| Data Processing | Pandas, NumPy |
| Database | PostgreSQL / SQLite |
| Real-Time | Socket.IO |
| SMS | Africa's Talking |
| LLM | Gemini API (Anthropic Claude optional) |
| PDF Generation | reportlab, jsPDF (frontend) |
| Offline Storage | IndexedDB |
| Infrastructure | Docker + Docker Compose |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL (optional; SQLite works out of the box)

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

Create a `.env` file:

```ini
DATABASE_URL=sqlite:///./amr_data.db
MODEL_DIR=./saved_models
DATA_FILE_PATH=./data/kenya_amr_3000_isolates.csv
ANOMALY_FILE_PATH=./data/kenya_amr_anomaly_200.csv
ANOMALY_RATIO=0.05
TARGET_COL=mdr_flag
CORS_ORIGINS=["http://localhost:5173"]
GEMINI_API_KEY=your_gemini_key
AFRICASTALKING_USERNAME=sandbox
AFRICASTALKING_API_KEY=your_at_key
```

Run training (if models not present):

```bash
python train.py --csv-path ./data/kenya_amr_3000_isolates.csv --target-col mdr_flag
```

This trains the XGBoost classifier, Isolation Forest, SVD reducer, and saves all artifacts including preprocessor, feature names, pair-frequency map, and anomaly threshold.

Start the backend:

```bash
python -m src.main
```

API available at `http://localhost:8000`, Swagger at `/docs`.

### 3. Frontend Setup

```bash
cd ../../Frotend
npm install
```

Create a `.env` file:

```ini
VITE_API_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

Frontend available at `http://localhost:5173`.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy database URL | `sqlite:///./amr_data.db` |
| `MODEL_DIR` | Directory for saved model artifacts | `./saved_models` |
| `DATA_FILE_PATH` | Path to clean training CSV | `./data/kenya_amr_3000_isolates.csv` |
| `ANOMALY_FILE_PATH` | Path to anomaly training CSV | `./data/kenya_amr_anomaly_200.csv` |
| `ANOMALY_RATIO` | Fraction of anomalies to add during training | `0.05` |
| `TARGET_COL` | Target column name | `mdr_flag` |
| `CORS_ORIGINS` | JSON list of allowed origins | `["http://localhost:5173"]` |
| `GEMINI_API_KEY` | Gemini API key | — |
| `AFRICASTALKING_USERNAME` | Africa's Talking username (sandbox) | `sandbox` |
| `AFRICASTALKING_API_KEY` | Africa's Talking API key | — |
| `ENABLE_SMS` | Enable SMS sending | `false` |
| `SMTP_HOST`, `SMTP_PORT`, etc. | Email configuration for reports | — |

---

## Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/predict` | Submit prediction, get MDR probability, anomaly flag, SHAP |
| `GET` | `/predictions` | Paginated prediction history |
| `GET` | `/predictions/{record_id}/explanation` | SHAP explanation for a prediction |
| `GET` | `/analytics/summary` | Aggregated metrics |
| `GET` | `/analytics/mdr_trend` | Monthly MDR trend |
| `GET` | `/analytics/by_pathogen` | Resistance by pathogen |
| `GET` | `/analytics/by_sector` | MDR % by sector |
| `GET` | `/analytics/sector_monthly` | Monthly MDR per sector |
| `GET` | `/analytics/top_counties` | Top counties by MDR |
| `GET` | `/analytics/county_mdr` | County-level MDR rates |
| `GET` | `/analytics/sub_county_mdr` | Sub-county MDR (GeoJSON) |
| `GET` | `/analytics/mdr_difference` | MDR difference between two months |
| `GET` | `/analytics/resistance_by_pathogen/{code}` | Resistance per antibiotic for a pathogen |
| `GET` | `/analytics/pathogen_trend` | Pathogen-specific trend |
| `GET` | `/alerts` | Active alerts |
| `GET` | `/alerts/{alert_id}` | Alert detail |
| `GET` | `/alerts/{alert_id}/explanation` | SHAP for an alert |
| `POST` | `/llm/generate` | Generate LLM guidance for an alert |
| `POST` | `/llm/compare` | Compare two records with LLM explanation |
| `POST` | `/send-sms` | Send SMS notification |
| `GET` | `/metadata/options` | Dynamic form options (counties, pathogens, etc.) |
| `GET` | `/ews/forecast` | MDR forecast (linear regression) |

---

## Project Structure

```
amr-nexus/
├── backend/
│   └── amr_nexus_ml/
│       ├── src/
│       │   ├── api/
│       │   │   ├── routers/
│       │   │   ├── deps.py
│       │   │   └── app.py
│       │   ├── core/
│       │   │   ├── config.py
│       │   │   └── ml.py
│       │   ├── db/
│       │   │   ├── models.py
│       │   │   └── session.py
│       │   ├── services/
│       │   │   ├── prediction_service.py
│       │   │   ├── shap_service.py
│       │   │   ├── llm_service.py
│       │   │   ├── sms_service.py
│       │   │   ├── geospatial_service.py
│       │   │   ├── forecast_utils.py
│       │   │   └── ...
│       │   ├── utils/
│       │   │   └── logger.py
│       │   └── main.py
│       ├── saved_models/
│       ├── data/
│       ├── train.py
│       └── requirements.txt
├── frontend/
│   └── Frotend/
│       ├── src/
│       │   ├── api/
│       │   ├── components/
│       │   │   ├── predictions/
│       │   │   ├── alerts/
│       │   │   ├── map/
│       │   │   ├── trends/
│       │   │   ├── analytics/
│       │   │   └── ui/
│       │   ├── pages/
│       │   ├── hooks/
│       │   ├── utils/
│       │   └── main.jsx
│       ├── public/
│       ├── tailwind.config.js
│       └── package.json
└── docker-compose.yml
```

---

## Testing

**Health check**

```bash
curl http://localhost:8000/health
```

**Submit a prediction**

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "sector": "human",
    "sub_sector": "ICU",
    "pathogen_code": "KPN",
    "specimen_type": "Blood culture",
    "county": "Nairobi",
    "antibiotic_class": "Carbapenems",
    "test_method": "Broth microdilution",
    "sample_month": 8
  }'
```

**Test anomaly detection**

Send an impossible combination (e.g., environment sector with ICU sub-sector) and verify `anomaly_detected: true`.

**Test LLM comparison**

Select two records on the Compare page and verify the plain-English difference summary appears.

---

## Deployment with Docker

```bash
docker-compose up -d
```

The compose file starts PostgreSQL, backend (with Uvicorn), and frontend (served by Nginx). Ensure all environment variables are set before starting.

---

## Contributing

We welcome contributions from public health experts, ML engineers, and full-stack developers. Please follow existing code style:

- Use CSS variables in the frontend for theming.
- Keep API responses compatible with frontend expectations.
- Annotate data types with Pydantic models.
- Write unit tests for new services.

---

## License

Proprietary – AMR-Nexus One Health Project. All rights reserved. For internal research and public health use only.

---

## Contact

For technical support or collaboration, email: **team@amrnexus.org**

---

*Built for antimicrobial stewardship and One Health surveillance.*
