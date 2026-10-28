"""SQLite and SQLAlchemy persistence layer for AI Smart Irrigation.

Configures SQLite database, SQLAlchemy declarative base, session generator,
database models for sensor readings and completed irrigation events, and automatic seeding.
"""
from pathlib import Path
from datetime import datetime, timedelta, timezone
import json
import random
from typing import Generator, Any, Optional

from sqlalchemy import (
    create_engine, Column, Integer, Float, String, Text, DateTime,
    ForeignKey, inspect, text, func
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

import os

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
DB_PATH = DATA_DIR / "smart_irrigation.db"

raw_db_url = os.getenv("DATABASE_URL")
if raw_db_url:
    if raw_db_url.startswith("postgres://"):
        DATABASE_URL = raw_db_url.replace("postgres://", "postgresql://", 1)
    else:
        DATABASE_URL = raw_db_url
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        echo=False,
    )
else:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for yielding SQLAlchemy database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- SQLAlchemy Database Models ---

class SensorReading(Base):
    """Database model for agricultural soil and environmental sensor readings."""
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    soil_moisture = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    rainfall = Column(Float, default=0.0, nullable=False)
    crop_type = Column(String(50), default="Wheat", nullable=False)
    data_source = Column(String(50), default="manual", nullable=False)

    # Contextual and backward-compatible fields
    field_name = Column(String(100), default="North Field", nullable=False)
    soil_type = Column(String(50), default="Loamy", nullable=False)
    growth_stage = Column(String(50), default="Vegetative", nullable=False)
    forecast_rainfall = Column(Float, default=0.0, nullable=False)
    notes = Column(String(300), nullable=True)
    source_type = Column(String(50), default="manual", nullable=True)
    device_id = Column(String(50), nullable=True)
    raw_analog_value = Column(Integer, nullable=True)
    battery_voltage = Column(Float, nullable=True)
    field_id = Column(Integer, nullable=True)

    def to_dict(self) -> dict:
        ts = self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else str(self.timestamp)
        return {
            "id": self.id,
            "timestamp": ts,
            "soil_moisture": self.soil_moisture,
            "temperature": self.temperature,
            "humidity": self.humidity,
            "rainfall": self.rainfall,
            "crop_type": self.crop_type,
            "data_source": self.data_source,
            "field_name": self.field_name,
            "soil_type": self.soil_type,
            "growth_stage": self.growth_stage,
            "forecast_rainfall": self.forecast_rainfall,
            "notes": self.notes,
            "source_type": self.source_type or self.data_source,
            "device_id": self.device_id,
            "raw_analog_value": self.raw_analog_value,
            "battery_voltage": self.battery_voltage,
            "field_id": self.field_id,
        }


class IrrigationEvent(Base):
    """Database model for completed irrigation application events."""
    __tablename__ = "irrigation_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    field_name = Column(String(100), default="North Field", nullable=False)
    field_area = Column(Float, default=1.0, nullable=False)  # in acres
    water_volume = Column(Float, nullable=False)             # in Liters
    irrigation_duration = Column(Float, nullable=False)      # in minutes
    measurement_source = Column(String(50), default="manual", nullable=False) # e.g. manual, flow_meter, estimated
    method = Column(String(50), default="Drip", nullable=False)
    flow_rate_lpm = Column(Float, nullable=True)
    operator_notes = Column(String(300), nullable=True)
    field_id = Column(Integer, nullable=True)

    def to_dict(self) -> dict:
        ts = self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else str(self.timestamp)
        return {
            "id": self.id,
            "timestamp": ts,
            "field_name": self.field_name,
            "field_area": self.field_area,
            "water_volume": self.water_volume,
            "irrigation_duration": self.irrigation_duration,
            "measurement_source": self.measurement_source,
            "method": self.method,
            "flow_rate_lpm": self.flow_rate_lpm,
            "operator_notes": self.operator_notes,
            "field_id": self.field_id,
            # Aliases for water-budget compatibility
            "liters_applied": self.water_volume,
            "duration_minutes": self.irrigation_duration,
        }


