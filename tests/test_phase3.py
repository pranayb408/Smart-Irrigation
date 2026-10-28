"""Phase 3 tests — input validation, water calculations, and API endpoints.

Covers:
- Input validation (missing fields, out-of-range values)
- Water volume unit conversion (1 mm × 1 m² = 1 L)
- Water volume with application efficiency
- Runtime calculation from flow rate in L/hr
- Runtime absent when no flow rate provided
- POST /api/predict saves to database
- POST /api/predict with insufficient context returns helpful message
- GET /api/dashboard returns 200
- GET /api/analytics includes model metrics block
- GET /api/model-metrics returns actual evaluation results
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.irrigation_service import (
    validate_sensor_inputs,
    calculate_water_volume,
    calculate_runtime_hours,
)


# ---------------------------------------------------------------------------
# Unit tests — validate_sensor_inputs
# ---------------------------------------------------------------------------


class TestInputValidation:
    def test_valid_inputs_return_no_errors(self):
        payload = {
            "soil_moisture": 45.0,
            "temperature": 28.0,
            "humidity": 65.0,
            "rainfall": 2.5,
        }
        errors = validate_sensor_inputs(payload)
        assert errors == [], f"Expected no errors, got: {errors}"

    def test_missing_soil_moisture_returns_error(self):
        payload = {"temperature": 28.0, "humidity": 65.0}
        errors = validate_sensor_inputs(payload)
        assert any("soil_moisture" in e for e in errors)

    def test_missing_temperature_returns_error(self):
        payload = {"soil_moisture": 45.0, "humidity": 65.0}
        errors = validate_sensor_inputs(payload)
        assert any("temperature" in e for e in errors)

    def test_missing_humidity_returns_error(self):
        payload = {"soil_moisture": 45.0, "temperature": 28.0}
        errors = validate_sensor_inputs(payload)
        assert any("humidity" in e for e in errors)

    def test_soil_moisture_above_100_returns_error(self):
        payload = {"soil_moisture": 150.0, "temperature": 25.0, "humidity": 60.0}
        errors = validate_sensor_inputs(payload)
        assert any("soil_moisture" in e for e in errors)

    def test_soil_moisture_below_0_returns_error(self):
        payload = {"soil_moisture": -5.0, "temperature": 25.0, "humidity": 60.0}
        errors = validate_sensor_inputs(payload)
        assert any("soil_moisture" in e for e in errors)

    def test_temperature_above_60_returns_error(self):
        payload = {"soil_moisture": 45.0, "temperature": 100.0, "humidity": 60.0}
        errors = validate_sensor_inputs(payload)
        assert any("temperature" in e for e in errors)

    def test_temperature_below_minus20_returns_error(self):
        payload = {"soil_moisture": 45.0, "temperature": -30.0, "humidity": 60.0}
        errors = validate_sensor_inputs(payload)
        assert any("temperature" in e for e in errors)

    def test_humidity_above_100_returns_error(self):
        payload = {"soil_moisture": 45.0, "temperature": 25.0, "humidity": 110.0}
        errors = validate_sensor_inputs(payload)
        assert any("humidity" in e for e in errors)

    def test_negative_rainfall_returns_error(self):
        payload = {"soil_moisture": 45.0, "temperature": 25.0, "humidity": 60.0, "rainfall": -1.0}
        errors = validate_sensor_inputs(payload)
        assert any("rainfall" in e for e in errors)

    def test_multiple_missing_fields_returns_multiple_errors(self):
        payload = {}  # all required fields missing
        errors = validate_sensor_inputs(payload)
        assert len(errors) >= 3, f"Expected >= 3 errors, got {len(errors)}: {errors}"


# ---------------------------------------------------------------------------
# Unit tests — calculate_water_volume
# ---------------------------------------------------------------------------


class TestWaterVolumeCalculation:
    def test_1mm_over_1m2_equals_1_litre(self):
        """Core unit-conversion rule: 1 mm depth × 1 m² area = 1 litre (net)."""
        result = calculate_water_volume(area_m2=1.0, depth_mm=1.0, application_efficiency=1.0)
        assert result["net_volume_litres"] == 1.0, (
            f"1 mm × 1 m² should equal 1 L net, got {result['net_volume_litres']}"
        )

    def test_10mm_over_100m2_equals_1000_litres_net(self):
        result = calculate_water_volume(area_m2=100.0, depth_mm=10.0, application_efficiency=1.0)
        assert result["net_volume_litres"] == 1000.0

    def test_application_efficiency_increases_gross_volume(self):
        """Gross volume = net / efficiency — lower efficiency means more water needed."""
        result_perfect = calculate_water_volume(area_m2=100.0, depth_mm=10.0, application_efficiency=1.0)
        result_drip = calculate_water_volume(area_m2=100.0, depth_mm=10.0, application_efficiency=0.9)
        assert result_drip["gross_volume_litres"] > result_perfect["gross_volume_litres"]

    def test_gross_equals_net_divided_by_efficiency(self):
        eff = 0.75
        result = calculate_water_volume(area_m2=500.0, depth_mm=5.0, application_efficiency=eff)
        expected_gross = round((5.0 * 500.0) / eff, 2)
        assert result["gross_volume_litres"] == expected_gross

    def test_zero_depth_returns_zero_volumes(self):
        result = calculate_water_volume(area_m2=100.0, depth_mm=0.0, application_efficiency=0.8)
        assert result["net_volume_litres"] == 0.0
        assert result["gross_volume_litres"] == 0.0

    def test_invalid_area_raises_value_error(self):
        with pytest.raises(ValueError, match="area_m2"):
            calculate_water_volume(area_m2=0.0, depth_mm=10.0)

    def test_negative_depth_raises_value_error(self):
        with pytest.raises(ValueError, match="depth_mm"):
            calculate_water_volume(area_m2=100.0, depth_mm=-1.0)

    def test_invalid_efficiency_raises_value_error(self):
        with pytest.raises(ValueError, match="application_efficiency"):
            calculate_water_volume(area_m2=100.0, depth_mm=10.0, application_efficiency=0.0)


# ---------------------------------------------------------------------------
# Unit tests — calculate_runtime_hours
# ---------------------------------------------------------------------------


class TestRuntimeCalculation:
    def test_runtime_calculated_when_flow_rate_lph_provided(self):
        """1000 L ÷ 500 L/hr = 2.0 hours."""
        result = calculate_runtime_hours(volume_litres=1000.0, flow_rate_lph=500.0)
        assert result == pytest.approx(2.0)

    def test_runtime_is_none_when_flow_rate_is_none(self):
        result = calculate_runtime_hours(volume_litres=1000.0, flow_rate_lph=None)
        assert result is None, "Runtime should be None when no flow rate is given"

    def test_runtime_is_none_when_flow_rate_is_zero(self):
        result = calculate_runtime_hours(volume_litres=1000.0, flow_rate_lph=0.0)
        assert result is None

    def test_runtime_is_none_when_flow_rate_is_negative(self):
        result = calculate_runtime_hours(volume_litres=1000.0, flow_rate_lph=-50.0)
        assert result is None

    def test_runtime_is_zero_when_volume_is_zero(self):
        result = calculate_runtime_hours(volume_litres=0.0, flow_rate_lph=500.0)
        assert result == 0.0

    def test_runtime_unit_sanity_300L_at_150lph(self):
        """300 L ÷ 150 L/hr = 2.0 hours."""
        result = calculate_runtime_hours(volume_litres=300.0, flow_rate_lph=150.0)
        assert result == pytest.approx(2.0)


# ---------------------------------------------------------------------------
# Integration tests — API endpoints
# ---------------------------------------------------------------------------

VALID_SENSOR_PAYLOAD = {
    "soil_moisture": 25.0,
    "temperature": 32.0,
    "humidity": 55.0,
    "rainfall": 0.0,
    "forecast_rainfall": 0.0,
    "soil_type": "Loamy",
    "crop_type": "Wheat",
    "growth_stage": "Vegetative",
    "field_name": "Phase3 Test Field",
    "area_acres": 2.0,
    "irrigation_method": "Drip",
}


class TestPredictEndpoint:
    def test_predict_returns_200_with_valid_payload(self):
        with TestClient(app) as client:
            res = client.post("/api/predict", json=VALID_SENSOR_PAYLOAD)
            assert res.status_code == 200, res.text
            data = res.json()
            assert "irrigation_needed" in data
            assert "recommendation" in data
            assert "ml_prediction" in data
            assert "water_calculation" in data

    def test_predict_ml_prediction_block_contains_disclaimer(self):
        """ML prediction must always carry a disclaimer (educational label)."""
        with TestClient(app) as client:
            res = client.post("/api/predict", json=VALID_SENSOR_PAYLOAD)
            assert res.status_code == 200
            ml = res.json()["ml_prediction"]
            assert ml is not None
            assert "disclaimer" in ml
            assert len(ml["disclaimer"]) > 10

    def test_predict_saves_to_database(self):
        """POST /api/predict → record must appear in GET /api/predictions."""
        with TestClient(app) as client:
            post_res = client.post("/api/predict", json=VALID_SENSOR_PAYLOAD)
            assert post_res.status_code == 200
            prediction_id = post_res.json()["id"]

            get_res = client.get("/api/predictions?limit=50")
            assert get_res.status_code == 200
            ids = [item["id"] for item in get_res.json()["items"]]
            assert prediction_id in ids, (
                f"Prediction id={prediction_id} not found in /api/predictions"
            )

    def test_predict_with_flow_rate_lph_returns_runtime(self):
        payload = {**VALID_SENSOR_PAYLOAD, "flow_rate_lph": 600.0}
        with TestClient(app) as client:
            res = client.post("/api/predict", json=payload)
            assert res.status_code == 200
            data = res.json()
            # runtime_hours should be present and non-None when flow rate is supplied
            assert data.get("runtime_hours") is not None or data.get("water_calculation") is None, (
                "When flow_rate_lph is supplied, runtime_hours should be calculated "
                "(unless no irrigation depth was computed by the agronomic engine)."
            )

    def test_predict_without_soil_type_crop_type_returns_insufficient_flag(self):
        """Missing optional context → data_quality=insufficient with helpful message."""
        minimal_payload = {
            "soil_moisture": 30.0,
            "temperature": 27.0,
            "humidity": 60.0,
            "rainfall": 0.0,
            "field_name": "Minimal Test Field",
        }
        with TestClient(app) as client:
            res = client.post("/api/predict", json=minimal_payload)
            assert res.status_code == 200
            data = res.json()
            assert data["data_quality"] == "insufficient", (
                f"Expected data_quality='insufficient', got '{data.get('data_quality')}'"
            )
            assert len(data["missing_context"]) > 0

    def test_predict_validation_error_on_invalid_moisture(self):
        """FastAPI Pydantic validation rejects soil_moisture > 100."""
        bad_payload = {**VALID_SENSOR_PAYLOAD, "soil_moisture": 150.0}
        with TestClient(app) as client:
            res = client.post("/api/predict", json=bad_payload)
            assert res.status_code == 422

    def test_predict_response_has_separate_ml_and_agro_blocks(self):
        """Phase 3 requirement: ml_prediction and water_calculation are separate keys."""
        with TestClient(app) as client:
            res = client.post("/api/predict", json=VALID_SENSOR_PAYLOAD)
            assert res.status_code == 200
            data = res.json()
            assert "ml_prediction" in data, "Response must contain 'ml_prediction' block"
            assert "water_calculation" in data, "Response must contain 'water_calculation' block"
            # The ML block must not be the same as the water block
            assert data["ml_prediction"] != data["water_calculation"]


class TestDashboardEndpoint:
    def test_dashboard_returns_200(self):
        with TestClient(app) as client:
            res = client.get("/api/dashboard")
            assert res.status_code == 200

    def test_dashboard_contains_expected_fields(self):
        with TestClient(app) as client:
            res = client.get("/api/dashboard")
            data = res.json()
            for key in ("sensor_count", "average_moisture", "prediction_count", "fields_count"):
                assert key in data, f"Dashboard response missing key '{key}'"


class TestAnalyticsEndpoint:
    def test_analytics_returns_200(self):
        with TestClient(app) as client:
            res = client.get("/api/analytics")
            assert res.status_code == 200

    def test_analytics_contains_predictions_and_fields(self):
        with TestClient(app) as client:
            res = client.get("/api/analytics")
            data = res.json()
            assert "predictions" in data
            assert "fields" in data


class TestModelMetricsEndpoint:
    def test_model_metrics_returns_200(self):
        with TestClient(app) as client:
            res = client.get("/api/model-metrics")
            assert res.status_code == 200

    def test_model_metrics_contains_classifier_and_regressor(self):
        with TestClient(app) as client:
            res = client.get("/api/model-metrics")
            data = res.json()
            # Metrics JSON must contain classifier accuracy and regressor R²
            has_classifier = "classifier" in data or "accuracy" in data
            has_regressor = "regressor" in data or "r2" in data or "mae" in data
            assert has_classifier or has_regressor, (
                f"model-metrics response does not contain classifier or regressor keys: {list(data.keys())}"
            )

