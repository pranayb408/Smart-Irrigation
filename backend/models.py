"""SQLAlchemy database models for AI Smart Irrigation.

Exposes declarative models for:
- SensorReading: agricultural sensor telemetry (moisture, temp, humidity, rain, crop, data_source)
- IrrigationEvent: completed irrigation records (field_area, water_volume, duration, measurement_source)
- FieldRecord: registered farm plots and irrigation configurations
- PredictionRecord: logged ML and agronomic decision-support outputs
"""
from backend.database import (
    Base,
    SensorReading,
    IrrigationEvent,
    FieldRecord,
    PredictionRecord,
)

__all__ = [
    "Base",
    "SensorReading",
    "IrrigationEvent",
    "FieldRecord",
    "PredictionRecord",
]

