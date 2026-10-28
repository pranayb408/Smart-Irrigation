"""Pydantic request and response models for the Smart Irrigation API."""
from datetime import datetime
from typing import Literal, Optional, Any, Dict, List, Union
from pydantic import BaseModel, Field, ConfigDict

SoilType = Literal["Sandy", "Loamy", "Clay", "Silty"]
CropType = str
GrowthStage = Literal["Seedling", "Vegetative", "Flowering", "Maturity"]
IrrigationMethod = Literal["Drip", "Sprinkler", "Furrow", "Basin"]
SourceType = Literal["esp32_iot", "manual", "simulated", "sensor"]


# --- Field Setup Schemas ---

class FieldBase(BaseModel):
    name: str = Field(min_length=1, max_length=100, description="Field identifier")
    area_acres: float = Field(default=1.0, gt=0, le=5000, description="Field area in acres")
    crop_type: str = Field(default="Wheat", min_length=1, max_length=50, description="Crop type")
    planting_date: str = Field(description="Planting date in YYYY-MM-DD")
    growth_stage: str = Field(default="Vegetative", max_length=50, description="Current growth stage")
    soil_type: str = Field(default="Loamy", max_length=50, description="Soil texture type")
    irrigation_method: str = Field(default="Drip", max_length=50, description="Irrigation application method")
    flow_rate_lpm: float = Field(default=50.0, gt=0, le=10000, description="Pump/system discharge in Liters Per Minute")
    location: Optional[str] = Field(default="Main Block", max_length=150)
    device_id: Optional[str] = Field(default=None, max_length=50, description="Associated ESP32 Node ID")
    sensor_cal_air: int = Field(default=3200, ge=500, le=4095, description="Dry sensor ADC calibration")
    sensor_cal_water: int = Field(default=1450, ge=100, le=3500, description="Submerged sensor ADC calibration")
    target_moisture_min: float = Field(default=30.0, ge=5, le=90)
    target_moisture_max: float = Field(default=60.0, ge=10, le=100)
    reference_water_budget_l: float = Field(default=420000.0, ge=0, description="Seasonal water budget target in Liters")


class FieldCreate(FieldBase):
    pass


class FieldUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    area_acres: Optional[float] = Field(default=None, gt=0, le=5000)
    crop_type: Optional[str] = None
    planting_date: Optional[str] = None
    growth_stage: Optional[str] = None
    soil_type: Optional[str] = None
    irrigation_method: Optional[str] = None
    flow_rate_lpm: Optional[float] = Field(default=None, gt=0, le=10000)
    location: Optional[str] = None
    device_id: Optional[str] = None
    sensor_cal_air: Optional[int] = None
    sensor_cal_water: Optional[int] = None
    target_moisture_min: Optional[float] = None
    target_moisture_max: Optional[float] = None
    reference_water_budget_l: Optional[float] = None


class FieldResponse(FieldBase):
    id: int
    created_at: str
    latest_reading: Optional[Dict[str, Any]] = None
    total_water_applied_liters: float = 0.0
    budget_percent_used: float = 0.0


# --- Sensor & IoT Schemas ---

class SensorInput(BaseModel):
    soil_moisture: float = Field(ge=0, le=100, description="Soil moisture percentage")
    temperature: float = Field(ge=-20, le=60, description="Air temperature in Celsius")
    humidity: float = Field(ge=0, le=100, description="Relative humidity percentage")
    rainfall: float = Field(default=0, ge=0, le=300, description="Recent rainfall in mm")
    forecast_rainfall: float = Field(default=0, ge=0, le=300, description="Forecast rainfall in mm")
    soil_type: Optional[str] = Field(default=None, max_length=50)
    crop_type: Optional[str] = Field(default=None, min_length=1, max_length=50)
    growth_stage: Optional[str] = Field(default=None, max_length=50)
    field_name: str = Field(default="North Field", min_length=1, max_length=80)
    data_source: Optional[str] = Field(default="sensor", max_length=50, description="Source of reading")
    # Optional field-specific overrides
    field_id: Optional[int] = None
    area_acres: Optional[float] = Field(default=None, gt=0)
    flow_rate_lpm: Optional[float] = Field(default=None, gt=0)
    flow_rate_lph: Optional[float] = Field(
        default=None, gt=0,
        description="System flow rate in Litres Per Hour — used to calculate irrigation runtime."
    )
    irrigation_method: Optional[str] = Field(default="Drip", max_length=50)


class SensorReadingCreate(SensorInput):
    timestamp: Optional[Union[datetime, str]] = Field(default=None, description="Timestamp of sensor reading")
    notes: Optional[str] = Field(default=None, max_length=300)
    source_type: Optional[str] = Field(default=None, max_length=50)
    device_id: Optional[str] = None
    raw_analog_value: Optional[int] = Field(default=None, ge=0, le=4095)
    battery_voltage: Optional[float] = Field(default=None, ge=0, le=6.0)


