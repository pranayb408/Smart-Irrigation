"""Agronomic decision support service for smart irrigation and water conservation.

Calculates soil moisture depletion, crop evapotranspiration (ETc), effective rainfall credit,
volumetric field water requirements, system run times, next-inspection schedules, and
farmer-friendly explanations based on FAO-56 irrigation principles.
"""
import math
from typing import Any, Dict, Optional

# --- Agronomic Reference Constants (FAO-56 Irrigation & Drainage Paper 56) ---

SOIL_PROPERTIES = {
    "Sandy": {
        "field_capacity": 18.0,      # % volumetric moisture
        "wilting_point": 8.0,        # % volumetric moisture
        "awc": 10.0,                 # Available Water Capacity %
        "mad": 0.50,                 # Management Allowed Depletion (fraction)
        "stress_threshold": 13.0,    # Moisture below which crop experiences water stress
        "max_cycle_depth_mm": 20.0,  # Max water depth applied in a single cycle to prevent deep percolation
        "description": "Coarse texture, rapid drainage, low water holding capacity",
        "feel_test": "Cannot form a ball; crumbles between fingers; dry sand flows freely",
    },
    "Loamy": {
        "field_capacity": 33.0,
        "wilting_point": 14.0,
        "awc": 19.0,
        "mad": 0.50,
        "stress_threshold": 23.5,
        "max_cycle_depth_mm": 30.0,  # Max water depth applied in a single cycle
        "description": "Balanced soil texture, moderate drainage, high available water",
        "feel_test": "Forms a firm ball; can form a short 1-inch ribbon; feels smooth and pliable",
    },
    "Clay": {
        "field_capacity": 42.0,
        "wilting_point": 22.0,
        "awc": 20.0,
        "mad": 0.50,
        "stress_threshold": 32.0,
        "max_cycle_depth_mm": 25.0,  # Slow infiltration requires smaller, controlled applications
        "description": "Fine texture, slow infiltration, high water retention",
        "feel_test": "Forms a very tight, shiny ball; can form a long ribbon over 2 inches; sticky when wet",
    },
    "Silty": {
        "field_capacity": 35.0,
        "wilting_point": 15.0,
        "awc": 20.0,
        "mad": 0.50,
        "stress_threshold": 25.0,
        "max_cycle_depth_mm": 28.0,
        "description": "Fine particles, good water-holding capacity, moderate drainage",
        "feel_test": "Feels like flour when dry; smooth and soapy when moist; forms a fragile ribbon",
    },
}

# Crop coefficients (Kc) and effective rooting depths (mm) by growth stage
CROP_DATA = {
    "Wheat": {
        "Seedling": {"kc": 0.40, "root_depth_mm": 250, "sensitivity": "Moderate"},
        "Vegetative": {"kc": 0.80, "root_depth_mm": 550, "sensitivity": "High"},
        "Flowering": {"kc": 1.15, "root_depth_mm": 850, "sensitivity": "Critical"},
        "Maturity": {"kc": 0.35, "root_depth_mm": 900, "sensitivity": "Low"},
    },
    "Rice": {
        "Seedling": {"kc": 1.05, "root_depth_mm": 200, "sensitivity": "Critical"},
        "Vegetative": {"kc": 1.15, "root_depth_mm": 400, "sensitivity": "Critical"},
        "Flowering": {"kc": 1.30, "root_depth_mm": 600, "sensitivity": "Critical"},
        "Maturity": {"kc": 0.90, "root_depth_mm": 600, "sensitivity": "Moderate"},
    },
    "Maize": {
        "Seedling": {"kc": 0.40, "root_depth_mm": 300, "sensitivity": "Moderate"},
        "Vegetative": {"kc": 0.85, "root_depth_mm": 650, "sensitivity": "High"},
        "Flowering": {"kc": 1.20, "root_depth_mm": 950, "sensitivity": "Critical"},
        "Maturity": {"kc": 0.55, "root_depth_mm": 1000, "sensitivity": "Low"},
    },
    "Cotton": {
        "Seedling": {"kc": 0.45, "root_depth_mm": 300, "sensitivity": "Moderate"},
        "Vegetative": {"kc": 0.75, "root_depth_mm": 700, "sensitivity": "Moderate"},
        "Flowering": {"kc": 1.20, "root_depth_mm": 1050, "sensitivity": "Critical"},
        "Maturity": {"kc": 0.60, "root_depth_mm": 1100, "sensitivity": "Low"},
    },
    "Vegetables": {
        "Seedling": {"kc": 0.50, "root_depth_mm": 200, "sensitivity": "High"},
        "Vegetative": {"kc": 0.85, "root_depth_mm": 400, "sensitivity": "High"},
        "Flowering": {"kc": 1.05, "root_depth_mm": 500, "sensitivity": "Critical"},
        "Maturity": {"kc": 0.80, "root_depth_mm": 550, "sensitivity": "Moderate"},
    },
}

