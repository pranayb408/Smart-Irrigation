"""Train a Scikit-learn Random Forest Regressor pipeline for water volume estimation.

Uses an end-to-end ColumnTransformer pipeline with one-hot encoding for categorical attributes
and imputation/scaling for numerical attributes.
"""
from pathlib import Path
import json
import joblib
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from ml.preprocessing import (
    load_dataset,
    split_xy,
    create_preprocessor,
    REG_TARGET,
    MODEL_DIR,
)

MODEL_PATH = MODEL_DIR / "water_regressor.joblib"
METRICS_PATH = MODEL_DIR / "regressor_metrics.json"


def train():
    """Train Random Forest Regressor pipeline on training data, evaluate on held-out test data."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    frame = load_dataset()

    # Split dataset BEFORE preprocessing to prevent data leakage
    X_train, X_test, y_train, y_test = split_xy(frame, target=REG_TARGET, test_size=0.2, random_state=42)

    # Construct end-to-end Pipeline with preprocessing and model
    preprocessor = create_preprocessor()
    regressor = RandomForestRegressor(
        n_estimators=180,
        max_depth=14,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", regressor),
    ])

    # Fit pipeline strictly on training data
    pipeline.fit(X_train, y_train)

    # Evaluate on held-out test set
    predictions = pipeline.predict(X_test)

    # Calculate actual held-out error metrics
    mae = float(mean_absolute_error(y_test, predictions))
    try:
        from sklearn.metrics import root_mean_squared_error
        rmse = float(root_mean_squared_error(y_test, predictions))
    except ImportError:
        rmse = float(mean_squared_error(y_test, predictions) ** 0.5)
    r2 = float(r2_score(y_test, predictions))

    # Extract feature names and importances from fitted pipeline
    try:
        encoded_feature_names = pipeline.named_steps["preprocessor"].get_feature_names_out().tolist()
        importances = {
            feat.replace("num__", "").replace("cat__", ""): round(float(imp), 4)
            for feat, imp in zip(encoded_feature_names, pipeline.named_steps["regressor"].feature_importances_)
        }
    except Exception:
        importances = {}

    metrics = {
        "model_type": "RandomForestRegressor Pipeline",
        "target_variable": REG_TARGET,
        "total_samples": int(len(frame)),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "r2_score": round(r2, 4),
        "mae_liters": round(mae, 3),   # Compatibility alias
        "rmse_liters": round(rmse, 3), # Compatibility alias
        "feature_importances": importances,
        "data_note": "Evaluated on held-out test split of synthetic agricultural data.",
    }

    # Save trained pipeline and evaluation metrics
    joblib.dump(pipeline, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print(f"Regressor saved: {MODEL_PATH}")
    print(f"Held-out MAE: {metrics['mae']:.2f} Liters")
    print(f"Held-out RMSE: {metrics['rmse']:.2f} Liters")
    print(f"Held-out R² Score: {metrics['r2_score']:.4f}")

    return pipeline, metrics


if __name__ == "__main__":
    train()
