import sys
from typing import List, Optional, Tuple
import click
import mlflow
import pandas as pd
from pydantic import BaseModel, Field, ValidationError, ConfigDict
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split

from src.data.loader import load_training_data
from src.features.preprocessing import FeaturePreprocessor
from src.models.train import train_mdr_classifier, train_anomaly_detector, save_artifacts
from src.utils.logger import logger

TARGET_COLUMN = "mdr_flag"
TEST_SIZE = 0.2
RANDOM_STATE = 42
MLFLOW_EXPERIMENT_NAME = "mdr_classifier_pipeline"


class InputDataRow(BaseModel):
    model_config = ConfigDict(extra="allow")
    mdr_flag: int = Field(..., ge=0, le=1)


def validate_schema_with_pydantic(df: pd.DataFrame) -> None:
    if df.empty:
        raise ValueError("Input DataFrame is empty.")
    
    if TARGET_COLUMN not in df.columns:
        raise KeyError(f"Target column '{TARGET_COLUMN}' missing from input data.")
        
    try:
        records = df[[TARGET_COLUMN]].to_dict(orient="records")
        for record in records:
            InputDataRow(**record)
    except ValidationError as e:
        logger.error(f"Schema violation detected: {e.json()}")
        raise


def prepare_splits(
    df: pd.DataFrame, target: str, test_size: float, random_state: int
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    X_raw = df.drop(columns=[target])
    y_raw = df[target].astype(int)
    
    return train_test_split(
        X_raw, y_raw, test_size=test_size, random_state=random_state, stratify=y_raw
    )


def evaluate_and_log_metrics(y_true: pd.Series, y_pred: list) -> None:
    metrics = {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1_score": f1_score(y_true, y_pred, zero_division=0)
    }
    
    for metric_name, score in metrics.items():
        mlflow.log_metric(f"val_{metric_name}", float(score))
        logger.info(f"Validation Metric - {metric_name.upper()}: {score:.4f}")


@click.command()
@click.option("--limit", default=None, type=int, help="Limit the number of database records for local debugging.")
def main(limit: Optional[int]) -> None:
    logger.info("Initializing production ML training pipeline process...")
    mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)
    
    try:
        df = load_training_data(limit=limit)
        validate_schema_with_pydantic(df)
        
        X_train_raw, X_val_raw, y_train, y_val = prepare_splits(
            df, TARGET_COLUMN, TEST_SIZE, RANDOM_STATE
        )
        
        with mlflow.start_run() as run:
            logger.info(f"Active MLflow Run ID: {run.info.run_id}")
            
            mlflow.log_param("test_size", TEST_SIZE)
            mlflow.log_param("random_state", RANDOM_STATE)
            mlflow.log_param("input_record_count", len(df))
            
            logger.info("Executing feature engineering transformations...")
            preprocessor = FeaturePreprocessor()
            preprocessor.fit(X_train_raw)
            
            X_train = preprocessor.transform(X_train_raw)
            X_val = preprocessor.transform(X_val_raw)
            
            mlflow.log_param("feature_count", X_train.shape)
            
            logger.info("Training classifiers and unsupervised anomaly models...")
            model = train_mdr_classifier(X_train, y_train)
            anomaly_model = train_anomaly_detector(X_train)
            
            y_val_pred = model.predict(X_val)
            evaluate_and_log_metrics(y_val, y_val_pred)
            
            feature_names = list(X_train.columns)
            numeric_indices = [
                i for i, col in enumerate(feature_names) 
                if X_train[col].dtype in ["float64", "int64", "float32", "int32"]
            ]
            
            save_artifacts(model, anomaly_model, preprocessor, feature_names, numeric_indices)
            
            mlflow.sklearn.log_model(
                sk_model=model, 
                artifact_path="mdr_classifier",
                skops_trusted_types=["xgboost.core.Booster", "xgboost.sklearn.XGBClassifier"]
            )
            mlflow.sklearn.log_model(
                sk_model=anomaly_model, 
                artifact_path="anomaly_detector"
            )
            
            logger.info("Pipeline executed successfully. All artifacts registered.")
            
    except Exception as e:
        logger.exception(f"Pipeline execution aborted due to unhandled error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
