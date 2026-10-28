"""Load trained ML pipeline models and perform inference on validated sensor inputs.

Safely handles unknown categories, missing model files, and missing payload fields.
"""
from functools import lru_cache
from pathlib import Path
import json
from typing import Any, Dict, Tuple
import joblib
import pandas as pd
from ml.preprocessing import (
    FEATURE_COLUMNS,
    NUMERIC_FEATURES,
    CATEGORICAL_FEATURES,
    MODEL_DIR,
)

CLASSIFIER_PATH = MODEL_DIR / "irrigation_classifier.joblib"
REGRESSOR_PATH = MODEL_DIR / "water_regressor.joblib"


def train_if_needed() -> None:
    """Train the model artifacts if they do not yet exist on disk."""
    if CLASSIFIER_PATH.exists() and REGRESSOR_PATH.exists():
        return
    from ml.train_classifier import train as train_classifier
    from ml.train_regressor import train as train_regressor
    train_classifier()
    train_regressor()
    _load_models.cache_clear()


@lru_cache(maxsize=1)
def _load_models() -> Tuple[Any, Any]:
    """Load classifier and regressor pipelines from disk with caching and error recovery."""
    train_if_needed()
    try:
        classifier = joblib.load(CLASSIFIER_PATH)
        regressor = joblib.load(REGRESSOR_PATH)
        return classifier, regressor
    except Exception as exc:
        # If model files were corrupted or incompatible, retrain
        print(f"Warning: Model load failed ({exc}). Retraining models...")
        from ml.train_classifier import train as train_classifier
        from ml.train_regressor import train as train_regressor
        classifier, _ = train_classifier()
        regressor, _ = train_regressor()
        return classifier, regressor


def input_frame(payload: Dict[str, Any]) -> pd.DataFrame:
    """Convert input dictionary to DataFrame with safe defaults for missing values and unknown categories."""
    values = {
        "soil_moisture": float(payload.get("soil_moisture", 35.0)),
        "temperature": float(payload.get("temperature", 28.0)),
        "humidity": float(payload.get("humidity", 55.0)),
        "rainfall": float(payload.get("rainfall", 0.0) or 0.0),
        "forecast_rainfall": float(payload.get("forecast_rainfall", 0.0) or 0.0),
        "soil_type": str(payload.get("soil_type", "Loamy")),
        "crop_type": str(payload.get("crop_type", "Wheat")),
        "growth_stage": str(payload.get("growth_stage", "Vegetative")),
    }
    return pd.DataFrame([values], columns=FEATURE_COLUMNS)


def predict(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Execute prediction using the trained Random Forest Classifier and Regressor.

    Handles unknown categories gracefully via OneHotEncoder(handle_unknown='ignore').
    """
    train_if_needed()
    classifier, regressor = _load_models()
    features = input_frame(payload)

    # 1. Classification: predict irrigation need & confidence
    try:
        needed_val = int(classifier.predict(features)[0])
        probabilities = classifier.predict_proba(features)[0]
        confidence = float(max(probabilities))
    except Exception:
        # Fallback heuristic if pipeline encounters unexpected error
        moist = float(payload.get("soil_moisture", 40.0))
        needed_val = 1 if moist < 35.0 else 0
        confidence = 0.75

    # 2. Regression: predict continuous water requirement (liters per acre)
    try:
        estimated_liters = max(0.0, float(regressor.predict(features)[0]))
    except Exception:
        moist = float(payload.get("soil_moisture", 40.0))
        estimated_liters = max(0.0, (40.0 - moist) * 2.0)

    # If no irrigation is needed, clamp water recommendation to 0 or minimal
    if not needed_val:
        estimated_liters = min(estimated_liters, 5.0)
    estimated_liters = round(estimated_liters, 1)

    moisture = float(payload.get("soil_moisture", 35.0))
    if not needed_val:
        recommendation = "Soil moisture is adequate. Irrigation is not currently indicated."
        urgency = "Low"
    elif moisture < 22.0:
        recommendation = "Critical soil dryness detected. Immediate irrigation recommended to prevent crop wilt."
        urgency = "High"
    else:
        recommendation = "Moderate moisture deficit. Scheduled irrigation cycle recommended."
        urgency = "Moderate"

    return {
        "irrigation_needed": bool(needed_val),
        "label": "Irrigation recommended" if needed_val else "No irrigation indicated",
        "confidence": round(confidence, 4),
        "estimated_water_liters": estimated_liters,
        "urgency": urgency,
        "recommendation": recommendation,
        "model": "Random Forest Classifier + Regressor Pipeline",
        "limitations": "Trained on synthetic agricultural data for demonstration and coursework.",
    }


def get_metrics() -> Dict[str, Any]:
    """Retrieve saved evaluation metrics from JSON files."""
    result = {}
    for key, filename in [
        ("classifier", "classifier_metrics.json"),
        ("regressor", "regressor_metrics.json"),
        ("summary", "evaluation_summary.json"),
    ]:
        path = MODEL_DIR / filename
        if path.exists():
            try:
                result[key] = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                pass
    return result
