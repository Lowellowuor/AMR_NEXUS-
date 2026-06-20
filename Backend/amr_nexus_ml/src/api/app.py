from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, cast, Integer, or_
from datetime import datetime, timedelta, date
import numpy as np
import joblib
import pandas as pd
import csv
from io import StringIO
import uuid
import smtplib
from email.message import EmailMessage
from reportlab.pdfgen import canvas
import io as io_lib
import random
import os

# Prophet for forecasting
from prophet import Prophet

# ML libraries
from sklearn.linear_model import LinearRegression

# SMS and LLM
import africastalking
import anthropic

from src.utils.config import config
from src.features.preprocessing import FeaturePreprocessor
from src.utils.logger import logger
from src.database import SessionLocal
from src.db_models import AMRIsolateRecord, Comment, RiskScore

app = FastAPI(title="AMR-Nexus ML API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ML globals
model = None
anomaly_model = None
preprocessor = None
feature_names = None
numeric_indices = None
shap_explainer = None

# ---------- Pydantic schemas ----------
class AMRRecordIn(BaseModel):
    sector: str
    sub_sector: str
    pathogen_code: str
    specimen_type: str
    animal_species: Optional[str] = None
    production_system: Optional[str] = None
    county: str
    urban_rural: Optional[str] = None
    patient_age_years: Optional[float] = None
    patient_sex: Optional[str] = None
    ward_type: Optional[str] = None
    prior_antibiotic_exposure: Optional[bool] = None
    infection_origin: Optional[str] = None
    antibiotic_class: str
    test_method: str
    sample_month: int
    phone_number: Optional[str] = None  # for SMS alerts

class PredictionResponse(BaseModel):
    mdr_flag: bool
    mdr_probability: float
    anomaly_detected: bool
    anomaly_score: float
    shap_top_feature: str
    shap_value: float
    shap_summary: str

class EmailReportRequest(BaseModel):
    email: str
    format: str = "pdf"

class CommentCreate(BaseModel):
    text: str
    user_name: str = "Anonymous"

class GuidanceRequest(BaseModel):
    pathogen_code: str
    resistance_pattern: str
    user_role: str
    county: Optional[str] = None

# ---------- DB dependency ----------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------- Startup ----------
@app.on_event("startup")
def load_models():
    global model, anomaly_model, preprocessor, feature_names, numeric_indices, shap_explainer
    model = joblib.load(config.MODEL_DIR / "mdr_xgb.pkl")
    anomaly_model = joblib.load(config.MODEL_DIR / "anomaly_iso.pkl")
    preprocessor = FeaturePreprocessor.load(config.MODEL_DIR / "preprocessor.pkl")
    feature_names = joblib.load(config.MODEL_DIR / "feature_names.pkl")
    numeric_indices = joblib.load(config.MODEL_DIR / "numeric_indices.pkl")
    shap_explainer = joblib.load(config.MODEL_DIR / "shap_explainer.pkl")
    logger.info("ML models loaded")

# ---------- Health ----------
@app.get("/health")
def health():
    return {"status": "ok", "service": "AMR-Nexus ML API"}

@app.get("/api/health")
def api_health():
    return {"status": "ok", "service": "AMR-Nexus ML API"}

# ---------- Helper: SHAP plain‑language summary ----------
def generate_shap_summary(shap_values, feature_names, mdr_prob):
    pairs = [(feature_names[i], shap_values[0][i]) for i in range(len(feature_names))]
    pairs.sort(key=lambda x: abs(x[1]), reverse=True)
    top = pairs[:3]
    parts = []
    for f, v in top:
        direction = "increasing" if v > 0 else "decreasing"
        if abs(v) > 0.1:
            parts.append(f"{f.replace('_', ' ')} ({direction})")
    if not parts:
        parts = ["a combination of factors"]
    summary = f"This prediction was primarily driven by {', '.join(parts)}. " \
              f"The model predicts a {mdr_prob*100:.1f}% probability of multidrug resistance."
    return summary

# ---------- Helper: SMS ----------
def send_sms_alert(phone: str, message: str):
    try:
        username = config.AT_USERNAME
        api_key = config.AT_API_KEY
        sender = config.AT_SENDER_ID
        sms = africastalking.SMS(username=username, api_key=api_key)
        response = sms.send(message, [phone], sender_id=sender)
        logger.info(f"SMS sent to {phone}: {response}")
        return response
    except Exception as e:
        logger.error(f"SMS failed: {e}")
        return None

# ---------- Prediction endpoint ----------
@app.post("/predict", response_model=PredictionResponse)
async def predict(record: AMRRecordIn, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    input_dict = record.dict()
    df = pd.DataFrame([input_dict])
    X = preprocessor.transform(df)
    X_arr = X.values.reshape(1, -1)

    mdr_prob = model.predict_proba(X_arr)[0, 1]
    mdr_flag = mdr_prob >= 0.5

    X_numeric = X_arr[:, numeric_indices]
    anomaly_score = -anomaly_model.score_samples(X_numeric)[0]
    anomaly_detected = anomaly_model.predict(X_numeric)[0] == -1

    shap_values = shap_explainer.shap_values(X_arr)
    shap_abs = np.abs(shap_values[0])
    top_idx = np.argmax(shap_abs)
    top_feature = feature_names[top_idx]
    shap_val = float(shap_values[0][top_idx])
    shap_summary = generate_shap_summary(shap_values, feature_names, mdr_prob)

    db_record = AMRIsolateRecord(
        record_id=uuid.uuid4(),
        created_at=datetime.utcnow(),
        submission_type="REAL",
        pathogen_code=record.pathogen_code,
        sector=record.sector,
        sub_sector=record.sub_sector,
        specimen_type=record.specimen_type,
        county=record.county,
        sample_month=record.sample_month,
        antibiotic_class=record.antibiotic_class,
        test_method=record.test_method,
        patient_age_years=record.patient_age_years,
        patient_sex=record.patient_sex,
        ward_type=record.ward_type,
        prior_antibiotic_exposure=record.prior_antibiotic_exposure,
        infection_origin=record.infection_origin,
        animal_species=record.animal_species,
        production_system=record.production_system,
        urban_rural=record.urban_rural,
        mdr_flag=mdr_flag,
        mdr_probability=mdr_prob,
        anomaly_flag=anomaly_detected,
        anomaly_score=anomaly_score,
        shap_top_feature=top_feature,
        shap_value=shap_val,
        shap_summary=shap_summary,
        model_version="1.0"
    )
    db.add(db_record)
    db.commit()

    if anomaly_detected:
        from ..serve import sio
        await sio.emit('new_anomaly', {
            'message': f'⚠️ Anomaly: {record.pathogen_code.upper()} in {record.county}',
            'severity': 'high',
            'record_id': str(db_record.record_id),
            'timestamp': datetime.utcnow().isoformat()
        })

        # Send SMS if phone provided and SMS enabled
        if record.phone_number and getattr(config, 'ENABLE_SMS', False):
            msg = f"AMR Alert: {record.pathogen_code.upper()} anomaly in {record.county}. MDR prob: {mdr_prob*100:.1f}%"
            background_tasks.add_task(send_sms_alert, record.phone_number, msg)

    return PredictionResponse(
        mdr_flag=mdr_flag,
        mdr_probability=float(mdr_prob),
        anomaly_detected=anomaly_detected,
        anomaly_score=float(anomaly_score),
        shap_top_feature=top_feature,
        shap_value=shap_val,
        shap_summary=shap_summary
    )

# ---------- Analytics (with date filtering) ----------
@app.get("/analytics/summary")
def get_summary(start_date: Optional[date] = None, end_date: Optional[date] = None, db: Session = Depends(get_db)):
    query = db.query(AMRIsolateRecord)
    if start_date:
        query = query.filter(AMRIsolateRecord.created_at >= start_date)
    if end_date:
        query = query.filter(AMRIsolateRecord.created_at <= end_date)
    total = query.count()
    mdr_count = query.filter(AMRIsolateRecord.mdr_flag == True).count()
    anomaly_count = query.filter(AMRIsolateRecord.anomaly_flag == True).count()
    counties = query.with_entities(AMRIsolateRecord.county).distinct().count()
    return {
        "total_records": total or 0,
        "mdr_rate": round(mdr_count / total * 100, 1) if total else 0,
        "anomaly_count": anomaly_count or 0,
        "active_counties": counties or 0
    }

@app.get("/analytics/mdr_trend")
def mdr_trend(months: int = 6, db: Session = Depends(get_db)):
    date_col = AMRIsolateRecord.created_at
    now = datetime.now()
    results = []
    for i in range(months):
        month_date = now - timedelta(days=30*i)
        year = month_date.year
        month = month_date.month
        total = db.query(func.count(AMRIsolateRecord.record_id)).filter(
            extract('year', date_col) == year,
            extract('month', date_col) == month
        ).scalar()
        if total:
            mdr = db.query(func.count(AMRIsolateRecord.record_id)).filter(
                AMRIsolateRecord.mdr_flag == True,
                extract('year', date_col) == year,
                extract('month', date_col) == month
            ).scalar()
            rate = round(mdr / total * 100, 1)
        else:
            rate = 0
        results.append({"month": month_date.strftime("%b"), "rate": rate})
    return results[::-1]

@app.get("/analytics/by_pathogen")
def resistance_by_pathogen(limit: int = 10, db: Session = Depends(get_db)):
    pathogens = db.query(
        AMRIsolateRecord.pathogen_code,
        func.count(AMRIsolateRecord.record_id).label('total'),
        func.sum(cast(AMRIsolateRecord.mdr_flag, Integer)).label('mdr_count')
    ).group_by(AMRIsolateRecord.pathogen_code).having(func.count(AMRIsolateRecord.record_id) > 10).all()
    data = []
    for p in pathogens:
        rate = round(p.mdr_count / p.total * 100, 1) if p.total else 0
        data.append({"name": p.pathogen_code.upper(), "resistance": rate})
    data.sort(key=lambda x: x["resistance"], reverse=True)
    return data[:limit]

@app.get("/analytics/by_sector")
def resistance_by_sector(db: Session = Depends(get_db)):
    sectors = db.query(
        AMRIsolateRecord.sector,
        func.count(AMRIsolateRecord.record_id).label('total'),
        func.sum(cast(AMRIsolateRecord.mdr_flag, Integer)).label('mdr_count')
    ).group_by(AMRIsolateRecord.sector).all()
    return [{"name": s.sector, "value": round(s.mdr_count / s.total * 100, 1)} for s in sectors if s.total]

@app.get("/analytics/top_counties")
def top_counties(limit: int = 5, db: Session = Depends(get_db)):
    counties = db.query(
        AMRIsolateRecord.county,
        func.count(AMRIsolateRecord.record_id).label('total'),
        func.sum(cast(AMRIsolateRecord.mdr_flag, Integer)).label('mdr_count')
    ).group_by(AMRIsolateRecord.county).having(func.count(AMRIsolateRecord.record_id) > 5).all()
    data = []
    for c in counties:
        rate = round(c.mdr_count / c.total * 100, 1) if c.total else 0
        data.append({"county": c.county, "rate": rate})
    data.sort(key=lambda x: x["rate"], reverse=True)
    return data[:limit]

@app.get("/analytics/county_mdr")
def get_county_mdr(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    pathogen_code: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(
        AMRIsolateRecord.county,
        func.count(AMRIsolateRecord.record_id).label('total'),
        func.sum(cast(AMRIsolateRecord.mdr_flag, Integer)).label('mdr_count')
    )
    if start_date:
        query = query.filter(AMRIsolateRecord.created_at >= start_date)
    if end_date:
        query = query.filter(AMRIsolateRecord.created_at <= end_date)
    if pathogen_code:
        query = query.filter(AMRIsolateRecord.pathogen_code == pathogen_code)
    result = query.group_by(AMRIsolateRecord.county).all()
    data = []
    for r in result:
        if r.county and r.total > 0:
            rate = round(r.mdr_count / r.total * 100, 1)
            data.append({"county": r.county, "mdr_rate": rate})
    return data

@app.get("/analytics/data_quality")
def data_quality(db: Session = Depends(get_db)):
    total = db.query(func.count(AMRIsolateRecord.record_id)).scalar()
    missing_pathogen = db.query(func.count()).filter(AMRIsolateRecord.pathogen_code.is_(None)).scalar()
    missing_county = db.query(func.count()).filter(AMRIsolateRecord.county.is_(None)).scalar()
    return {
        "total_records": total,
        "missing_pathogen": missing_pathogen,
        "missing_county": missing_county,
        "completeness_percent": round((total - (missing_pathogen+missing_county)) / total * 100, 1) if total else 0
    }

# ---------- Pathogen explorer ----------
@app.get("/analytics/resistance_by_pathogen/{pathogen_code}")
def resistance_by_pathogen_class(pathogen_code: str, db: Session = Depends(get_db)):
    results = db.query(
        AMRIsolateRecord.antibiotic_class,
        func.count(AMRIsolateRecord.record_id).label('total'),
        func.sum(cast(AMRIsolateRecord.mdr_flag, Integer)).label('mdr_count')
    ).filter(AMRIsolateRecord.pathogen_code == pathogen_code)\
     .group_by(AMRIsolateRecord.antibiotic_class).all()
    data = []
    for r in results:
        rate = round(r.mdr_count / r.total * 100, 1) if r.total else 0
        data.append({"antibiotic_class": r.antibiotic_class, "resistance": rate})
    return data

# ---------- Pathogen-specific trend ----------
@app.get("/analytics/pathogen_trend")
def pathogen_trend(
    pathogen_code: str,
    months: int = 12,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    date_col = AMRIsolateRecord.created_at
    query = db.query(
        extract('year', date_col).label('year'),
        extract('month', date_col).label('month'),
        (func.sum(cast(AMRIsolateRecord.mdr_flag, Integer)) * 1.0 / func.count()).label('rate')
    ).filter(AMRIsolateRecord.pathogen_code == pathogen_code)
    if start_date:
        query = query.filter(date_col >= start_date)
    if end_date:
        query = query.filter(date_col <= end_date)
    results = query.group_by('year', 'month').order_by('year', 'month').limit(months).all()
    data = []
    for r in results:
        month_date = datetime(int(r.year), int(r.month), 1)
        data.append({"month": month_date.strftime("%b %Y"), "rate": round(r.rate, 1)})
    return data

# ---------- Risk scores ----------
@app.get("/analytics/risk_scores")
def get_risk_scores(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    pathogen_code: Optional[str] = None,
    county: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(
        AMRIsolateRecord.county,
        AMRIsolateRecord.pathogen_code,
        AMRIsolateRecord.antibiotic_class,
        func.avg(AMRIsolateRecord.anomaly_score).label('avg_anomaly'),
        func.count(AMRIsolateRecord.record_id).label('total'),
        func.sum(cast(AMRIsolateRecord.mdr_flag, Integer)).label('mdr_count')
    ).group_by(
        AMRIsolateRecord.county,
        AMRIsolateRecord.pathogen_code,
        AMRIsolateRecord.antibiotic_class
    )
    if start_date:
        query = query.filter(AMRIsolateRecord.created_at >= start_date)
    if end_date:
        query = query.filter(AMRIsolateRecord.created_at <= end_date)
    if pathogen_code:
        query = query.filter(AMRIsolateRecord.pathogen_code == pathogen_code)
    if county:
        query = query.filter(AMRIsolateRecord.county == county)
    results = query.all()
    risk_data = []
    for r in results:
        if r.total > 0:
            mdr_rate = r.mdr_count / r.total
            anomaly_w = r.avg_anomaly or 0
            risk = (anomaly_w * 40 + mdr_rate * 40 + min(r.total / 100, 1) * 20)
            risk = min(risk, 100)
            risk_data.append({
                "county": r.county,
                "pathogen_code": r.pathogen_code,
                "antibiotic_class": r.antibiotic_class,
                "risk_score": round(risk, 1),
                "anomaly_score": round(anomaly_w, 3),
                "mdr_rate": round(mdr_rate * 100, 1),
                "sample_size": r.total
            })
    risk_data.sort(key=lambda x: x['risk_score'], reverse=True)
    return risk_data[:50]

# ---------- Prophet forecast ----------
@app.get("/forecast/trend")
def forecast_trend(
    pathogen_code: Optional[str] = None,
    county: Optional[str] = None,
    sector: Optional[str] = None,
    antibiotic_class: Optional[str] = None,
    months: int = 6,
    db: Session = Depends(get_db)
):
    query = db.query(AMRIsolateRecord.created_at, AMRIsolateRecord.mdr_flag)
    if pathogen_code:
        query = query.filter(AMRIsolateRecord.pathogen_code == pathogen_code)
    if county:
        query = query.filter(AMRIsolateRecord.county == county)
    if sector:
        query = query.filter(AMRIsolateRecord.sector == sector)
    if antibiotic_class:
        query = query.filter(AMRIsolateRecord.antibiotic_class == antibiotic_class)
    df = pd.read_sql(query.statement, db.bind)
    if df.empty:
        return {"error": "Insufficient data for forecast"}
    df['date'] = pd.to_datetime(df['created_at']).dt.date
    weekly = df.groupby('date').agg(total=('mdr_flag', 'count'), resistant=('mdr_flag', 'sum')).reset_index()
    weekly['rate'] = weekly['resistant'] / weekly['total']
    weekly = weekly[weekly['total'] >= 5]
    if len(weekly) < 4:
        return {"error": "Insufficient data points for forecast"}
    prophet_df = weekly[['date', 'rate']].rename(columns={'date': 'ds', 'rate': 'y'})
    model = Prophet(interval_width=0.8, seasonality_mode='multiplicative')
    model.fit(prophet_df)
    future = model.make_future_dataframe(periods=months*4, freq='W')
    forecast = model.predict(future)
    result = {
        "historical": [{"ds": r['date'].isoformat(), "y": r['rate']} for _, r in weekly.iterrows()],
        "forecast": [{"ds": r['ds'].isoformat(), "yhat": r['yhat'], "yhat_lower": r['yhat_lower'], "yhat_upper": r['yhat_upper']} for _, r in forecast.iterrows()]
    }
    return result

# ---------- Claude guidance ----------
@app.post("/guidance")
def get_guidance(req: GuidanceRequest, db: Session = Depends(get_db)):
    base = {
        "ECO": {
            "ESBL": {
                "national": "Restrict 3rd gen cephalosporins; review local antibiogram.",
                "county": "Consider carbapenems for severe infections; refer to local susceptibility."
            },
            "Carbapenem-resistant": {
                "national": "Implement carbapenem stewardship; strengthen IPC.",
                "county": "Consider ceftazidime-avibactam or colistin; consult ID specialist."
            }
        },
        "KPN": {
            "ESBL": {
                "national": "Review ESBL trends; enhance lab surveillance.",
                "county": "Use carbapenems empirically; monitor treatment response."
            }
        },
        "SAU": {
            "MRSA": {
                "national": "Review MRSA policies; promote decolonisation.",
                "county": "Consider vancomycin or linezolid; follow MRSA guidelines."
            }
        }
    }
    base_text = base.get(req.pathogen_code.upper(), {}).get(req.resistance_pattern, {}).get(req.user_role, "No specific recommendation available.")
    try:
        client = anthropic.Anthropic(api_key=config.CLAUDE_API_KEY)
        prompt = f"""
        You are an AMR stewardship expert in Kenya.
        Pathogen: {req.pathogen_code.upper()}
        Resistance: {req.resistance_pattern}
        User role: {req.user_role} (national policymaker or county clinician)
        County: {req.county or 'National'}
        Base recommendation: {base_text}
        Provide actionable guidance with sections: Key Actions, Treatment Recommendations, Policy Actions, Links to Kenya MOH/WHO/CLSI guidelines.
        """
        response = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=500,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )
        guidance = response.content[0].text
        source = "Claude API"
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        guidance = base_text
        source = "Database fallback"
    return {
        "pathogen": req.pathogen_code,
        "resistance": req.resistance_pattern,
        "role": req.user_role,
        "guidance": guidance,
        "source": source
    }

# ---------- Stewardship recommendations (existing) ----------
RECOMMENDATIONS = {
    "ECO": {"Fluoroquinolone": {"alternative": "Ceftriaxone", "prob": 85, "note": "CLSI 2024"}},
    "KPN": {"Carbapenem": {"alternative": "Ceftazidime-avibactam", "prob": 72, "note": "Combination therapy"}},
    "SAU": {"Penicillin": {"alternative": "Cefoxitin", "prob": 90, "note": "Check MRSA"}}
}
@app.get("/recommendations/{pathogen_code}/{antibiotic_class}")
def get_recommendations(pathogen_code: str, antibiotic_class: str):
    data = RECOMMENDATIONS.get(pathogen_code.upper(), {}).get(antibiotic_class, {})
    return {
        "alternative": data.get("alternative", "No alternative found"),
        "probability": data.get("prob", 0),
        "note": data.get("note", "")
    }

# ---------- EWS Forecast (existing) ----------
@app.get("/ews/forecast")
def forecast_mdr(db: Session = Depends(get_db)):
    counties = db.query(AMRIsolateRecord.county).distinct().all()
    result = []
    for (county,) in counties:
        rows = db.query(
            extract('year', AMRIsolateRecord.created_at).label('year'),
            extract('month', AMRIsolateRecord.created_at).label('month'),
            (func.sum(cast(AMRIsolateRecord.mdr_flag, Integer)) * 1.0 / func.count()).label('rate')
        ).filter(AMRIsolateRecord.county == county)\
         .group_by('year', 'month')\
         .order_by('year', 'month')\
         .limit(12).all()
        if len(rows) < 3:
            predicted = 0
        else:
            X = np.arange(len(rows)).reshape(-1,1)
            y = [r.rate for r in rows]
            model = LinearRegression().fit(X, y)
            predicted = model.predict([[len(rows)]])[0]
        result.append({"county": county, "predicted_mdr_rate": round(predicted, 1)})
    return result

# ---------- Email report ----------
def generate_and_send_pdf(email: str):
    buffer = io_lib.BytesIO()
    c = canvas.Canvas(buffer)
    c.drawString(100, 800, "AMR Nexus Weekly Report")
    c.drawString(100, 780, f"Generated on {datetime.now().strftime('%Y-%m-%d')}")
    c.save()
    buffer.seek(0)
    msg = EmailMessage()
    msg['Subject'] = 'AMR Nexus Weekly Report'
    msg['From'] = 'reports@amrnexus.org'
    msg['To'] = email
    msg.set_content('Please find attached your AMR report.')
    msg.add_attachment(buffer.read(), maintype='application', subtype='pdf', filename='report.pdf')
    with smtplib.SMTP('smtp.gmail.com', 587) as s:
        s.starttls()
        s.login('your_email@gmail.com', 'your_password')
        s.send_message(msg)

@app.post("/reports/email")
async def email_report(request: EmailReportRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(generate_and_send_pdf, request.email)
    return {"status": "queued", "email": request.email}

# ---------- Comments ----------
@app.post("/predictions/{record_id}/comments")
def add_comment(record_id: str, comment: CommentCreate, db: Session = Depends(get_db)):
    new_comment = Comment(
        record_id=uuid.UUID(record_id),
        user_name=comment.user_name,
        text=comment.text
    )
    db.add(new_comment)
    db.commit()
    return {"status": "ok"}

@app.get("/predictions/{record_id}/comments")
def get_comments(record_id: str, db: Session = Depends(get_db)):
    comments = db.query(Comment).filter(Comment.record_id == uuid.UUID(record_id)).order_by(Comment.created_at.desc()).all()
    return [{"id": c.id, "user_name": c.user_name, "text": c.text, "created_at": c.created_at.isoformat()} for c in comments]

# ---------- History ----------
@app.get("/predictions")
def get_predictions(limit: int = 50, skip: int = 0, db: Session = Depends(get_db)):
    records = db.query(AMRIsolateRecord).order_by(AMRIsolateRecord.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "record_id": str(r.record_id),
            "pathogen_code": r.pathogen_code,
            "county": r.county,
            "mdr_flag": r.mdr_flag,
            "mdr_probability": float(r.mdr_probability) if r.mdr_probability is not None else 0.0,
            "anomaly_detected": r.anomaly_flag,
            "timestamp": r.created_at.isoformat(),
            "shap_summary": r.shap_summary
        }
        for r in records
    ]

# ---------- CSV export ----------
@app.get("/export/predictions")
def export_predictions(db: Session = Depends(get_db)):
    records = db.query(AMRIsolateRecord).limit(10000).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["record_id", "pathogen_code", "sector", "county", "mdr_flag", "anomaly_flag", "created_at"])
    for r in records:
        writer.writerow([str(r.record_id), r.pathogen_code, r.sector, r.county, r.mdr_flag, r.anomaly_flag, r.created_at])
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=predictions.csv"})

# ---------- Header endpoints ----------
@app.get("/me")
def get_current_user():
    return {
        "name": "John Doe",
        "email": "john.doe@amrnexus.org",
        "role": "epidemiologist",
        "county": "Nairobi",
        "avatar": None
    }

@app.get("/search")
def global_search(q: str = "", limit: int = 10, db: Session = Depends(get_db)):
    if not q or len(q) < 2:
        return {"results": []}
    term = f"%{q}%"
    predictions = db.query(AMRIsolateRecord.pathogen_code, AMRIsolateRecord.county, AMRIsolateRecord.antibiotic_class)\
        .filter(or_(AMRIsolateRecord.pathogen_code.ilike(term), AMRIsolateRecord.county.ilike(term), AMRIsolateRecord.antibiotic_class.ilike(term)))\
        .limit(limit).all()
    pathogens = db.query(AMRIsolateRecord.pathogen_code).filter(AMRIsolateRecord.pathogen_code.ilike(term)).distinct().limit(limit).all()
    counties = db.query(AMRIsolateRecord.county).filter(AMRIsolateRecord.county.ilike(term)).distinct().limit(limit).all()
    results = []
    for p in predictions:
        if p.pathogen_code:
            results.append({"type": "Prediction", "name": f"{p.pathogen_code.upper()} in {p.county} ({p.antibiotic_class})", "url": f"/history?search={p.pathogen_code}"})
    for p in pathogens:
        if p.pathogen_code:
            results.append({"type": "Pathogen", "name": p.pathogen_code.upper(), "url": f"/pathogen-explorer?pathogen={p.pathogen_code}"})
    for c in counties:
        if c.county:
            results.append({"type": "County", "name": c.county, "url": f"/analytics?county={c.county}"})
    seen = set()
    unique = []
    for res in results:
        key = f"{res['type']}|{res['name']}"
        if key not in seen:
            seen.add(key)
            unique.append(res)
    return {"results": unique[:limit]}

@app.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    alerts = []
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    anomalies = db.query(AMRIsolateRecord).filter(
        AMRIsolateRecord.anomaly_flag == True,
        AMRIsolateRecord.created_at >= seven_days_ago
    ).order_by(AMRIsolateRecord.created_at.desc()).limit(20).all()
    for a in anomalies:
        alerts.append({
            "id": f"anomaly-{a.record_id}",
            "message": f"⚠️ Anomaly detected: Unusual resistance pattern for {a.pathogen_code.upper()} in {a.county}",
            "timestamp": a.created_at.isoformat(),
            "severity": "medium",
            "type": "anomaly",
            "acknowledged": False,
            "details": f"Score: {a.anomaly_score:.3f}",
            "pathogen_code": a.pathogen_code,
            "resistance_pattern": "ESBL",  # Placeholder; in real implementation, derive from SIR results
            "county": a.county
        })
    total = db.query(func.count(AMRIsolateRecord.record_id)).scalar()
    if total > 0:
        mdr_count = db.query(func.count(AMRIsolateRecord.record_id)).filter(AMRIsolateRecord.mdr_flag == True).scalar()
        mdr_rate = round(mdr_count / total * 100, 1)
        if mdr_rate > 30:
            alerts.append({
                "id": "high-mdr",
                "message": f"📈 High MDR rate alert: Overall resistance rate is {mdr_rate}% – above threshold (30%)",
                "timestamp": datetime.utcnow().isoformat(),
                "severity": "high",
                "type": "trend",
                "acknowledged": False,
                "details": "Review antibiotic stewardship programmes.",
                "pathogen_code": None,
                "resistance_pattern": "High MDR",
                "county": "National"
            })
    alerts.sort(key=lambda x: x["timestamp"], reverse=True)
    return alerts

@app.get("/alerts/count")
def alerts_count(db: Session = Depends(get_db)):
    count = 0
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    anomaly_count = db.query(func.count(AMRIsolateRecord.record_id)).filter(
        AMRIsolateRecord.anomaly_flag == True,
        AMRIsolateRecord.created_at >= seven_days_ago
    ).scalar()
    count += anomaly_count if anomaly_count else 0
    total = db.query(func.count(AMRIsolateRecord.record_id)).scalar()
    if total > 0:
        mdr_count = db.query(func.count(AMRIsolateRecord.record_id)).filter(AMRIsolateRecord.mdr_flag == True).scalar()
        mdr_rate = round(mdr_count / total * 100, 1)
        if mdr_rate > 30:
            count += 1
    return {"count": count}