class FieldRecord(Base):
    """Database model for registered farm plots and fields."""
    __tablename__ = "fields"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    area_acres = Column(Float, default=1.0, nullable=False)
    crop_type = Column(String(50), default="Wheat", nullable=False)
    planting_date = Column(String(30), nullable=False)
    growth_stage = Column(String(50), default="Vegetative", nullable=False)
    soil_type = Column(String(50), default="Loamy", nullable=False)
    irrigation_method = Column(String(50), default="Drip", nullable=False)
    flow_rate_lpm = Column(Float, default=50.0, nullable=False)
    location = Column(String(150), default="Main Block", nullable=True)
    device_id = Column(String(50), nullable=True)
    sensor_cal_air = Column(Integer, default=3200)
    sensor_cal_water = Column(Integer, default=1450)
    target_moisture_min = Column(Float, default=30.0)
    target_moisture_max = Column(Float, default=60.0)
    reference_water_budget_l = Column(Float, default=420000.0)
    created_at = Column(String(40), nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "area_acres": self.area_acres,
            "crop_type": self.crop_type,
            "planting_date": self.planting_date,
            "growth_stage": self.growth_stage,
            "soil_type": self.soil_type,
            "irrigation_method": self.irrigation_method,
            "flow_rate_lpm": self.flow_rate_lpm,
            "location": self.location,
            "device_id": self.device_id,
            "sensor_cal_air": self.sensor_cal_air,
            "sensor_cal_water": self.sensor_cal_water,
            "target_moisture_min": self.target_moisture_min,
            "target_moisture_max": self.target_moisture_max,
            "reference_water_budget_l": self.reference_water_budget_l,
            "created_at": self.created_at,
        }


class PredictionRecord(Base):
    """Database model for saved ML and agronomic decision support outputs."""
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(String(40), nullable=False)
    field_name = Column(String(100), nullable=False)
    soil_moisture = Column(Float, nullable=False)
    crop_type = Column(String(50), nullable=False)
    irrigation_needed = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    estimated_water_liters = Column(Float, nullable=False)
    urgency = Column(String(50), nullable=False)
    recommendation = Column(Text, nullable=False)
    input_json = Column(Text, nullable=False)
    output_json = Column(Text, nullable=False)
    field_id = Column(Integer, nullable=True)
    agronomic_liters = Column(Float, nullable=True)
    runtime_minutes = Column(Float, nullable=True)
    rainfall_adjustment = Column(Float, nullable=True)
    next_check_hours = Column(Integer, nullable=True)


# --- Schema Migration & Seeding ---

def migrate_db():
    """Ensure all required columns exist in SQLite tables without data loss."""
    if engine.dialect.name != "sqlite":
        return
    with engine.connect() as conn:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()

        if "sensor_readings" in existing_tables:
            cols = {c["name"] for c in inspector.get_columns("sensor_readings")}
            if "data_source" not in cols:
                conn.execute(text("ALTER TABLE sensor_readings ADD COLUMN data_source TEXT DEFAULT 'manual'"))
            if "source_type" not in cols:
                conn.execute(text("ALTER TABLE sensor_readings ADD COLUMN source_type TEXT DEFAULT 'manual'"))
            if "device_id" not in cols:
                conn.execute(text("ALTER TABLE sensor_readings ADD COLUMN device_id TEXT"))
            if "raw_analog_value" not in cols:
                conn.execute(text("ALTER TABLE sensor_readings ADD COLUMN raw_analog_value INTEGER"))
            if "battery_voltage" not in cols:
                conn.execute(text("ALTER TABLE sensor_readings ADD COLUMN battery_voltage REAL"))
            if "field_id" not in cols:
                conn.execute(text("ALTER TABLE sensor_readings ADD COLUMN field_id INTEGER"))

        if "irrigation_events" in existing_tables:
            ev_cols = {c["name"] for c in inspector.get_columns("irrigation_events")}
            if "field_area" not in ev_cols:
                conn.execute(text("ALTER TABLE irrigation_events ADD COLUMN field_area REAL DEFAULT 1.0"))
            if "water_volume" not in ev_cols:
                conn.execute(text("ALTER TABLE irrigation_events ADD COLUMN water_volume REAL DEFAULT 0.0"))
            if "irrigation_duration" not in ev_cols:
                conn.execute(text("ALTER TABLE irrigation_events ADD COLUMN irrigation_duration REAL DEFAULT 0.0"))
            if "measurement_source" not in ev_cols:
                conn.execute(text("ALTER TABLE irrigation_events ADD COLUMN measurement_source TEXT DEFAULT 'manual'"))

        conn.commit()


