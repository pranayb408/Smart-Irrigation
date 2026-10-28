"""Smart irrigation calculation and recommendation service — Phase 3.

Architecture
------------
Three clearly separated layers:

1. **Input validation** — `validate_sensor_inputs()` checks ranges and required fields.
2. **ML prediction** — `get_ml_prediction()` calls the Random Forest classifier/regressor
   and returns a clearly labelled educational estimate.
3. **Water volume / runtime calculation** — `calculate_water_volume()` and
   `calculate_runtime_hours()` are pure functions that depend only on the numbers
   supplied by the caller, not on any ML output.

`run_irrigation_prediction()` orchestrates all three layers, builds a human-readable
recommendation, and persists the result to the SQLite database.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from ml.predictor import predict as ml_predict
from backend.services.agronomic_service import calculate_agronomic_irrigation
from backend.database import create_prediction, get_field, get_field_by_name

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ACRES_TO_M2 = 4_046.86  # 1 acre = 4 046.86 m²
MM_OVER_M2_TO_LITRES = 1.0  # 1 mm depth × 1 m² area = 1 litre (by definition)

# Default application efficiency per method (fraction, 0–1)
DEFAULT_EFFICIENCY = {
    "Drip": 0.90,
    "Sprinkler": 0.75,
    "Furrow": 0.60,
    "Basin": 0.65,
}
FALLBACK_EFFICIENCY = 0.75

# ---------------------------------------------------------------------------
# Layer 1 — Input validation
# ---------------------------------------------------------------------------


def validate_sensor_inputs(payload: Dict[str, Any]) -> List[str]:
    """Validate required sensor readings and return a list of human-readable errors.

    Returns an empty list when all inputs are valid.

    Parameters checked
    ------------------
    - soil_moisture  : 0 – 100 %
    - temperature    : -20 – 60 °C
    - humidity       : 0 – 100 %
    - rainfall       : >= 0 mm
    """
    errors: List[str] = []

    # Required fields presence check
    for field in ("soil_moisture", "temperature", "humidity"):
        if payload.get(field) is None:
            errors.append(f"'{field}' is required but was not provided.")

    # Range checks (only when the value is present)
    sm = payload.get("soil_moisture")
    if sm is not None:
        if not (0 <= float(sm) <= 100):
            errors.append(
                f"'soil_moisture' must be between 0 and 100 % (received {sm})."
            )

    temp = payload.get("temperature")
    if temp is not None:
        if not (-20 <= float(temp) <= 60):
            errors.append(
                f"'temperature' must be between -20 and 60 °C (received {temp})."
            )

    hum = payload.get("humidity")
    if hum is not None:
        if not (0 <= float(hum) <= 100):
            errors.append(
                f"'humidity' must be between 0 and 100 % (received {hum})."
            )

    rain = payload.get("rainfall")
    if rain is not None:
        if float(rain) < 0:
            errors.append(
                f"'rainfall' must be >= 0 mm (received {rain})."
            )

    return errors


# ---------------------------------------------------------------------------
# Layer 2 — ML prediction (educational estimate only)
# ---------------------------------------------------------------------------


def get_ml_prediction(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Call the trained Random Forest models and return a clearly labelled result.

    The returned dict always contains:
    - ``irrigation_needed`` (bool)
    - ``confidence``        (float, 0–1)
    - ``estimated_water_liters_per_acre`` (float)
    - ``disclaimer``        (str) — always present to remind callers this is educational
    - ``model_available``   (bool)
    """
    try:
        raw = ml_predict(payload)
        return {
            "irrigation_needed": bool(raw.get("irrigation_needed", False)),
            "confidence": round(float(raw.get("confidence", 0.0)), 4),
            "estimated_water_liters_per_acre": round(
                float(raw.get("estimated_water_liters", 0.0)), 2
            ),
            "model_available": True,
            "disclaimer": (
                "This prediction is produced by a Random Forest model trained on synthetic "
                "data generated for coursework purposes. It must not be used as a substitute "
                "for agronomist advice or calibrated field measurements."
            ),
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "irrigation_needed": False,
            "confidence": 0.0,
            "estimated_water_liters_per_acre": 0.0,
            "model_available": False,
            "error": str(exc),
            "disclaimer": "ML model could not be loaded. See 'error' for details.",
        }


# ---------------------------------------------------------------------------
# Layer 3 — Water volume and runtime calculation (pure functions)
# ---------------------------------------------------------------------------