# Irrigation system application efficiencies
APPLICATION_EFFICIENCY = {
    "Drip": 0.90,        # 90% water reaches root zone
    "Sprinkler": 0.75,   # 75%
    "Furrow": 0.60,      # 60%
    "Basin": 0.55,       # 55%
}


def estimate_et0(temperature_c: float, humidity_pct: float) -> float:
    """Calculate approximate reference crop evapotranspiration (ET0) in mm/day.

    Uses temperature and vapor pressure deficit approximation based on FAO Penman-Monteith.
    """
    temp = max(5.0, min(50.0, temperature_c))
    hum = max(10.0, min(100.0, humidity_pct))
    vpd_factor = max(0.2, (100.0 - hum) / 100.0)
    base_et = 0.14 * (temp + 12.0) * (0.45 + 0.65 * vpd_factor)
    return round(max(2.0, min(9.5, base_et)), 2)


def calculate_agronomic_irrigation(
    soil_moisture: float,
    temperature: float,
    humidity: float,
    rainfall: float,
    forecast_rainfall: float,
    soil_type: str,
    crop_type: str,
    growth_stage: str,
    area_acres: float = 1.0,
    irrigation_method: str = "Drip",
    flow_rate_lpm: float = 50.0,
) -> Dict[str, Any]:
    """Execute complete agronomic water calculation answering all core farmer questions."""
    # 1. Look up soil and crop parameters
    soil_info = SOIL_PROPERTIES.get(soil_type, SOIL_PROPERTIES["Loamy"])
    crop_stages = CROP_DATA.get(crop_type, CROP_DATA["Wheat"])
    stage_info = crop_stages.get(growth_stage, crop_stages.get("Vegetative", {"kc": 0.8, "root_depth_mm": 500, "sensitivity": "Moderate"}))

    fc = soil_info["field_capacity"]
    wp = soil_info["wilting_point"]
    stress_threshold = soil_info["stress_threshold"]
    max_cycle_depth = soil_info["max_cycle_depth_mm"]
    kc = stage_info["kc"]
    root_depth_mm = stage_info["root_depth_mm"]
    stage_sensitivity = stage_info["sensitivity"]
    efficiency = APPLICATION_EFFICIENCY.get(irrigation_method, 0.90)

    # 2. Daily Crop Evapotranspiration ETc
    et0 = estimate_et0(temperature, humidity)
    etc_mm_per_day = round(et0 * kc, 2)

    # 3. Moisture Deficit & Single-Cycle Irrigation Depth
    moisture_deficit_pct = max(0.0, fc - soil_moisture)
    # Total theoretical deficit in root zone
    total_soil_deficit_mm = (moisture_deficit_pct / 100.0) * root_depth_mm

    # In practice, a single irrigation cycle replenishes up to max_cycle_depth to avoid deep runoff
    net_irrigation_depth_mm = min(total_soil_deficit_mm, max_cycle_depth)

    # 4. Rain Credit (Recent rain & Forecast rain adjustment)
    effective_forecast_rain = 0.0
    rain_postpone = False
    rain_explanation = "No significant rain expected."

    if forecast_rainfall >= 12.0:
        effective_forecast_rain = forecast_rainfall * 0.75
        if soil_moisture >= (stress_threshold - 4.0):
            rain_postpone = True
            rain_explanation = (
                f"Significant rain ({forecast_rainfall:.1f} mm) is forecast. "
                "Irrigation can be postponed to conserve water and prevent waterlogging."
            )
        else:
            rain_explanation = (
                f"Rain of {forecast_rainfall:.1f} mm is forecast. Water recommendation has been reduced "
                f"by {effective_forecast_rain:.1f} mm credit."
            )
    elif forecast_rainfall >= 4.0:
        effective_forecast_rain = forecast_rainfall * 0.65
        rain_explanation = (
            f"Moderate rain ({forecast_rainfall:.1f} mm) is forecast. "
            f"Reduced required water depth by {effective_forecast_rain:.1f} mm credit."
        )
    elif forecast_rainfall > 0:
        effective_forecast_rain = forecast_rainfall * 0.40
        rain_explanation = f"Light rain ({forecast_rainfall:.1f} mm) forecast has minor impact."

    # Adjusted net depth after rain credit
    adjusted_net_depth_mm = max(0.0, net_irrigation_depth_mm - effective_forecast_rain)

    # 5. Gross Irrigation Depth (accounting for application efficiency)
    gross_depth_mm = round(adjusted_net_depth_mm / efficiency, 1) if adjusted_net_depth_mm > 0 else 0.0

    # 6. Volumetric Calculation for the Field
    # 1 mm depth over 1 m² = 1 Liter. 1 acre = 4,046.86 m²
    field_area_m2 = area_acres * 4046.86
    total_liters = round(gross_depth_mm * field_area_m2, 1)

    # Rain credit in Liters saved
    rainfall_credit_liters = round((effective_forecast_rain / efficiency) * field_area_m2, 1) if effective_forecast_rain > 0 else 0.0

    # 7. Irrigation System Run Time
    flow_lpm = max(5.0, flow_rate_lpm)
    runtime_minutes = round(total_liters / flow_lpm, 1) if total_liters > 0 else 0.0
    hours = int(runtime_minutes // 60)
    mins = int(runtime_minutes % 60)
    runtime_formatted = f"{hours}h {mins}m" if hours > 0 else f"{mins} mins"

    # 8. Decision Logic & Urgency
    irrigation_needed = False
    urgency = "Low"
    action_label = "No irrigation indicated"

    if soil_moisture < stress_threshold:
        if rain_postpone:
            irrigation_needed = False
            urgency = "Monitor (Rain Expected)"
            action_label = "Postpone for forecast rain"
        else:
            irrigation_needed = True
            if soil_moisture < (wp + 3.0):
                urgency = "Critical - Immediate"
                action_label = "Immediate irrigation required"
            elif stage_sensitivity == "Critical":
                urgency = "High (Critical Stage)"
                action_label = "Irrigate within 12-24 hours"
            else:
                urgency = "Moderate"
                action_label = "Irrigate within 24-48 hours"
    elif soil_moisture < (fc - 5.0) and stage_sensitivity == "Critical" and etc_mm_per_day >= 5.5 and not rain_postpone:
        irrigation_needed = True
        urgency = "Moderate (High ETc)"
        action_label = "Light top-up recommended"
    else:
        irrigation_needed = False
        urgency = "Low"
        action_label = "Soil moisture adequate"

    if not irrigation_needed:
        total_liters = 0.0
        runtime_minutes = 0.0
        runtime_formatted = "0 mins"

    # 9. Next Inspection Window (Hours / Days)
    if soil_moisture > stress_threshold:
        moisture_buffer_pct = soil_moisture - stress_threshold
        buffer_depth_mm = (moisture_buffer_pct / 100.0) * root_depth_mm
        days_until_stress = max(0.5, buffer_depth_mm / max(1.0, etc_mm_per_day))
        next_check_hours = int(min(96, round(days_until_stress * 24)))
    else:
        next_check_hours = 12 if irrigation_needed else 24

    # 10. Farmer-Friendly Natural Language Explanations
    if irrigation_needed:
        why_text = (
            f"Soil moisture is at {soil_moisture:.1f}%, which has dropped below the safe threshold of "
            f"{stress_threshold:.1f}% for {soil_type} soil. The crop is in the {growth_stage} stage "
            f"({stage_sensitivity} water stress sensitivity). Weather conditions (Temp: {temperature:.1f}°C, "
            f"Humidity: {humidity:.1f}%) result in an estimated crop water loss of {etc_mm_per_day:.1f} mm/day."
        )
    elif rain_postpone:
        why_text = (
            f"Soil moisture ({soil_moisture:.1f}%) is low, but {forecast_rainfall:.1f} mm of rainfall "
            f"is forecast. Postponing irrigation will conserve an estimated {rainfall_credit_liters:,.0f} Liters "
            f"and avoid nutrient leaching."
        )
    else:
        why_text = (
            f"Soil moisture ({soil_moisture:.1f}%) is in the healthy zone above the stress threshold of "
            f"{stress_threshold:.1f}% for {soil_type} soil. Current moisture reserves are sufficient "
            f"for approximately {max(1, next_check_hours // 24)} more days of crop transpiration."
        )

    if irrigation_needed:
        action_guidance = (
            f"Apply ~{total_liters:,.0f} Liters ({gross_depth_mm:.1f} mm depth) using your {irrigation_method} system. "
            f"At a system flow rate of {flow_rate_lpm:.0f} L/min, run the pump for approximately {runtime_formatted}. "
            f"{rain_explanation}"
        )
    else:
        action_guidance = (
            f"Keep the irrigation pump off. Re-evaluate soil conditions in ~{next_check_hours} hours. "
            f"{rain_explanation}"
        )

    # Offline / Sensor Failure Fallback Guidance
    fallback_guide = {
        "feel_test_instruction": (
            f"For {soil_type} soil: take a soil sample at 15-20 cm depth. {soil_info['feel_test']}."
        ),
        "stage_rule": (
            f"In the {growth_stage} stage, {crop_type} typically uses {etc_mm_per_day:.1f} mm/day in sunny conditions."
        ),
        "emergency_action": (
            f"If sensors are unavailable and visual wilting occurs before 10 AM, apply a standard "
            f"{irrigation_method} cycle of ~{round((15.0 / efficiency) * field_area_m2):,.0f} Liters."
        ),
    }

    return {
        "irrigation_needed": irrigation_needed,
        "action_label": action_label,
        "urgency": urgency,
        "why_explanation": why_text,
        "action_guidance": action_guidance,
        "rain_explanation": rain_explanation,
        # Numeric Agronomic Metrics
        "field_capacity_pct": fc,
        "wilting_point_pct": wp,
        "stress_threshold_pct": stress_threshold,
        "daily_crop_water_loss_mm": etc_mm_per_day,
        "reference_et0_mm": et0,
        "crop_coefficient_kc": kc,
        "root_depth_mm": root_depth_mm,
        "effective_rainfall_credit_mm": round(effective_forecast_rain, 1),
        "rainfall_credit_liters": rainfall_credit_liters,
        "gross_depth_needed_mm": gross_depth_mm,
        "agronomic_water_liters": total_liters,
        "runtime_minutes": runtime_minutes,
        "runtime_formatted": runtime_formatted,
        "next_check_hours": next_check_hours,
        "application_efficiency": efficiency,
        "fallback_guide": fallback_guide,
    }
