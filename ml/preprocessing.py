"""Dataset loading, feature preparation, and Scikit-learn preprocessing pipelines.

Provides modular, leak-free preprocessing pipelines for both the classifier and regressor,
supporting categorical one-hot encoding with unknown category safety.
"""
import os
from pathlib import Path
from typing import Tuple
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
DATASET_PATH = Path(os.getenv("DATASET_PATH")) if os.getenv("DATASET_PATH") else (DATA_DIR / "sample_sensor_data.csv")
MODEL_DIR = Path(os.getenv("MODEL_DIR")) if os.getenv("MODEL_DIR") else (Path(__file__).resolve().parent / "saved_models")

# Feature definitions
NUMERIC_FEATURES = [
    "soil_moisture",
    "temperature",
    "humidity",
    "rainfall",
    "forecast_rainfall",
]

CATEGORICAL_FEATURES = [
    "soil_type",
    "crop_type",
    "growth_stage",
]

FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES

# Target definitions
CLASS_TARGET = "irrigation_needed"
REG_TARGET = "water_liters_per_acre"
REG_TARGET_ALIAS = "water_liters"

# Categories and reference encodings
SOIL_CODES = {"Sandy": 0, "Loamy": 1, "Clay": 2, "Silty": 3}
CROP_CODES = {"Wheat": 0, "Rice": 1, "Maize": 2, "Cotton": 3, "Vegetables": 4}
STAGE_CODES = {"Seedling": 0, "Vegetative": 1, "Flowering": 2, "Maturity": 3}


def ensure_dataset() -> Path:
    """Ensure the synthetic CSV exists; if missing, generate it reproducibly."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DATASET_PATH.exists():
        from ml.generate_data import generate_dataset
        generate_dataset(output_path=DATASET_PATH, rows=2400, seed=42)
    return DATASET_PATH


def load_dataset() -> pd.DataFrame:
    """Load the dataset from disk and verify required features and targets exist."""
    path = ensure_dataset()
    frame = pd.read_csv(path)

    # Ensure required columns exist
    required_cols = set(FEATURE_COLUMNS + [CLASS_TARGET])
    # Either REG_TARGET or REG_TARGET_ALIAS must exist
    if REG_TARGET not in frame.columns and REG_TARGET_ALIAS in frame.columns:
        frame[REG_TARGET] = frame[REG_TARGET_ALIAS]
    elif REG_TARGET_ALIAS not in frame.columns and REG_TARGET in frame.columns:
        frame[REG_TARGET_ALIAS] = frame[REG_TARGET]

    missing = required_cols - set(frame.columns)
    if missing:
        raise ValueError(f"Dataset is missing required columns: {sorted(missing)}")
    return frame


def create_preprocessor() -> ColumnTransformer:
    """Create a leak-free Scikit-learn ColumnTransformer for numerical and categorical features.

    - Numerical features: Median imputation + StandardScaler
    - Categorical features: Most-frequent imputation + OneHotEncoder (handle_unknown='ignore')
    """
    numeric_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, NUMERIC_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )
    return preprocessor


def split_xy(
    frame: pd.DataFrame,
    target: str = CLASS_TARGET,
    test_size: float = 0.2,
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """Split dataset into separate train and test sets BEFORE any preprocessing.

    Prevents data leakage by ensuring all scalers and encoders are fitted
    strictly on training folds only.
    """
    actual_target = target
    if target not in frame.columns:
        if target == REG_TARGET and REG_TARGET_ALIAS in frame.columns:
            actual_target = REG_TARGET_ALIAS
        elif target == REG_TARGET_ALIAS and REG_TARGET in frame.columns:
            actual_target = REG_TARGET

    X = frame[FEATURE_COLUMNS].copy()
    y = frame[actual_target].copy()

    # Stratify for classification to maintain class proportions
    stratify = y if actual_target == CLASS_TARGET else None

    return train_test_split(
        X, y,
        test_size=test_size,
        random_state=random_state,
        stratify=stratify
    )