def init_db() -> None:
    """Create all SQLite tables, perform schema migrations, and seed initial records."""
    Base.metadata.create_all(bind=engine)
    migrate_db()
    seed_fields_if_empty()
    seed_readings_if_empty()
    seed_irrigation_events_if_empty()


def seed_fields_if_empty():
    db = SessionLocal()
    try:
        if db.query(FieldRecord).count() > 0:
            return
        now = datetime.now(timezone.utc)
        fields = [
            FieldRecord(
                name="North Field", area_acres=1.5, crop_type="Wheat",
                planting_date=(now - timedelta(days=45)).strftime("%Y-%m-%d"),
                growth_stage="Vegetative", soil_type="Loamy", irrigation_method="Drip",
                flow_rate_lpm=50.0, location="Sector 1 - North Canal", device_id="ESP32-NODE-01",
                sensor_cal_air=3200, sensor_cal_water=1450, target_moisture_min=32.0,
                target_moisture_max=65.0, reference_water_budget_l=420000.0, created_at=now.isoformat()
            ),
            FieldRecord(
                name="East Field", area_acres=2.0, crop_type="Maize",
                planting_date=(now - timedelta(days=60)).strftime("%Y-%m-%d"),
                growth_stage="Flowering", soil_type="Sandy", irrigation_method="Sprinkler",
                flow_rate_lpm=80.0, location="Sector 2 - East Ridge", device_id="ESP32-NODE-02",
                sensor_cal_air=3150, sensor_cal_water=1420, target_moisture_min=25.0,
                target_moisture_max=55.0, reference_water_budget_l=650000.0, created_at=now.isoformat()
            ),
            FieldRecord(
                name="Greenhouse", area_acres=0.5, crop_type="Vegetables",
                planting_date=(now - timedelta(days=20)).strftime("%Y-%m-%d"),
                growth_stage="Seedling", soil_type="Silty", irrigation_method="Drip",
                flow_rate_lpm=25.0, location="Protected Polyhouse A", device_id="ESP32-NODE-03",
                sensor_cal_air=3250, sensor_cal_water=1480, target_moisture_min=35.0,
                target_moisture_max=70.0, reference_water_budget_l=180000.0, created_at=now.isoformat()
            ),
        ]
        db.add_all(fields)
        db.commit()
    finally:
        db.close()


def seed_readings_if_empty():
    db = SessionLocal()
    try:
        if db.query(SensorReading).count() > 0:
            return
        random.seed(21)
        now = datetime.now(timezone.utc)
        soil_types = ["Sandy", "Loamy", "Clay", "Silty"]
        crops = ["Wheat", "Rice", "Maize", "Cotton", "Vegetables"]
        stages = ["Seedling", "Vegetative", "Flowering", "Maturity"]
        fields = ["North Field", "East Field", "Greenhouse"]

        readings = []
        for idx in range(36):
            ts = now - timedelta(hours=(35 - idx) * 4)
            f_name = random.choice(fields)
            moist = round(max(8.0, min(90.0, 47.0 + random.gauss(0, 15) - idx * 0.12)), 1)
            temp = round(random.uniform(21.0, 39.0), 1)
            hum = round(random.uniform(35.0, 89.0), 1)
            rain = round(random.uniform(0.0, 8.0), 1)
            f_rain = round(random.uniform(0.0, 12.0), 1)
            src = "sensor" if idx % 2 == 0 else "manual"

            reading = SensorReading(
                timestamp=ts,
                field_name=f_name,
                soil_moisture=moist,
                temperature=temp,
                humidity=hum,
                rainfall=rain,
                forecast_rainfall=f_rain,
                soil_type=random.choice(soil_types),
                crop_type=random.choice(crops),
                growth_stage=random.choice(stages),
                notes="Automated sensor reading" if src == "sensor" else "Manual field check",
                data_source=src,
                source_type=src,
                device_id=f"ESP32-NODE-0{random.randint(1, 3)}" if src == "sensor" else None,
                battery_voltage=round(random.uniform(3.75, 4.15), 2) if src == "sensor" else None,
            )
            readings.append(reading)

        db.add_all(readings)
        db.commit()
    finally:
        db.close()


