"""Generate a clearly labelled, reproducible synthetic agricultural sensor dataset.

This synthetic dataset models agronomic relationships (soil retention, evapotranspiration,
crop water demand by growth stage, and rainfall offset) for training educational
machine learning pipelines.

Dataset output: data/sample_sensor_data.csv
Targets generated:
- irrigation_needed (binary classification: 1 = irrigation required, 0 = no irrigation)
- water_liters_per_acre (regression: continuous water volume required per acre)
"""
from pathlib import Path
import argparse
import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
DATASET_PATH = DATA_DIR / "sample_sensor_data.csv"

SOIL_TYPES = ["Sandy", "Loamy", "Clay", "Silty"]
CROP_TYPES = ["Wheat", "Rice", "Maize", "Cotton", "Vegetables"]
GROWTH_STAGES = ["Seedling", "Vegetative", "Flowering", "Maturity"]

SOIL_CODES = {"Sandy": 0, "Loamy": 1, "Clay": 2, "Silty": 3}
CROP_CODES = {"Wheat": 0, "Rice": 1, "Maize": 2, "Cotton": 3, "Vegetables": 4}
STAGE_CODES = {"Seedling": 0, "Vegetative": 1, "Flowering": 2, "Maturity": 3}


def generate_dataset(
    output_path: Path = DATASET_PATH,
    rows: int = 2400,
    seed: int = 42
) -> pd.DataFrame:
    """Generate reproducible synthetic sensor data with agronomic relationships."""
    rng = np.random.default_rng(seed)

    # 1. Sample categorical attributes with realistic field distributions
    soil = rng.choice(SOIL_TYPES, size=rows, p=[0.25, 0.35, 0.22, 0.18])
    crop = rng.choice(CROP_TYPES, size=rows, p=[0.25, 0.20, 0.20, 0.15, 0.20])
    stage = rng.choice(GROWTH_STAGES, size=rows, p=[0.20, 0.35, 0.30, 0.15])

    # 2. Environmental measurements with realistic microclimate correlations
    # Soil moisture (%): 5% (extreme drought) to 90% (saturated)
    moisture = np.clip(rng.normal(42, 17, rows), 5.0, 92.0)

    # Ambient temperature (°C): 12°C to 45°C
    temperature = np.clip(rng.normal(29.5, 6.2, rows), 10.0, 46.0)

    # Relative humidity (%): inversely correlated with high temperature
    humidity_base = 65.0 - (temperature - 28.0) * 1.8
    humidity = np.clip(rng.normal(humidity_base, 14.0, rows), 15.0, 98.0)

    # Recent rainfall (mm): gamma distributed (mostly zero or light showers)
    rainfall = np.clip(rng.gamma(shape=1.2, scale=2.5, size=rows), 0.0, 45.0)

    # 24-48h forecast rainfall (mm)
    forecast_rain = np.clip(rng.gamma(shape=1.0, scale=3.0, size=rows), 0.0, 50.0)

    # 3. Agronomic demand factors
    # Critical soil moisture thresholds by soil type (Sandy loses water fastest)
    soil_threshold = np.select(
        [soil == "Sandy", soil == "Loamy", soil == "Clay", soil == "Silty"],
        [45.0, 38.0, 32.0, 36.0],
        default=38.0
    )

    # Crop water consumption coefficient
    crop_kc = np.select(
        [crop == "Rice", crop == "Vegetables", crop == "Maize", crop == "Cotton", crop == "Wheat"],
        [1.25, 1.10, 1.05, 0.95, 0.85],
        default=1.0
    )

    # Growth stage coefficient (Flowering is the peak transpiration stage)
    stage_mult = np.select(
        [stage == "Flowering", stage == "Vegetative", stage == "Seedling", stage == "Maturity"],
        [1.25, 1.05, 0.80, 0.60],
        default=1.0
    )

    # Atmospheric drying stress (higher at high temp + low humidity)
    evap_demand = np.maximum(0.0, (temperature - 22.0) * 0.45) * (1.0 + (50.0 - humidity) * 0.01)

    # Effective water credit from rainfall
    rain_offset = rainfall * 0.70 + forecast_rain * 0.40

    # Net soil deficit score (positive means dry/stress, negative means充足/wet)
    deficit_score = (
        (soil_threshold - moisture)
        + evap_demand * 1.5
        + (crop_kc * stage_mult - 1.0) * 10.0
        - rain_offset * 0.60
    )

    # Add realistic sensor & environmental noise
    noise = rng.normal(0.0, 2.8, rows)
    total_stress = deficit_score + noise

    # Target 1: Classification target (irrigation_needed: 1 if stress exceeds threshold)
    irrigation_needed = (total_stress > 4.5).astype(int)

    # Target 2: Regression target (water_liters_per_acre)
    # Scaled continuous application volume: 0 if no irrigation needed,
    # otherwise proportional to deficit, crop demand, and atmospheric loss
    base_water = np.maximum(
        0.0,
        (deficit_score + 6.0) * 3.2 * crop_kc * stage_mult + rng.normal(0.0, 2.5, rows)
    )
    water_liters_per_acre = np.where(
        irrigation_needed == 1,
        np.clip(base_water, 8.0, 88.0),
        0.0
    )

    # Encode integer codes for optional numeric consumers
    soil_code = np.array([SOIL_CODES[s] for s in soil])
    crop_code = np.array([CROP_CODES[c] for c in crop])
    stage_code = np.array([STAGE_CODES[g] for g in stage])

    frame = pd.DataFrame({
        "soil_moisture": moisture.round(2),
        "temperature": temperature.round(2),
        "humidity": humidity.round(2),
        "rainfall": rainfall.round(2),
        "forecast_rainfall": forecast_rain.round(2),
        "soil_type": soil,
        "crop_type": crop,
        "growth_stage": stage,
        # Numeric code columns for backward compatibility
        "growth_stage_name": stage,
        "soil_type_code": soil_code,
        "crop_type_code": crop_code,
        "growth_stage_code": stage_code,
        # Primary targets
        "irrigation_needed": irrigation_needed,
        "water_liters_per_acre": water_liters_per_acre.round(2),
        # Alias target for compatibility with existing tests and scripts
        "water_liters": water_liters_per_acre.round(2),
    })

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(output_path, index=False)
    return frame


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic irrigation sensor data")
    parser.add_argument("--rows", type=int, default=2400)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=Path, default=DATASET_PATH)
    args = parser.parse_args()
    df = generate_dataset(args.output, args.rows, args.seed)
    print(f"Successfully generated {len(df)} synthetic rows to: {args.output}")
    print(f"Class distribution: {df['irrigation_needed'].value_counts().to_dict()}")
