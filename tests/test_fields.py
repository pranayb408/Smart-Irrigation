"""Tests for Field Registration and Management endpoints."""
from fastapi.testclient import TestClient
from backend.main import app


def test_list_fields_returns_seeded_fields():
    with TestClient(app) as client:
        response = client.get("/api/fields")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        field_names = [f["name"] for f in data]
        assert "North Field" in field_names


def test_create_and_delete_field():
    with TestClient(app) as client:
        payload = {
            "name": "Test Orchard",
            "area_acres": 2.5,
            "crop_type": "Vegetables",
            "planting_date": "2026-03-01",
            "growth_stage": "Vegetative",
            "soil_type": "Loamy",
            "irrigation_method": "Drip",
            "flow_rate_lpm": 60.0,
            "location": "Southwest Sector",
            "device_id": "ESP32-TEST-99",
            "target_moisture_min": 28.0,
            "target_moisture_max": 60.0,
            "reference_water_budget_l": 500000.0,
        }
        create_res = client.post("/api/fields", json=payload)
        assert create_res.status_code == 201
        created = create_res.json()
        assert created["name"] == "Test Orchard"
        field_id = created["id"]

        # Fetch single field
        get_res = client.get(f"/api/fields/{field_id}")
        assert get_res.status_code == 200
        assert get_res.json()["area_acres"] == 2.5

        # Delete
        del_res = client.delete(f"/api/fields/{field_id}")
        assert del_res.status_code == 204

        # Confirm deleted
        check_res = client.get(f"/api/fields/{field_id}")
        assert check_res.status_code == 404