def seed_irrigation_events_if_empty():
    db = SessionLocal()
    try:
        if db.query(IrrigationEvent).count() > 0:
            return
        now = datetime.now(timezone.utc)
        events = [
            IrrigationEvent(
                timestamp=now - timedelta(days=14, hours=2),
                field_name="North Field",
                field_area=1.5,
                water_volume=4500.0,
                irrigation_duration=90.0,
                measurement_source="flow_meter",
                method="Drip",
                flow_rate_lpm=50.0,
                operator_notes="Bi-weekly drip cycle",
            ),
            IrrigationEvent(
                timestamp=now - timedelta(days=7, hours=1),
                field_name="East Field",
                field_area=2.0,
                water_volume=9600.0,
                irrigation_duration=120.0,
                measurement_source="manual",
                method="Sprinkler",
                flow_rate_lpm=80.0,
                operator_notes="Mid-stage flowering top-up",
            ),
            IrrigationEvent(
                timestamp=now - timedelta(days=2, hours=4),
                field_name="Greenhouse",
                field_area=0.5,
                water_volume=1875.0,
                irrigation_duration=75.0,
                measurement_source="flow_meter",
                method="Drip",
                flow_rate_lpm=25.0,
                operator_notes="Polyhouse seedling cycle",
            ),
        ]
        db.add_all(events)
        db.commit()
    finally:
        db.close()


# --- CRUD Helpers for Sensor Readings & Events ---

def create_reading(values: dict[str, Any]) -> dict:
    db = SessionLocal()
    try:
        ts = values.get("timestamp")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except Exception:
                ts = datetime.now(timezone.utc)
        elif not isinstance(ts, datetime):
            ts = datetime.now(timezone.utc)

        reading = SensorReading(
            timestamp=ts,
            field_name=values.get("field_name", "North Field"),
            soil_moisture=float(values["soil_moisture"]),
            temperature=float(values["temperature"]),
            humidity=float(values["humidity"]),
            rainfall=float(values.get("rainfall", 0.0)),
            forecast_rainfall=float(values.get("forecast_rainfall", 0.0)),
            soil_type=values.get("soil_type", "Loamy"),
            crop_type=values.get("crop_type", "Wheat"),
            growth_stage=values.get("growth_stage", "Vegetative"),
            notes=values.get("notes"),
            data_source=values.get("data_source") or values.get("source_type") or "manual",
            source_type=values.get("source_type") or values.get("data_source") or "manual",
            device_id=values.get("device_id"),
            raw_analog_value=values.get("raw_analog_value"),
            battery_voltage=values.get("battery_voltage"),
            field_id=values.get("field_id"),
        )
        db.add(reading)
        db.commit()
        db.refresh(reading)
        return reading.to_dict()
    finally:
        db.close()


def list_readings(
    limit: int = 100,
    crop_type: Optional[str] = None,
    data_source: Optional[str] = None,
    field_name: Optional[str] = None,
    field_id: Optional[int] = None,
) -> list[dict]:
    limit = max(1, min(int(limit), 500))
    db = SessionLocal()
    try:
        query = db.query(SensorReading)
        if crop_type:
            query = query.filter(SensorReading.crop_type == crop_type)
        if data_source:
            query = query.filter((SensorReading.data_source == data_source) | (SensorReading.source_type == data_source))
        if field_name:
            query = query.filter(SensorReading.field_name == field_name)
        if field_id:
            query = query.filter(SensorReading.field_id == field_id)
        rows = query.order_by(SensorReading.id.desc()).limit(limit).all()
        return [r.to_dict() for r in rows]
    finally:
        db.close()


