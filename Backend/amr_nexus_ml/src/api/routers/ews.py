# src/api/routers/ews.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.api.deps import get_db
from src.db.models import AMRIsolateRecord
from sqlalchemy import func, extract
import numpy as np
from sklearn.linear_model import LinearRegression

ews_router = APIRouter()

@ews_router.get("/forecast")
async def get_ews_forecast(db: Session = Depends(get_db)):
    counties = db.query(AMRIsolateRecord.county).distinct().all()
    result = []
    for (county,) in counties:
        rows = db.query(
            extract('year', AMRIsolateRecord.created_at).label('year'),
            extract('month', AMRIsolateRecord.created_at).label('month'),
            (func.sum(func.cast(AMRIsolateRecord.mdr_flag, sa.Integer)) * 1.0 / func.count()).label('rate')
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