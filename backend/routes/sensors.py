"""Routes for incoming sensor readings, ESP32 IoT telemetry, and device diagnostics."""
from datetime import datetime, timezone
import random
from fastapi import APIRouter, HTTPException, Query
from backend.schemas import SensorReadingCreate, ESP32TelemetryCreate
from backend.database import create_reading, list_readings, get_device_statuses, get_field, get_field_by_name

router = APIRouter(prefix="/api", tags=["Sensors & IoT"])


@router.get("/readings")
def get_readings(
    limit: int = Query(default=100, ge=1, le=500),
    field_name: str | None = None,
    field_id: int | None = None,
):
    """Retrieve historical sensor readings with optional field filter."""
    items = list_readings(limit, field_name, field_id)
    return {"items": items, "count": len(items)}


@router.post("/readings", status_code=201)
def add_reading(payload: SensorReadingCreate):
    """Save a sensor measurement entered manually or by an external system."""
    try:
        data = payload.model_dump()
        if not data.get("data_source") and data.get("source_type"):
            data["data_source"] = data["source_type"]
        elif not data.get("source_type") and data.get("data_source"):
            data["source_type"] = data["data_source"]
        saved = create_reading(data)
        return {"item": saved, "message": "Sensor reading saved successfully."}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not save sensor reading: {str(exc)}") from exc


@router.post("/sensors/ingest", status_code=201)
@router.post("/iot/reading", status_code=201, include_in_schema=False)
def ingest_esp32_telemetry(payload: ESP32TelemetryCreate):
    """ESP32-compatible IoT telemetry ingestion endpoint.

    Accepts raw capacitive/resistive sensor ADC (0-4095) or computed percentage,
    applies field calibration curves, logs battery voltage and device ID.
    """
    try:
        # Resolve target field
        field = None
        if payload.field_id:
            field = get_field(payload.field_id)
        elif payload.field_name:
            field = get_field_by_name(payload.field_name)

        cal_air = field["sensor_cal_air"] if field else 3200
        cal_water = field["sensor_cal_water"] if field else 1450

        # Calculate calibrated moisture from raw ADC if provided
        moisture = payload.soil_moisture
        raw_val = payload.raw_moisture
        if moisture is None and raw_val is not None:
            # Typical capacitive sensor: higher ADC = drier air; lower ADC = submerged
            span = max(100, cal_air - cal_water)
            calc_pct = ((cal_air - raw_val) / span) * 100.0
            moisture = round(max(0.0, min(100.0, calc_pct)), 1)
        elif moisture is None:
            moisture = 40.0

        # Build reading record
        reading_dict = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "field_name": field["name"] if field else (payload.field_name or "North Field"),
            "field_id": field["id"] if field else payload.field_id,
            "soil_moisture": moisture,
            "temperature": payload.temperature,
            "humidity": payload.humidity,
            "rainfall": payload.rainfall or 0.0,
            "forecast_rainfall": 0.0,
            "soil_type": field["soil_type"] if field else "Loamy",
            "crop_type": field["crop_type"] if field else "Wheat",
            "growth_stage": field["growth_stage"] if field else "Vegetative",
            "notes": f"IoT telemetry from {payload.device_id}",
            "source_type": "esp32_iot",
            "device_id": payload.device_id,
            "raw_analog_value": raw_val,
            "battery_voltage": payload.battery_voltage or 4.0,
        }

        saved = create_reading(reading_dict)
        return {
            "status": "success",
            "reading_id": saved["id"],
            "calibrated_moisture": moisture,
            "field": reading_dict["field_name"],
            "device_id": payload.device_id,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"IoT Ingestion Error: {str(exc)}") from exc


@router.get("/sensors/devices")
def get_iot_devices():
    """List active IoT field sensor nodes, last seen time, battery, and signal health."""
    devices = get_device_statuses()
    return {"devices": devices, "count": len(devices)}


@router.post("/sensors/simulate", status_code=201)
def simulate_reading(field_id: int | None = Query(default=None)):
    """Generate a realistic simulated reading for a field (ideal for demonstrations)."""
    field = get_field(field_id) if field_id else None
    if not field:
        # Pick North Field as default
        field = get_field_by_name("North Field") or {
            "id": None, "name": "North Field", "soil_type": "Loamy",
            "crop_type": "Wheat", "growth_stage": "Vegetative",
            "device_id": "ESP32-NODE-01", "sensor_cal_air": 3200, "sensor_cal_water": 1450,
        }

    # Simulate realistic moisture with diurnal temperature/humidity cycle
    now = datetime.now(timezone.utc)
    hour = now.hour
    temp = round(22.0 + 12.0 * math_sin_hour(hour) + random.uniform(-1.5, 1.5), 1)
    hum = round(85.0 - 35.0 * math_sin_hour(hour) + random.uniform(-3, 3), 1)
    moisture = round(random.uniform(22.0, 52.0), 1)
    rain = round(random.choice([0.0, 0.0, 0.0, 1.5, 4.0]), 1)
    f_rain = round(random.choice([0.0, 0.0, 2.0, 8.0]), 1)

    cal_air = field.get("sensor_cal_air") or 3200
    cal_water = field.get("sensor_cal_water") or 1450
    raw_val = int(cal_air - (moisture / 100.0) * (cal_air - cal_water))

    reading_dict = {
        "timestamp": now.isoformat(),
        "field_name": field["name"],
        "field_id": field.get("id"),
        "soil_moisture": moisture,
        "temperature": temp,
        "humidity": hum,
        "rainfall": rain,
        "forecast_rainfall": f_rain,
        "soil_type": field.get("soil_type", "Loamy"),
        "crop_type": field.get("crop_type", "Wheat"),
        "growth_stage": field.get("growth_stage", "Vegetative"),
        "notes": "Live simulated sensor reading",
        "source_type": "simulated",
        "device_id": field.get("device_id") or "SIM-NODE-01",
        "raw_analog_value": raw_val,
        "battery_voltage": round(random.uniform(3.85, 4.15), 2),
    }

    saved = create_reading(reading_dict)
    return {"item": saved, "message": f"Simulated telemetry generated for {field['name']}."}


def math_sin_hour(hour: int) -> float:
    import math
    # Peaks around 14:00 (hour 14)
    return max(0.0, math.sin(math.pi * ((hour - 6) % 24) / 16.0))