def create_irrigation_event(values: dict[str, Any]) -> dict:
    db = SessionLocal()
    try:
        ts = values.get("timestamp")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except Exception:
                ts = datetime.now(timezone.utc)
        elif not isinstance(ts, datetime):
            ts = datetime.now(timezone.utc)

        # Allow water_volume or liters_applied
        vol = values.get("water_volume")
        if vol is None:
            vol = values.get("liters_applied")
        dur = values.get("irrigation_duration")
        if dur is None:
            dur = values.get("duration_minutes", 60.0)

        dur = float(dur)
        flow = values.get("flow_rate_lpm")
        if vol is None:
            vol = dur * (flow if flow else 50.0)
        vol = float(vol)

        ev = IrrigationEvent(
            timestamp=ts,
            field_name=values.get("field_name", "North Field"),
            field_area=float(values.get("field_area", 1.0)),
            water_volume=vol,
            irrigation_duration=dur,
            measurement_source=values.get("measurement_source") or "manual",
            method=values.get("method", "Drip"),
            flow_rate_lpm=flow,
            operator_notes=values.get("operator_notes"),
            field_id=values.get("field_id"),
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)
        return ev.to_dict()
    finally:
        db.close()


# Alias for water budget compatibility
create_irrigation_log = create_irrigation_event


def list_irrigation_events(
    limit: int = 100,
    field_name: Optional[str] = None,
    measurement_source: Optional[str] = None,
    field_id: Optional[int] = None,
) -> list[dict]:
    limit = max(1, min(int(limit), 500))
    db = SessionLocal()
    try:
        query = db.query(IrrigationEvent)
        if field_name:
            query = query.filter(IrrigationEvent.field_name == field_name)
        if measurement_source:
            query = query.filter(IrrigationEvent.measurement_source == measurement_source)
        if field_id:
            query = query.filter(IrrigationEvent.field_id == field_id)
        rows = query.order_by(IrrigationEvent.id.desc()).limit(limit).all()
        return [r.to_dict() for r in rows]
    finally:
        db.close()


list_irrigation_logs = list_irrigation_events


# --- Field CRUD Helpers ---

def list_fields() -> list[dict]:
    db = SessionLocal()
    try:
        fields = db.query(FieldRecord).order_by(FieldRecord.name.asc()).all()
        results = []
        for f in fields:
            d = f.to_dict()
            latest = db.query(SensorReading).filter(
                (SensorReading.field_id == f.id) | (SensorReading.field_name == f.name)
            ).order_by(SensorReading.timestamp.desc()).first()
            d["latest_reading"] = latest.to_dict() if latest else None

            # Total water applied
            total_water = db.query(func.coalesce(func.sum(IrrigationEvent.water_volume), 0.0)).filter(
                (IrrigationEvent.field_id == f.id) | (IrrigationEvent.field_name == f.name)
            ).scalar() or 0.0

            d["total_water_applied_liters"] = round(float(total_water), 1)
            budget = d.get("reference_water_budget_l") or 420000.0
            d["budget_percent_used"] = round((d["total_water_applied_liters"] / budget) * 100, 1) if budget > 0 else 0.0
            results.append(d)
        return results
    finally:
        db.close()


def get_field(field_id: int) -> Optional[dict]:
    db = SessionLocal()
    try:
        f = db.query(FieldRecord).filter(FieldRecord.id == field_id).first()
        if not f:
            return None
        d = f.to_dict()
        latest = db.query(SensorReading).filter(
            (SensorReading.field_id == f.id) | (SensorReading.field_name == f.name)
        ).order_by(SensorReading.timestamp.desc()).first()
        d["latest_reading"] = latest.to_dict() if latest else None
        total_water = db.query(func.coalesce(func.sum(IrrigationEvent.water_volume), 0.0)).filter(
            (IrrigationEvent.field_id == f.id) | (IrrigationEvent.field_name == f.name)
        ).scalar() or 0.0
        d["total_water_applied_liters"] = round(float(total_water), 1)
        budget = d.get("reference_water_budget_l") or 420000.0
        d["budget_percent_used"] = round((d["total_water_applied_liters"] / budget) * 100, 1) if budget > 0 else 0.0
        return d
    finally:
        db.close()


def get_field_by_name(name: str) -> Optional[dict]:
    db = SessionLocal()
    try:
        f = db.query(FieldRecord).filter(FieldRecord.name == name).first()
        return f.to_dict() if f else None
    finally:
        db.close()


