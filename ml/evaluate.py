"""Comprehensive evaluation script for AI Smart Irrigation ML pipelines.

Trains both the Random Forest Classifier and Regressor on training splits,
computes held-out metrics (accuracy, precision, recall, f1, confusion matrix, MAE, RMSE, R²),
prints a structured summary, and persists results to JSON.
"""
from pathlib import Path
import json
from ml.train_classifier import train as train_classifier, METRICS_PATH as CLASSIFIER_METRICS_PATH
from ml.train_regressor import train as train_regressor, METRICS_PATH as REGRESSOR_METRICS_PATH
from ml.preprocessing import MODEL_DIR

SUMMARY_PATH = MODEL_DIR / "evaluation_summary.json"


def evaluate_all() -> dict:
    """Execute training and evaluation for both models, generating combined metrics summary."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("Step 1: Training & Evaluating Random Forest Classifier...")
    print("=" * 60)
    _, classifier_metrics = train_classifier()

    print("\n" + "=" * 60)
    print("Step 2: Training & Evaluating Random Forest Regressor...")
    print("=" * 60)
    _, regressor_metrics = train_regressor()

    summary = {
        "project": "AI Smart Irrigation & Water Conservation ML Models",
        "evaluation_type": "Held-Out Test Set (20% split, random_state=42)",
        "classifier": {
            "model": classifier_metrics["model_type"],
            "accuracy": classifier_metrics["accuracy"],
            "precision": classifier_metrics["precision"],
            "recall": classifier_metrics["recall"],
            "f1_score": classifier_metrics["f1_score"],
            "confusion_matrix": classifier_metrics["confusion_matrix"],
            "test_samples": classifier_metrics["test_samples"],
        },
        "regressor": {
            "model": regressor_metrics["model_type"],
            "target": regressor_metrics["target_variable"],
            "mae": regressor_metrics["mae"],
            "rmse": regressor_metrics["rmse"],
            "r2_score": regressor_metrics["r2_score"],
            "test_samples": regressor_metrics["test_samples"],
        },
        "data_note": "Trained and evaluated on synthetic agricultural sensor data. Intended for coursework/decision-support prototyping.",
    }

    SUMMARY_PATH.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Classifier Accuracy : {summary['classifier']['accuracy']:.2%}")
    print(f"Classifier Precision: {summary['classifier']['precision']:.4f}")
    print(f"Classifier Recall   : {summary['classifier']['recall']:.4f}")
    print(f"Classifier F1-Score : {summary['classifier']['f1_score']:.4f}")
    print(f"Confusion Matrix    : {summary['classifier']['confusion_matrix']}")
    print("-" * 60)
    print(f"Regressor MAE       : {summary['regressor']['mae']:.2f} L/acre")
    print(f"Regressor RMSE      : {summary['regressor']['rmse']:.2f} L/acre")
    print(f"Regressor R² Score  : {summary['regressor']['r2_score']:.4f}")
    print("=" * 60)
    print(f"Saved evaluation summary to: {SUMMARY_PATH}")

    return summary


def main():
    evaluate_all()


if __name__ == "__main__":
    main()
