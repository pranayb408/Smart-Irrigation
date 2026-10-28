"""Tests for Agronomic Water Calculations and Decision Support."""
from backend.services.agronomic_service import calculate_agronomic_irrigation, estimate_et0
from fastapi.testclient import TestClient
from backend.main import app


def test_et0_estimation():
    et0_hot = estimate_et0(temperature_c=35.0, humidity_pct=30.0)
    et0_cool = estimate_et0(temperature_c=18.0, humidity_pct=80.0)
    assert et0_hot > et0_cool
    assert 2.0 <= et0_cool <= 9.5
    assert 2.0 <= et0_hot <= 9.5


def test_irrigation_recommended_when_soil_dry():
    result = calculate_agronomic_irrigation(
        soil_moisture=15.0,  # Below threshold for Loamy
        temperature=32.0,
        humidity=40.0,
        rainfall=0.0,
        forecast_rainfall=0.0,
        soil_type="Loamy",
        crop_type="Wheat",
        growth_stage="Flowering",
        area_acres=1.0,
        irrigation_method="Drip",
        flow_rate_lpm=50.0,
    )
    assert result["irrigation_needed"] is True
    assert result["agronomic_water_liters"] > 0
    assert result["runtime_minutes"] > 0
    assert "Loamy" in result["why_explanation"]


def test_rain_postpones_irrigation():
    result = calculate_agronomic_irrigation(
        soil_moisture=21.0,
        temperature=28.0,
        humidity=60.0,
        rainfall=0.0,
        forecast_rainfall=25.0,  # Heavy rain forecast
        soil_type="Loamy",
        crop_type="Wheat",
        growth_stage="Vegetative",
        area_acres=1.0,
    )
    # Heavy forecast rain should postpone or substantially credit
    assert result["effective_rainfall_credit_mm"] > 0
    assert "rain" in result["rain_explanation"].lower()


def test_predict_api_endpoint_returns_rich_decision_support():
    with TestClient(app) as client:
        payload = {
            "field_name": "North Field",
            "soil_moisture": 18.0,
            "temperature": 34.0,
            "humidity": 45.0,
            "rainfall": 0.0,
            "forecast_rainfall": 1.0,
            "soil_type": "Loamy",
            "crop_type": "Wheat",
            "growth_stage": "Flowering",
            "area_acres": 1.5,
            "flow_rate_lpm": 60.0,
            "irrigation_method": "Drip",
        }
        res = client.post("/api/predict", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "irrigation_needed" in data
        assert "why_explanation" in data
        assert "runtime_formatted" in data
        assert "agronomic_water_liters" in data
        assert "next_check_hours" in data
        assert "fallback_guide" in data
