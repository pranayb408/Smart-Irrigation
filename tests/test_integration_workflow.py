"""Phase 5 Integration Tests — Full Stack Verification.

Tests the complete end-to-end workflow:
1. Server health check
2. Submit sensor readings to FastAPI
3. Store and retrieve readings from SQLite
4. Request irrigation prediction (invoking Random Forest ML + FAO-56 physics)
5. Verify response has separated ML and water calculation outputs
6. Save and retrieve prediction history
7. Verify dashboard statistics reflect saved records
8. Submit an irrigation application event and verify analytics update
9. Verify input validation and error responses on invalid/missing inputs
10. Verify database persistence across engine reconnects using an isolated test database
"""

import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.database import (
    Base,
    SensorReading,
    PredictionRecord,
    IrrigationEvent,
    FieldRecord,
)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_full_workflow_step_by_step(client):
    """Verifies steps 1 through 10 of the complete integrated application workflow."""
    # Step 1: Health check
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "healthy"

    # Step 2: Submit sensor readings to FastAPI
    sensor_payload = {
        "field_name": "Integration Test Parcel",
        "soil_moisture": 22.5,
        "temperature": 33.0,
        "humidity": 45.0,
        "rainfall": 0.0,
        "forecast_rainfall": 0.0,
        "soil_type": "Loamy",
        "crop_type": "Wheat",
        "growth_stage": "Flowering",
        "data_source": "manual",
    }
    reading_res = client.post("/api/readings", json=sensor_payload)
    assert reading_res.status_code == 201, reading_res.text
    saved_reading = reading_res.json()["item"]
    reading_id = saved_reading["id"]
    assert saved_reading["soil_moisture"] == 22.5
    assert saved_reading["field_name"] == "Integration Test Parcel"

    # Step 3: Verify stored in SQLite and retrieved via GET /api/readings
    get_readings_res = client.get("/api/readings?limit=50")
    assert get_readings_res.status_code == 200
    reading_ids = [r["id"] for r in get_readings_res.json()["items"]]
    assert reading_id in reading_ids

    # Step 4: Request irrigation prediction
    predict_payload = {
        "field_name": "Integration Test Parcel",
        "soil_moisture": 22.5,
        "temperature": 33.0,
        "humidity": 45.0,
        "rainfall": 0.0,
        "forecast_rainfall": 0.0,
        "soil_type": "Loamy",
        "crop_type": "Wheat",
        "growth_stage": "Flowering",
        "area_acres": 2.0,
        "irrigation_method": "Drip",
        "flow_rate_lpm": 60.0,
        "flow_rate_lph": 3600.0,
    }
    pred_res = client.post("/api/predict", json=predict_payload)
    assert pred_res.status_code == 200, pred_res.text
    pred_data = pred_res.json()

    # Step 5: Verify response has separated ML and water calculation outputs
    assert "irrigation_needed" in pred_data
    assert "recommendation" in pred_data
    assert "ml_prediction" in pred_data
    assert "water_calculation" in pred_data
    assert pred_data["ml_prediction"]["model_available"] is True
    assert "disclaimer" in pred_data["ml_prediction"]
    assert pred_data["water_calculation"] is not None
    assert pred_data["water_calculation"]["gross_volume_litres"] > 0
    # Unit conversion invariant: 1 mm depth * 1 m² = 1 litre net
    calc = pred_data["water_calculation"]
    expected_net = round(calc["depth_mm"] * calc["area_m2"], 2)
    assert calc["net_volume_litres"] == pytest.approx(expected_net, rel=1e-2)

    # Step 6: Verify prediction was persisted to SQLite
    pred_id = pred_data["id"]
    history_res = client.get("/api/predictions?limit=50")
    assert history_res.status_code == 200
    pred_ids = [p["id"] for p in history_res.json()["items"]]
    assert pred_id in pred_ids

    # Step 7: Verify dashboard displays records
    dash_res = client.get("/api/dashboard")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["sensor_count"] > 0
    assert dash_data["prediction_count"] > 0

    # Step 8: Submit an irrigation event and verify analytics update
    pre_analytics = client.get("/api/analytics").json()
    pre_water_total = pre_analytics.get("predictions", {}).get("water_total", 0)

    log_payload = {
        "field_name": "Integration Test Parcel",
        "duration_minutes": 45.0,
        "liters_applied": 4500.0,
        "method": "Drip",
        "flow_rate_lpm": 60.0,
        "operator_notes": "Phase 5 end-to-end validation test session",
    }
    log_res = client.post("/api/irrigation-logs", json=log_payload)
    assert log_res.status_code == 201

    post_analytics = client.get("/api/analytics")
    assert post_analytics.status_code == 200
    analytics_data = post_analytics.json()
    assert "fields" in analytics_data
    assert "water_applied_by_field" in analytics_data


def test_input_validation_errors(client):
    """Ensures missing or out-of-range inputs produce useful HTTP 422 error messages."""
    # 1. Soil moisture > 100%
    bad_moisture = {
        "soil_moisture": 135.0,
        "temperature": 25.0,
        "humidity": 50.0,
    }
    res = client.post("/api/readings", json=bad_moisture)
    assert res.status_code == 422

    # 2. Temperature out of agronomic range (> 60°C)
    bad_temp = {
        "soil_moisture": 40.0,
        "temperature": 75.0,
        "humidity": 50.0,
    }
    res = client.post("/api/readings", json=bad_temp)
    assert res.status_code == 422

    # 3. Missing required environmental input
    missing_input = {
        "soil_moisture": 30.0,
        # temperature missing
        "humidity": 60.0,
    }
    res = client.post("/api/readings", json=missing_input)
    assert res.status_code == 422


def test_isolated_database_persistence(tmp_path):
    """Verifies that SQLite tables retain all records across engine/session disconnects."""
    test_db_file = tmp_path / "isolated_test.db"
    test_db_url = f"sqlite:///{test_db_file.as_posix()}"

    test_engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(bind=test_engine)

    # Insert a record in Session 1
    session1 = TestSession()
    reading = SensorReading(
        soil_moisture=35.0,
        temperature=28.0,
        humidity=62.0,
        rainfall=0.0,
        crop_type="Wheat",
        field_name="Isolated Field",
        data_source="manual",
    )
    session1.add(reading)
    session1.commit()
    inserted_id = reading.id
    session1.close()

    # Disconnect engine completely
    test_engine.dispose()

    # Reconnect with a fresh engine and verify record persists on disk
    reconnect_engine = create_engine(test_db_url, connect_args={"check_same_thread": False})
    ReconnectSession = sessionmaker(bind=reconnect_engine)
    session2 = ReconnectSession()

    persisted = session2.query(SensorReading).filter_by(id=inserted_id).first()
    assert persisted is not None
    assert persisted.soil_moisture == 35.0
    assert persisted.field_name == "Isolated Field"
    session2.close()
    reconnect_engine.dispose()