def create_field(values: dict[str, Any]) -> dict:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc).isoformat()
        f = FieldRecord(
            name=values["name"],
            area_acres=float(values.get("area_acres", 1.0)),
            crop_type=values.get("crop_type", "Wheat"),
            planting_date=values["planting_date"],
            growth_stage=values.get("growth_stage", "Vegetative"),
            soil_type=values.get("soil_type", "Loamy"),
            irrigation_method=values.get("irrigation_method", "Drip"),
            flow_rate_lpm=float(values.get("flow_rate_lpm", 50.0)),
            location=values.get("location", "Main Block"),
            device_id=values.get("device_id"),
            sensor_cal_air=int(values.get("sensor_cal_air", 3200)),
            sensor_cal_water=int(values.get("sensor_cal_water", 1450)),
            target_moisture_min=float(values.get("target_moisture_min", 30.0)),
            target_moisture_max=float(values.get("target_moisture_max", 60.0)),
            reference_water_budget_l=float(values.get("reference_water_budget_l", 420000.0)),
            created_at=now,
        )
        db.add(f)
        db.commit()
        db.refresh(f)
        return get_field(f.id)
    finally:
        db.close()


def update_field(field_id: int, values: dict[str, Any]) -> Optional[dict]:
    db = SessionLocal()
    try:
        f = db.query(FieldRecord).filter(FieldRecord.id == field_id).first()
        if not f:
            return None
        for key, val in values.items():
            if hasattr(f, key) and val is not None:
                setattr(f, key, val)
        db.commit()
        return get_field(field_id)
    finally:
        db.close()


def delete_field(field_id: int) -> bool:
    db = SessionLocal()
    try:
        f = db.query(FieldRecord).filter(FieldRecord.id == field_id).first()
        if not f:
            return False
        db.delete(f)
        db.commit()
        return True
    finally:
        db.close()


# --- Prediction Records ---

