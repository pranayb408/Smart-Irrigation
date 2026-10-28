"""Tests for ESP32 IoT Ingestion, Device Health, and Water Budgeting."""
from fastapi.testclient import TestClient
from backend.main import app


def test_esp32_iot_ingest():
    with TestClient(app) as client:
        payload = {
            "device_id": "ESP32-NODE-01",
            "field_name": "North Field",
            "raw_moisture": 2100,  # ADC value between 3200 (air) and 1450 (water)
            "temperature": 27.5,
            "humidity": 65.0,
            "battery_voltage": 3.95,
        }
        res = client.post("/api/sensors/ingest", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "success"
        assert data["calibrated_moisture"] > 0
        assert data["device_id"] == "ESP32-NODE-01"


def test_get_iot_devices():
    with TestClient(app) as client:
        res = client.get("/api/sensors/devices")
        assert res.status_code == 200
        data = res.json()
        assert "devices" in data
        assert isinstance(data["devices"], list)


def test_water_budget_and_irrigation_log():
    with TestClient(app) as client:
        # Check budget summary
        budget_res = client.get("/api/water-budget")
        assert budget_res.status_code == 200
        bdata = budget_res.json()
        assert "total_water_applied_liters" in bdata
        assert "estimated_water_saved_liters" in bdata
        assert "fields_budget" in bdata

        # Log an irrigation event
        log_payload = {
            "field_name": "North Field",
            "duration_minutes": 60.0,
            "method": "Drip",
            "flow_rate_lpm": 50.0,
            "liters_applied": 3000.0,
            "operator_notes": "Test irrigation application",
        }
        log_res = client.post("/api/irrigation-logs", json=log_payload)
        assert log_res.status_code == 201
        assert log_res.json()["item"]["liters_applied"] == 3000.0

        # Verify listed in logs
        list_res = client.get("/api/irrigation-logs?limit=5")
        assert list_res.status_code == 200
        assert len(list_res.json()["items"]) >= 1
