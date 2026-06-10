#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List, Union, Optional

import joblib
import numpy as np
import pandas as pd

from src.features.preprocessing import FeaturePreprocessor
from src.utils.config import config
from src.utils.logger import logger


class AMRPredictor:
    def __init__(self, model_dir: Optional[Path] = None):
        self.model_dir = Path(model_dir) if model_dir else config.MODEL_DIR
        if not self.model_dir.exists():
            raise FileNotFoundError(f"Model directory not found: {self.model_dir}")

        logger.info(f"Loading models from {self.model_dir}")

        self.model = joblib.load(self.model_dir / "mdr_xgb.pkl")
        self.anomaly_model = joblib.load(self.model_dir / "anomaly_iso.pkl")
        self.preprocessor = FeaturePreprocessor.load(self.model_dir / "preprocessor.pkl")
        self.feature_names = joblib.load(self.model_dir / "feature_names.pkl")
        self.numeric_indices = joblib.load(self.model_dir / "numeric_indices.pkl")

        shap_path = self.model_dir / "shap_explainer.pkl"
        self.shap_explainer = joblib.load(shap_path) if shap_path.exists() else None

        self._feature_list = self.feature_names if isinstance(self.feature_names, list) else self.feature_names.tolist()
        logger.info("All artifacts loaded")

    def _prepare_dataframe(self, data: Union[Dict, List[Dict], pd.DataFrame]) -> pd.DataFrame:
        if isinstance(data, pd.DataFrame):
            df = data.copy()
        elif isinstance(data, dict):
            df = pd.DataFrame([data])
        else:
            df = pd.DataFrame(data)

        required = ["sector", "sub_sector", "pathogen_code", "specimen_type",
                    "county", "antibiotic_class", "test_method", "sample_month"]
        for col in required:
            if col not in df.columns:
                if col == "sample_month":
                    df[col] = 1
                elif col == "sub_sector":
                    df[col] = "General"
                else:
                    df[col] = "unknown"

        optional = ["animal_species", "production_system", "urban_rural",
                    "patient_age_years", "patient_sex", "ward_type",
                    "prior_antibiotic_exposure", "infection_origin"]
        for col in optional:
            if col not in df.columns:
                df[col] = None
        return df

    def predict(self, input_data: Union[Dict, List[Dict], pd.DataFrame]) -> pd.DataFrame:
        df = self._prepare_dataframe(input_data)
        X = self.preprocessor.transform(df)
        X_arr = X.toarray() if hasattr(X, "toarray") else (X.values if hasattr(X, "values") else np.array(X))
        if X_arr.ndim == 1:
            X_arr = X_arr.reshape(1, -1)

        mdr_proba = self.model.predict_proba(X_arr)[:, 1]
        mdr_flag = mdr_proba >= 0.5

        X_numeric = X_arr[:, self.numeric_indices]
        anomaly_scores = -self.anomaly_model.score_samples(X_numeric)
        anomaly_detected = self.anomaly_model.predict(X_numeric) == -1

        shap_top = [None] * X_arr.shape[0]
        shap_vals = [None] * X_arr.shape[0]
        if self.shap_explainer is not None:
            shap_values_arr = self.shap_explainer.shap_values(X_arr)
            for i in range(X_arr.shape[0]):
                abs_shap = np.abs(shap_values_arr[i])
                top_idx = np.argmax(abs_shap)
                shap_top[i] = self._feature_list[top_idx]
                shap_vals[i] = float(shap_values_arr[i][top_idx])

        return pd.DataFrame({
            "mdr_flag": mdr_flag,
            "mdr_probability": mdr_proba,
            "anomaly_detected": anomaly_detected,
            "anomaly_score": anomaly_scores,
            "shap_top_feature": shap_top,
            "shap_value": shap_vals
        })

    def predict_single(self, record: Dict) -> Dict:
        return self.predict([record]).iloc[0].to_dict()


def main():
    parser = argparse.ArgumentParser(description="AMR prediction from JSON")
    parser.add_argument("--input", "-i", required=True, help="Input JSON file")
    parser.add_argument("--model-dir", "-m", help="Model directory (default: config.MODEL_DIR)")
    parser.add_argument("--output", "-o", help="Output JSON file")
    args = parser.parse_args()

    with open(args.input) as f:
        data = json.load(f)

    predictor = AMRPredictor(model_dir=args.model_dir)
    results_df = predictor.predict(data)
    output = results_df.to_dict(orient="records")

    if args.output:
        with open(args.output, "w") as f:
            json.dump(output, f, indent=2)
        logger.info(f"Saved to {args.output}")
    else:
        print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
