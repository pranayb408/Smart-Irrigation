"""API tests for Phase 1 endpoints: health, sensor readings, and irrigation events."""
from fastapi.testclient import TestClient
from backend.main import app


def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "connected" in data["database"]


def test_readings_endpoint_returns_items():
    with TestClient(app) as client:
        response = client.get("/api/readings?limit=3")
        assert response.status_code == 200
        assert len(response.json()["items"]) <= 3


def test_post_and_get_sensor_reading():
    with TestClient(app) as client:
        payload = {
            "soil_moisture": 33.4,
            "temperature": 26.5,
            "humidity": 68.0,
            "rainfall": 1.2,
            "crop_type": "Tomato",
            "data_source": "sensor",
            "field_name": "North Field",
        }
        res = client.post("/api/readings", json=payload)
        assert res.status_code == 201
        body = res.json()
        assert "item" in body
        item = body["item"]
        assert item["soil_moisture"] == 33.4
        assert item["crop_type"] == "Tomato"
        assert item["data_source"] == "sensor"
        assert "id" in item
        assert "timestamp" in item

        # Verify listing contains the reading
        get_res = client.get("/api/readings?limit=5")
        assert get_res.status_code == 200
        items = get_res.json()["items"]
        matching = [i for i in items if i["id"] == item["id"]]
        assert len(matching) == 1
        assert matching[0]["crop_type"] == "Tomato"


def test_sensor_reading_validation_error():
    with TestClient(app) as client:
        # Moisture cannot exceed 100%
        invalid_payload = {
            "soil_moisture": 150.0,
            "temperature": 25.0,
            "humidity": 50.0,
            "rainfall": 0.0,
            "crop_type": "Wheat",
        }
        res = client.post("/api/readings", json=invalid_payload)
        assert res.status_code == 422


def test_irrigation_events_endpoints():
    with TestClient(app) as client:
        event_payload = {
            "field_area": 1.8,
            "water_volume": 3200.0,
            "irrigation_duration": 45.0,
            "measurement_source": "flow_meter",
            "field_name": "North Field",
            "method": "Drip",
        }
        post_res = client.post("/api/irrigation/events", json=event_payload)
        assert post_res.status_code == 201
        body = post_res.json()
        assert "item" in body
        saved = body["item"]
        assert saved["field_area"] == 1.8
        assert saved["water_volume"] == 3200.0
        assert saved["irrigation_duration"] == 45.0
        assert saved["measurement_source"] == "flow_meter"
        assert "id" in saved

        # Verify GET /api/irrigation/events returns the event
        get_res = client.get("/api/irrigation/events?limit=10")
        assert get_res.status_code == 200
        data = get_res.json()
        assert "items" in data
        assert any(e["id"] == saved["id"] for e in data["items"])


def test_irrigation_event_validation_error():
    with TestClient(app) as client:
        # Area must be > 0
        invalid_payload = {
            "field_area": -1.0,
            "water_volume": 1000.0,
            "irrigation_duration": 30.0,
            "measurement_source": "manual",
        }
        res = client.post("/api/irrigation/events", json=invalid_payload)
        assert res.status_code == 422