def calculate_water_volume(
    area_m2: float,
    depth_mm: float,
    application_efficiency: float = FALLBACK_EFFICIENCY,
) -> Dict[str, float]:
    """Calculate gross water volume required to apply *depth_mm* to *area_m2*.

    Formula
    -------
    ``net_volume_litres = depth_mm × area_m2``   (1 mm × 1 m² = 1 litre)
    ``gross_volume_litres = net_volume_litres / application_efficiency``

    Parameters
    ----------
    area_m2 : float
        Field area in square metres (> 0).
    depth_mm : float
        Target irrigation depth in millimetres (>= 0).
    application_efficiency : float
        Fraction of applied water that reaches the root zone (0 < eff <= 1).
        Defaults to 0.75 when not provided.

    Returns
    -------
    dict with keys ``net_volume_litres``, ``gross_volume_litres``,
    ``depth_mm``, ``area_m2``, ``application_efficiency``.
    """
    if area_m2 <= 0:
        raise ValueError(f"area_m2 must be > 0, got {area_m2}")
    if depth_mm < 0:
        raise ValueError(f"depth_mm must be >= 0, got {depth_mm}")
    if not (0 < application_efficiency <= 1):
        raise ValueError(
            f"application_efficiency must be in (0, 1], got {application_efficiency}"
        )

    net = depth_mm * area_m2 * MM_OVER_M2_TO_LITRES
    gross = net / application_efficiency

    return {
        "net_volume_litres": round(net, 2),
        "gross_volume_litres": round(gross, 2),
        "depth_mm": round(depth_mm, 2),
        "area_m2": round(area_m2, 2),
        "application_efficiency": round(application_efficiency, 4),
    }


def calculate_runtime_hours(
    volume_litres: float,
    flow_rate_lph: Optional[float],
) -> Optional[float]:
    """Calculate irrigation runtime in **hours** given a flow rate in litres per hour.

    Returns ``None`` when *flow_rate_lph* is ``None`` or <= 0, so callers can
    distinguish "runtime unknown" from "runtime is zero".

    Parameters
    ----------
    volume_litres : float
        Gross water volume to deliver (litres).
    flow_rate_lph : float or None
        System flow rate in **litres per hour**. Must be > 0 for a result.
    """
    if flow_rate_lph is None or float(flow_rate_lph) <= 0:
        return None
    if volume_litres <= 0:
        return 0.0
    return round(volume_litres / float(flow_rate_lph), 4)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_recommendation(
    validation_errors: List[str],
    ml: Dict[str, Any],
    agro: Dict[str, Any],
    water_calc: Optional[Dict[str, Any]],
    runtime_hours: Optional[float],
    data_quality: str,
) -> str:
    """Compose a plain-language farmer recommendation from all available evidence."""
    if validation_errors:
        return "Sensor readings are invalid: " + "; ".join(validation_errors)

    if data_quality == "insufficient":
        parts = ["Important soil/crop context (soil type, crop type, or growth stage) is missing — the estimate below is approximate."]
    else:
        parts = []

    # Agronomic verdict takes priority as it is physics-based
    if agro.get("irrigation_needed"):
        parts.append(f"Agronomic analysis indicates irrigation is needed (urgency: {agro.get('urgency', 'Unknown')}).")
    else:
        parts.append("Agronomic analysis indicates soil moisture is currently adequate.")

    if ml.get("model_available"):
        ml_verdict = "also suggests irrigation" if ml["irrigation_needed"] else "does not indicate irrigation need"
        parts.append(
            f"The educational ML model (confidence {ml['confidence']:.0%}) {ml_verdict}."
        )

    if water_calc:
        gross = water_calc["gross_volume_litres"]
        parts.append(
            f"Estimated gross water to apply: {gross:,.1f} L "
            f"(depth {water_calc['depth_mm']} mm × {water_calc['area_m2']:,.0f} m² "
            f"at {water_calc['application_efficiency']:.0%} efficiency)."
        )
        if runtime_hours is not None:
            hrs = int(runtime_hours)
            mins = round((runtime_hours - hrs) * 60)
            parts.append(f"Estimated runtime at the given flow rate: {hrs}h {mins}m.")
        else:
            parts.append("Irrigation runtime not calculated — no valid flow rate (L/hr) provided.")
    else:
        parts.append("Water volume not calculated — field area or irrigation depth not provided.")

    return " ".join(parts)


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------


