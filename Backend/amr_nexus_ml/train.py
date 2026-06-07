import click
from src.data.loader import load_training_data
from src.features.preprocessing import FeaturePreprocessor
from src.models.train import train_mdr_classifier, train_anomaly_detector, save_artifacts
from src.utils.logger import logger

@click.command()
@click.option('--limit', default=None, type=int, help='Limit number of records')
def main(limit):
    logger.info("Starting training pipeline")
    df = load_training_data(limit=limit)
    if df.empty:
        logger.error("No data found")
        return
    
    preprocessor = FeaturePreprocessor()
    preprocessor.fit(df)
    X = preprocessor.transform(df)
    y = df['mdr_flag'].astype(int)
    
    logger.info(f"Feature matrix shape: {X.shape}")
    model = train_mdr_classifier(X, y)
    anomaly_model = train_anomaly_detector(X)
    
    feature_names = list(X.columns)
    numeric_indices = [i for i, col in enumerate(feature_names) if X[col].dtype in ['float64', 'int64']]
    save_artifacts(model, anomaly_model, preprocessor, feature_names, numeric_indices)
    logger.info("Training completed successfully")

if __name__ == "__main__":
    main()