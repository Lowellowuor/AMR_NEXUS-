import hashlib
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session

from src.db.models import AMRIsolateRecord, DashboardNotification, Hotspot, SubCountyLocation
from src.core.config import settings
from src.utils.logger import logger


class PredictionService:
    def __init__(self, db: Session):
        self.db = db
        self.model = None
        self.preprocessor = None
        self.iso_model = None
        self.svd_model = None
        self.shap_explainer = None
        self.anomaly_threshold = None
        self.feature_names = None
        self.original_features = None
        self.pair_freq_map = None
        self._load_models()

    def _load_models(self):
        model_dir = Path(settings.MODEL_DIR)
        try:
            self.model = joblib.load(model_dir / 'mdr_model.pkl')
            self.preprocessor = joblib.load(model_dir / 'preprocessor.pkl')
            self.iso_model = joblib.load(model_dir / 'anomaly_iso.pkl')
            self.svd_model = joblib.load(model_dir / 'svd.pkl')
            self.shap_explainer = joblib.load(model_dir / 'shap_explainer.pkl')
            self.anomaly_threshold = joblib.load(model_dir / 'anomaly_threshold.pkl')
            self.feature_names = joblib.load(model_dir / 'feature_names.pkl')
            self.original_features = joblib.load(model_dir / 'original_feature_names.pkl')
            self.pair_freq_map = joblib.load(model_dir / 'pair_freq_map.pkl')
            logger.info("All models loaded for prediction service.")
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            raise RuntimeError("Model artifacts are missing or corrupted. Please run training first.")

    def _add_pair_frequency_feature(self, record: dict) -> dict:
        pair_key = f"{record.get('sector', '')}_{record.get('sub_sector', '')}"
        record['sector_sub_pair_count'] = self.pair_freq_map.get(pair_key, 0)
        return record

    def _get_or_create_hotspot(self, county: str, sub_county: Optional[str]) -> Hotspot:
        hotspot = self.db.query(Hotspot).filter(
            Hotspot.county == county,
            Hotspot.sub_county == sub_county
        ).first()
        if hotspot:
            return hotspot

        loc = self.db.query(SubCountyLocation).filter(
            SubCountyLocation.county == county,
            SubCountyLocation.sub_county == sub_county
        ).first()

        if loc:
            lat = float(loc.latitude)
            lon = float(loc.longitude)
        else:
            # Deterministic pseudo‑coordinates within Kenya
            name_str = f"{county}_{sub_county or ''}"
            hash_val = int(hashlib.md5(name_str.encode()).hexdigest(), 16)
            lat = -4.5 + (hash_val % 900) / 100.0
            lon = 34.0 + ((hash_val // 900) % 800) / 100.0

        hotspot = Hotspot(
            name=f"{sub_county or county} Health Facility",
            type="sub_county",
            latitude=lat,
            longitude=lon,
            county=county,
            sub_county=sub_county,
            is_active=True
        )
        self.db.add(hotspot)
        self.db.commit()
        self.db.refresh(hotspot)
        logger.info(f"Created hotspot for {county}/{sub_county}: id={hotspot.id}")
        return hotspot

    async def predict(self, record, background_tasks=None):
        data = record.dict()
        data = self._add_pair_frequency_feature(data)

        X = pd.DataFrame([data])[self.original_features]
        X_processed = self.preprocessor.transform(X)

        mdr_prob = float(self.model.predict_proba(X_processed)[0][1])

        X_reduced = self.svd_model.transform(X_processed)
        anomaly_score = float(self.iso_model.score_samples(X_reduced)[0])
        anomaly_flag = bool(anomaly_score < self.anomaly_threshold)

        shap_summary = None
        shap_top_feature = None
        shap_value = None
        try:
            shap_values = self.shap_explainer.shap_values(X_processed)
            if isinstance(shap_values, list):
                shap_values = shap_values[1]
            shap_values = shap_values[0]
            top_idx = np.argmax(np.abs(shap_values))
            shap_top_feature = self.feature_names[top_idx]
            shap_value = float(shap_values[top_idx])

            direction = "increases" if shap_value > 0 else "decreases"
            shap_summary = (
                f"Top feature: {shap_top_feature} ({direction} risk by {abs(shap_value):.3f})."
            )
        except Exception as e:
            logger.warning(f"SHAP computation failed: {e}")

        county = data.get('county')
        sub_county = data.get('sub_county')
        sample_date = data.get('sample_collection_date')

        hotspot = self._get_or_create_hotspot(county, sub_county)

        db_record = AMRIsolateRecord(
            submission_type="REAL",
            pathogen_code=data.get('pathogen_code'),
            mdr_flag=bool(mdr_prob >= 0.5),
            antibiotic_class=data.get('antibiotic_class'),
            test_method=data.get('test_method'),
            sector=data.get('sector'),
            sub_sector=data.get('sub_sector'),
            specimen_type=data.get('specimen_type'),
            county=county,
            sub_county=sub_county,
            sample_collection_date=sample_date,
            sample_month=data.get('sample_month'),
            prior_antibiotic_exposure=bool(data.get('prior_antibiotic_exposure')),
            anomaly_score=anomaly_score,
            anomaly_flag=anomaly_flag,
            model_version="1.0.0",
            mdr_probability=mdr_prob,
            shap_top_feature=shap_top_feature,
            shap_value=shap_value,
            shap_summary=shap_summary,
            hotspot_id=hotspot.id,
        )
        self.db.add(db_record)
        self.db.commit()
        self.db.refresh(db_record)

        if anomaly_flag:
            notif = DashboardNotification(
                county=county,
                message=f"Anomaly detected (score={anomaly_score:.3f}).",
            )
            self.db.add(notif)
            self.db.commit()

        return {
            "record_id": str(db_record.record_id),
            "mdr_probability": mdr_prob,
            "mdr_flag": bool(mdr_prob >= 0.5),
            "anomaly_detected": anomaly_flag,
            "anomaly_flag": anomaly_flag,
            "anomaly_score": anomaly_score,
            "shap_summary": shap_summary,
            "shap_top_feature": shap_top_feature,
            "shap_value": shap_value,
        }