def run_irrigation_prediction(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Orchestrate validation → ML prediction → water calculation → persistence.

    Response structure
    ------------------
    The response always contains three top-level blocks so callers can distinguish
    the origin of each number:

    - ``validation``       : list of errors (empty = all inputs OK)
    - ``ml_prediction``    : educational Random Forest output (labelled as such)
    - ``water_calculation``: physics-based volume / runtime block (may be None)

    Returns an ``"insufficient_data"`` flag when important agronomic context
    (soil_type, crop_type, growth_stage) is absent.
    """
    model_input = dict(payload)

    # ── Step 1: resolve field context ────────────────────────────────────────
    field_data: Optional[Dict[str, Any]] = None
    if model_input.get("field_id"):
        field_data = get_field(int(model_input["field_id"]))
    elif model_input.get("field_name"):
        field_data = get_field_by_name(str(model_input["field_name"]))

    if field_data:
        model_input.setdefault("soil_type", field_data.get("soil_type", "Loamy"))
        model_input.setdefault("crop_type", field_data.get("crop_type", "Wheat"))
        model_input.setdefault("growth_stage", field_data.get("growth_stage", "Vegetative"))
        model_input.setdefault("area_acres", field_data.get("area_acres", 1.0))

    # ── Step 2: input validation ──────────────────────────────────────────────
    validation_errors = validate_sensor_inputs(model_input)
    if validation_errors:
        return {
            "status": "validation_error",
            "validation": validation_errors,
            "ml_prediction": None,
            "water_calculation": None,
            "recommendation": "Cannot process request: " + "; ".join(validation_errors),
            "model": "Smart Irrigation Service v3",
            "limitations": (
                "Fix the reported validation errors and re-submit. "
                "Ensure soil_moisture (0–100 %), temperature (−20–60 °C), "
                "and humidity (0–100 %) are supplied."
            ),
        }

    # ── Step 3: data quality assessment ──────────────────────────────────────
    optional_context = ("soil_type", "crop_type", "growth_stage")
    missing_context = [k for k in optional_context if not model_input.get(k)]
    data_quality = "insufficient" if missing_context else "adequate"

    # Fill safe defaults for missing context fields (must happen AFTER the assessment above)
    if not model_input.get("soil_type"):
        model_input["soil_type"] = "Loamy"
    if not model_input.get("crop_type"):
        model_input["crop_type"] = "Wheat"
    if not model_input.get("growth_stage"):
        model_input["growth_stage"] = "Vegetative"

    # ── Step 4: ML prediction (educational) ──────────────────────────────────
    ml_result = get_ml_prediction(model_input)

    # ── Step 5: Agronomic calculation (FAO-56) ────────────────────────────────
    area_acres = float(model_input.get("area_acres") or 1.0)
    irrigation_method = str(model_input.get("irrigation_method") or "Drip")
    flow_rate_lpm = float(model_input.get("flow_rate_lpm") or 0.0)

    agro_result = calculate_agronomic_irrigation(
        soil_moisture=float(model_input["soil_moisture"]),
        temperature=float(model_input["temperature"]),
        humidity=float(model_input["humidity"]),
        rainfall=float(model_input.get("rainfall", 0)),
        forecast_rainfall=float(model_input.get("forecast_rainfall", 0)),
        soil_type=model_input["soil_type"],
        crop_type=model_input["crop_type"],
        growth_stage=model_input["growth_stage"],
        area_acres=area_acres,
        irrigation_method=irrigation_method,
        flow_rate_lpm=flow_rate_lpm if flow_rate_lpm > 0 else 50.0,
    )

    # ── Step 6: direct water volume calculation ───────────────────────────────
    # Derive depth from the agronomic engine's output (net mm per acre converted to mm over field)
    agro_depth_mm: Optional[float] = agro_result.get("daily_crop_water_loss_mm")
    area_m2 = area_acres * ACRES_TO_M2

    water_calc: Optional[Dict[str, Any]] = None
    if agro_depth_mm is not None and agro_depth_mm > 0 and area_m2 > 0:
        eff = DEFAULT_EFFICIENCY.get(irrigation_method, FALLBACK_EFFICIENCY)
        water_calc = calculate_water_volume(
            area_m2=area_m2,
            depth_mm=agro_depth_mm,
            application_efficiency=eff,
        )

    # ── Step 7: runtime (only when flow_rate_lph is provided) ─────────────────
    flow_rate_lph: Optional[float] = None
    if model_input.get("flow_rate_lph") is not None:
        raw_lph = float(model_input["flow_rate_lph"])
        if raw_lph > 0:
            flow_rate_lph = raw_lph

    runtime_hours: Optional[float] = None
    if water_calc and flow_rate_lph is not None:
        runtime_hours = calculate_runtime_hours(
            volume_litres=water_calc["gross_volume_litres"],
            flow_rate_lph=flow_rate_lph,
        )

    # ── Step 8: synthesise recommendation ────────────────────────────────────
    recommendation = _build_recommendation(
        validation_errors=[],
        ml=ml_result,
        agro=agro_result,
        water_calc=water_calc,
        runtime_hours=runtime_hours,
        data_quality=data_quality,
    )

    # Hybrid irrigation decision (either source indicating need → recommend)
    irrigation_needed = bool(ml_result["irrigation_needed"] or agro_result.get("irrigation_needed", False))

    # Preferred water volume: agronomic gross if available, else ML baseline
    primary_water_litres = (
        water_calc["gross_volume_litres"]
        if water_calc
        else round(
            ml_result["estimated_water_liters_per_acre"] * area_acres, 2
        )
    )

    # ── Step 9: compose response ──────────────────────────────────────────────
    # runtime in minutes for database backward-compat (database stores runtime_minutes)
    runtime_minutes: Optional[float] = (
        round(runtime_hours * 60, 2) if runtime_hours is not None else None
    )

    unified = {
        # Top-level decision
        "irrigation_needed": irrigation_needed,
        "label": "Irrigation recommended" if irrigation_needed else "No irrigation indicated",
        "urgency": agro_result.get("urgency", "Low") if irrigation_needed else "Low",
        "recommendation": recommendation,
        "data_quality": data_quality,
        "missing_context": missing_context,

        # Top-level ML confidence (required by database.create_prediction)
        "confidence": ml_result["confidence"],

        # Separated blocks (Phase 3 requirement)
        "ml_prediction": ml_result,
        "water_calculation": water_calc,

        # Convenience top-level water figures
        "estimated_water_liters": primary_water_litres,
        "agronomic_water_liters": agro_result.get("agronomic_water_liters", 0.0),
        "runtime_hours": runtime_hours,
        "runtime_minutes": runtime_minutes,   # backward-compat for DB
        "flow_rate_lph_used": flow_rate_lph,

        # Agronomic detail (for /docs transparency)
        "why_explanation": agro_result.get("why_explanation", ""),
        "rain_explanation": agro_result.get("rain_explanation", ""),
        "effective_rainfall_credit_mm": agro_result.get("effective_rainfall_credit_mm", 0.0),
        "rainfall_credit_liters": agro_result.get("rainfall_credit_liters", 0.0),
        "reference_et0_mm": agro_result.get("reference_et0_mm", 0.0),
        "crop_coefficient_kc": agro_result.get("crop_coefficient_kc", 1.0),
        "daily_crop_water_loss_mm": agro_result.get("daily_crop_water_loss_mm", 0.0),
        "field_capacity_pct": agro_result.get("field_capacity_pct", 0.0),
        "stress_threshold_pct": agro_result.get("stress_threshold_pct", 0.0),
        "root_depth_mm": agro_result.get("root_depth_mm", 0.0),
        "next_check_hours": agro_result.get("next_check_hours", 24),
        "area_acres": area_acres,
        "irrigation_method": irrigation_method,
        "fallback_guide": agro_result.get("fallback_guide"),
        # Legacy keys kept for backward-compat with existing tests
        "runtime_formatted": agro_result.get("runtime_formatted", ""),
        "flow_rate_lpm": flow_rate_lpm,

        # Metadata
        "model": "Hybrid AI (Random Forest) + FAO-56 Penman-Monteith Agronomic Engine — Phase 3",
        "limitations": (
            "Decision support prototype for coursework and demonstration. "
            "ML predictions are based on synthetic training data. "
            "Local soil variability, salinity, and microclimate must be verified "
            "before any field application."
        ),
        "validation": [],
    }

    # ── Step 10: persist to database ─────────────────────────────────────────
    record = create_prediction(model_input, unified)

    return {
        **unified,
        "id": record["id"],
        "timestamp": record["timestamp"],
        "input": model_input,
    }