class ESP32TelemetryCreate(BaseModel):
    device_id: str = Field(min_length=1, max_length=50)
    field_name: Optional[str] = None
    field_id: Optional[int] = None
    raw_moisture: Optional[int] = Field(default=None, ge=0, le=4095)
    soil_moisture: Optional[float] = Field(default=None, ge=0, le=100)
    temperature: float = Field(ge=-20, le=60)
    humidity: float = Field(ge=0, le=100)
    battery_voltage: Optional[float] = Field(default=None, ge=0, le=6.0)
    rainfall: Optional[float] = 0.0


class SensorReading(SensorInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timestamp: Union[datetime, str]
    data_source: str = "sensor"
    notes: Optional[str] = None
    source_type: Optional[str] = "sensor"
    device_id: Optional[str] = None
    raw_analog_value: Optional[int] = None
    battery_voltage: Optional[float] = None
    field_id: Optional[int] = None


SensorReadingResponse = SensorReading


# --- Prediction & Decision Support Schemas ---

class PredictionResult(BaseModel):
    id: Optional[int] = None
    timestamp: Optional[str] = None
    irrigation_needed: bool
    label: str
    confidence: float
    estimated_water_liters: float
    agronomic_water_liters: Optional[float] = None
    ml_baseline_liters: Optional[float] = None
    urgency: str
    recommendation: str
    why_explanation: Optional[str] = None
    rain_explanation: Optional[str] = None
    runtime_minutes: Optional[float] = None
    runtime_formatted: Optional[str] = None
    flow_rate_lpm: Optional[float] = None
    area_acres: Optional[float] = None
    irrigation_method: Optional[str] = None
    rainfall_credit_liters: Optional[float] = None
    next_check_hours: Optional[int] = None
    field_capacity_pct: Optional[float] = None
    stress_threshold_pct: Optional[float] = None
    daily_crop_water_loss_mm: Optional[float] = None
    model: str
    limitations: str
    fallback_guide: Optional[Dict[str, Any]] = None
    input: dict


class PredictionRecord(BaseModel):
    id: int
    timestamp: str
    field_name: str
    irrigation_needed: bool
    confidence: float
    estimated_water_liters: float
    urgency: str
    recommendation: str
    soil_moisture: float
    crop_type: str
    field_id: Optional[int] = None
    agronomic_liters: Optional[float] = None
    runtime_minutes: Optional[float] = None
    rainfall_adjustment: Optional[float] = None
    next_check_hours: Optional[int] = None


# --- Irrigation Event & Water Budgeting Schemas ---

class IrrigationEventBase(BaseModel):
    field_name: Optional[str] = Field(default="North Field", max_length=100)
    field_area: float = Field(default=1.0, gt=0, description="Field area in acres or hectares")
    water_volume: Optional[float] = Field(default=None, ge=0, description="Water volume delivered in Liters")
    irrigation_duration: Optional[float] = Field(default=None, gt=0, description="Irrigation duration in minutes")
    measurement_source: str = Field(default="manual", max_length=50, description="Measurement source (flow_meter, manual, estimated)")
    method: str = Field(default="Drip", max_length=50)
    flow_rate_lpm: Optional[float] = Field(default=50.0, gt=0)
    operator_notes: Optional[str] = Field(default=None, max_length=300)
    field_id: Optional[int] = None

    # Aliases for compatibility
    liters_applied: Optional[float] = Field(default=None, ge=0, description="Alias for water_volume")
    duration_minutes: Optional[float] = Field(default=None, gt=0, description="Alias for irrigation_duration")


class IrrigationEventCreate(IrrigationEventBase):
    timestamp: Optional[Union[datetime, str]] = None


class IrrigationEventResponse(IrrigationEventBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timestamp: Union[datetime, str]
    water_volume: float
    irrigation_duration: float
    field_area: float
    measurement_source: str


# Aliases for existing water budget route compatibility
class IrrigationLogCreate(IrrigationEventCreate):
    duration_minutes: float = Field(default=60.0, gt=0, le=1440, description="Duration of irrigation session in minutes")
    liters_applied: Optional[float] = Field(default=None, ge=0, description="Total liters applied; auto-computed from flow rate if omitted")


class IrrigationLogResponse(BaseModel):
    id: int
    field_id: Optional[int]
    field_name: str
    timestamp: str
    liters_applied: float
    duration_minutes: float
    method: str
    flow_rate_lpm: Optional[float]
    operator_notes: Optional[str]
    water_volume: Optional[float] = None
    irrigation_duration: Optional[float] = None
    field_area: Optional[float] = None
    measurement_source: Optional[str] = None


# --- Health Schema ---

class HealthResponse(BaseModel):
    status: str
    database: str
    ml_models: Optional[str] = None
    modules: Optional[List[str]] = None
    timestamp: Optional[str] = None
