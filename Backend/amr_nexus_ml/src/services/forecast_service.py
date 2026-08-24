import pandas as pd
from prophet import Prophet
from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import List, Dict, Any
from src.db.models import AMRIsolateRecord


def generate_prophet_forecast(
    db: Session,
    pathogen_code: str,
    antibiotic_class: str,
    periods: int = 12
) -> List[Dict[str, Any]]:
    if not pathogen_code or not antibiotic_class:
        raise ValueError("pathogen_code and antibiotic_class are required")

    results = db.query(
        extract('year', AMRIsolateRecord.sample_collection_date).label('year'),
        extract('month', AMRIsolateRecord.sample_collection_date).label('month'),
        func.avg(AMRIsolateRecord.mdr_probability).label('mdr_rate')
    ).filter(
        AMRIsolateRecord.pathogen_code == pathogen_code,
        AMRIsolateRecord.antibiotic_class == antibiotic_class
    ).group_by('year', 'month').order_by('year', 'month').all()

    if len(results) < 12:
        return []

    df = pd.DataFrame([(int(r.year), int(r.month), float(r.mdr_rate)) for r in results],
                      columns=['year', 'month', 'y'])
    df['ds'] = pd.to_datetime(df[['year', 'month']].assign(day=1))
    df = df[['ds', 'y']].dropna()

    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
    )
    model.fit(df)

    future = model.make_future_dataframe(periods=periods, freq='MS')
    forecast = model.predict(future)

    forecast = forecast[['ds', 'yhat']].tail(periods)
    forecast['month'] = forecast['ds'].dt.strftime('%Y-%m')
    forecast['predicted_resistance_rate'] = forecast['yhat'].round(4)

    points = []
    values = forecast['predicted_resistance_rate'].tolist()
    for i, row in forecast.iterrows():
        idx = forecast.index.get_loc(i)
        is_inflection = False
        if idx > 0:
            change = values[idx] - values[idx - 1]
            if abs(change) > 0.03:
                is_inflection = True
        points.append({
            "month": row['month'],
            "predicted_resistance_rate": float(row['predicted_resistance_rate']),
            "is_inflection_point": is_inflection,
            "clinical_warning": "Statistically significant trend change detected" if is_inflection else None,
        })

    return points