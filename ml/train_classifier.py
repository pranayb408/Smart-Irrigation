"""Train a Scikit-learn Random Forest Classifier pipeline for irrigation need prediction.

Uses a leak-free ColumnTransformer pipeline with one-hot encoding for categorical variables
and robust imputation/scaling for numerical variables.
"""
from pathlib import Path
import json
import joblib
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)
from ml.preprocessing import (
    load_dataset,
    split_xy,
    create_preprocessor,
    CLASS_TARGET,
    MODEL_DIR,
)

MODEL_PATH = MODEL_DIR / "irrigation_classifier.joblib"
METRICS_PATH = MODEL_DIR / "classifier_metrics.json"


def train():
    """Train Random Forest Classifier pipeline on training data, evaluate on held-out test data."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    frame = load_dataset()

    # Split dataset BEFORE preprocessing to prevent data leakage
    X_train, X_test, y_train, y_test = split_xy(frame, target=CLASS_TARGET, test_size=0.2, random_state=42)

    # Construct end-to-end Pipeline with preprocessing and model
    preprocessor = create_preprocessor()
    classifier = RandomForestClassifier(
        n_estimators=180,
        max_depth=12,
        min_samples_leaf=2,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1,
    )

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", classifier),
    ])

    # Fit pipeline strictly on training data
    pipeline.fit(X_train, y_train)

    # Evaluate on held-out test set
    predictions = pipeline.predict(X_test)

    # Extract feature names and importances from fitted pipeline
    try:
        encoded_feature_names = pipeline.named_steps["preprocessor"].get_feature_names_out().tolist()
        importances = {
            feat.replace("num__", "").replace("cat__", ""): round(float(imp), 4)
            for feat, imp in zip(encoded_feature_names, pipeline.named_steps["classifier"].feature_importances_)
        }
    except Exception:
        importances = {}

    cm = confusion_matrix(y_test, predictions).tolist()

    metrics = {
        "model_type": "RandomForestClassifier Pipeline",
        "total_samples": int(len(frame)),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "precision": round(float(precision_score(y_test, predictions, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, predictions, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, predictions, zero_division=0)), 4),
        "confusion_matrix": cm,
        "classification_report": classification_report(y_test, predictions, output_dict=True, zero_division=0),
        "feature_importances": importances,
        "data_note": "Evaluated on held-out test split of synthetic agricultural data.",
    }

    # Save trained pipeline and evaluation metrics
    joblib.dump(pipeline, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print(f"Classifier saved: {MODEL_PATH}")
    print(f"Held-out Accuracy: {metrics['accuracy']:.2%}")
    print(f"Held-out F1-Score: {metrics['f1_score']:.4f}")
    print(f"Confusion Matrix:\n  [TN: {cm[0][0]}, FP: {cm[0][1]}]\n  [FN: {cm[1][0]}, TP: {cm[1][1]}]")

    return pipeline, metrics


if __name__ == "__main__":
    train()