def create_prediction(input_values: dict, output_values: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    db = SessionLocal()
    try:
        pred = PredictionRecord(
            timestamp=now,
            field_name=input_values.get("field_name", "North Field"),
            soil_moisture=float(input_values["soil_moisture"]),
            crop_type=input_values["crop_type"],
            irrigation_needed=int(output_values["irrigation_needed"]),
            confidence=float(output_values["confidence"]),
            estimated_water_liters=float(output_values["estimated_water_liters"]),
            urgency=output_values["urgency"],
            recommendation=output_values["recommendation"],
            input_json=json.dumps(input_values),
            output_json=json.dumps(output_values),
            field_id=input_values.get("field_id"),
            agronomic_liters=output_values.get("agronomic_water_liters"),
            runtime_minutes=output_values.get("runtime_minutes"),
            rainfall_adjustment=output_values.get("rainfall_credit_liters"),
            next_check_hours=output_values.get("next_check_hours"),
        )
        db.add(pred)
        db.commit()
        db.refresh(pred)
        return {
            "id": pred.id,
            "timestamp": pred.timestamp,
            "field_name": pred.field_name,
            "soil_moisture": pred.soil_moisture,
            "crop_type": pred.crop_type,
            "irrigation_needed": bool(pred.irrigation_needed),
            "confidence": pred.confidence,
            "estimated_water_liters": pred.estimated_water_liters,
            "urgency": pred.urgency,
            "recommendation": pred.recommendation,
            "output": output_values,
        }
    finally:
        db.close()


def list_predictions(limit: int = 100, field_id: Optional[int] = None) -> list[dict]:
    limit = max(1, min(int(limit), 500))
    db = SessionLocal()
    try:
        query = db.query(PredictionRecord)
        if field_id:
            query = query.filter(PredictionRecord.field_id == field_id)
        rows = query.order_by(PredictionRecord.timestamp.desc()).limit(limit).all()
        items = []
        for r in rows:
            out_json = json.loads(r.output_json) if r.output_json else {}
            items.append({
                "id": r.id,
                "timestamp": r.timestamp,
                "field_name": r.field_name,
                "soil_moisture": r.soil_moisture,
                "crop_type": r.crop_type,
                "irrigation_needed": bool(r.irrigation_needed),
                "confidence": r.confidence,
                "estimated_water_liters": r.estimated_water_liters,
                "urgency": r.urgency,
                "recommendation": r.recommendation,
                "output": out_json,
                "field_id": r.field_id,
            })
        return items
    finally:
        db.close()


def get_device_statuses() -> list[dict]:
    db = SessionLocal()
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "postgresql":
                rows = conn.execute(text("""
                    SELECT DISTINCT ON (device_id) device_id, field_name, timestamp AS last_seen,
                           battery_voltage, soil_moisture, temperature, humidity
                    FROM sensor_readings
                    WHERE device_id IS NOT NULL AND device_id != ''
                    ORDER BY device_id, timestamp DESC
                """)).fetchall()
            else:
                rows = conn.execute(text("""
                    SELECT device_id, field_name, MAX(timestamp) AS last_seen,
                           battery_voltage, soil_moisture, temperature, humidity
                    FROM sensor_readings
                    WHERE device_id IS NOT NULL AND device_id != ''
                    GROUP BY device_id
                    ORDER BY last_seen DESC
                """)).fetchall()
        now = datetime.now(timezone.utc)
        devices = []
        for r in rows:
            ts_str = str(r[2])
            try:
                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                hours = (now - dt).total_seconds() / 3600.0
            except Exception:
                hours = 0.0
            devices.append({
                "device_id": r[0],
                "field_name": r[1],
                "last_seen": ts_str,
                "battery_voltage": r[3],
                "soil_moisture": r[4],
                "temperature": r[5],
                "humidity": r[6],
                "is_online": hours < 12.0,
                "hours_since_last_seen": round(hours, 1),
                "battery_status": "Good" if (r[3] or 4.0) >= 3.8 else "Low",
            })
        return devices
    finally:
        db.close()


def get_dashboard_summary() -> dict:
    db = SessionLocal()
    try:
        reading_count = db.query(SensorReading).count()
        avg_moisture = db.query(func.coalesce(func.avg(SensorReading.soil_moisture), 0.0)).scalar() or 0.0
        latest = db.query(SensorReading).order_by(SensorReading.id.desc()).first()
        pred_count = db.query(PredictionRecord).count()
        irrig_count = db.query(PredictionRecord).filter(PredictionRecord.irrigation_needed == 1).count()
        pred_water = db.query(func.coalesce(func.sum(PredictionRecord.estimated_water_liters), 0.0)).scalar() or 0.0
        applied_water = db.query(func.coalesce(func.sum(IrrigationEvent.water_volume), 0.0)).scalar() or 0.0
        fields_count = db.query(FieldRecord).count()

        with engine.connect() as conn:
            if engine.dialect.name == "postgresql":
                trend_query = """
                    SELECT TO_CHAR(timestamp, 'YYYY-MM-DD') AS day,
                           ROUND(CAST(AVG(soil_moisture) AS numeric), 1) AS moisture,
                           ROUND(CAST(SUM(rainfall) AS numeric), 1) AS rainfall
                    FROM sensor_readings
                    GROUP BY TO_CHAR(timestamp, 'YYYY-MM-DD')
                    ORDER BY day DESC
                    LIMIT 7
                """
            else:
                trend_query = """
                    SELECT substr(CAST(timestamp AS TEXT), 1, 10) AS day,
                           ROUND(AVG(soil_moisture), 1) AS moisture,
                           ROUND(SUM(rainfall), 1) AS rainfall
                    FROM sensor_readings
                    GROUP BY day
                    ORDER BY day DESC
                    LIMIT 7
                """
            trend_rows = conn.execute(text(trend_query)).fetchall()

        trend = [{"day": r[0], "moisture": float(r[1] or 0), "rainfall": float(r[2] or 0)} for r in reversed(trend_rows)]

        return {
            "sensor_count": int(reading_count),
            "average_moisture": round(float(avg_moisture), 1),
            "prediction_count": int(pred_count),
            "irrigation_recommendations": int(irrig_count),
            "estimated_water_total": round(float(pred_water), 1),
            "total_water_applied_liters": round(float(applied_water), 1),
            "fields_count": int(fields_count),
            "latest_reading": latest.to_dict() if latest else None,
            "moisture_trend": trend,
        }
    finally:
        db.close()


def get_water_budget_summary(field_id: Optional[int] = None) -> dict:
    fields = list_fields()
    if field_id:
        fields = [f for f in fields if f["id"] == field_id]

    total_applied = sum(f["total_water_applied_liters"] for f in fields)
    total_budget = sum(f.get("reference_water_budget_l", 420000.0) for f in fields)
    overall_pct = round((total_applied / total_budget) * 100, 1) if total_budget > 0 else 0.0
    total_saved = round(total_applied * 0.35, 1)

    db = SessionLocal()
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "postgresql":
                weekly_query = """
                    SELECT TO_CHAR(timestamp, 'YYYY-"W"IW') AS week,
                           ROUND(CAST(SUM(water_volume) AS numeric), 1) AS liters,
                           COUNT(*) AS sessions
                    FROM irrigation_events
                    GROUP BY TO_CHAR(timestamp, 'YYYY-"W"IW')
                    ORDER BY week DESC
                    LIMIT 8
                """
            else:
                weekly_query = """
                    SELECT strftime('%Y-W%W', timestamp) AS week,
                           ROUND(SUM(water_volume), 1) AS liters,
                           COUNT(*) AS sessions
                    FROM irrigation_events
                    GROUP BY week
                    ORDER BY week DESC
                    LIMIT 8
                """
            weekly_rows = conn.execute(text(weekly_query)).fetchall()

        return {
            "total_water_applied_liters": total_applied,
            "total_reference_budget_liters": total_budget,
            "overall_budget_percent_used": overall_pct,
            "estimated_water_saved_liters": total_saved,
            "fields_budget": fields,
            "weekly_trend": [{"week": r[0], "liters": float(r[1] or 0), "sessions": int(r[2])} for r in reversed(weekly_rows)],
        }
    finally:
        db.close()


def get_analytics() -> dict:
    db = SessionLocal()
    try:
        with engine.connect() as conn:
            by_field = conn.execute(text("""
                SELECT field_name, COUNT(*) AS readings,
                       ROUND(AVG(soil_moisture), 1) AS avg_moisture,
                       ROUND(AVG(temperature), 1) AS avg_temperature,
                       ROUND(SUM(rainfall), 1) AS rainfall_total
                FROM sensor_readings GROUP BY field_name ORDER BY field_name
            """)).fetchall()

            pred_summary = conn.execute(text("""
                SELECT COUNT(*) AS total, COALESCE(SUM(irrigation_needed), 0) AS irrigation_count,
                       ROUND(COALESCE(AVG(confidence) * 100, 0), 1) AS average_confidence,
                       ROUND(COALESCE(SUM(estimated_water_liters), 0), 1) AS water_total
                FROM predictions
            """)).fetchone()

            crop_usage = conn.execute(text("""
                SELECT crop_type, COUNT(*) AS count, ROUND(AVG(estimated_water_liters), 1) AS avg_liters
                FROM predictions GROUP BY crop_type ORDER BY count DESC
            """)).fetchall()

            water_by_field = conn.execute(text("""
                SELECT field_name, ROUND(COALESCE(SUM(water_volume), 0), 1) AS total_liters,
                       ROUND(COALESCE(SUM(irrigation_duration), 0), 1) AS total_minutes,
                       COUNT(*) AS sessions
                FROM irrigation_events GROUP BY field_name ORDER BY total_liters DESC
            """)).fetchall()

            readings = conn.execute(text("""
                SELECT timestamp, soil_moisture, temperature, humidity, rainfall
                FROM sensor_readings ORDER BY timestamp ASC
            """)).fetchall()

        return {
            "fields": [{"field_name": r[0], "readings": int(r[1]), "avg_moisture": float(r[2] or 0), "avg_temperature": float(r[3] or 0), "rainfall_total": float(r[4] or 0)} for r in by_field],
            "predictions": {"total": int(pred_summary[0] or 0), "irrigation_count": int(pred_summary[1] or 0), "average_confidence": float(pred_summary[2] or 0), "water_total": float(pred_summary[3] or 0)},
            "crop_usage": [{"crop_type": r[0], "count": int(r[1]), "avg_liters": float(r[2] or 0)} for r in crop_usage],
            "water_applied_by_field": [{"field_name": r[0], "total_liters": float(r[1] or 0), "total_minutes": float(r[2] or 0), "sessions": int(r[3])} for r in water_by_field],
            "sensor_series": [{"timestamp": str(r[0]), "soil_moisture": float(r[1]), "temperature": float(r[2]), "humidity": float(r[3]), "rainfall": float(r[4] or 0)} for r in readings],
        }
    finally:
        db.close()
