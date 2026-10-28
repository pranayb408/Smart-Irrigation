"""API routes for Water Conservation Budgeting and Irrigation Application Logs."""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from backend.schemas import (
    IrrigationLogCreate,
    IrrigationLogResponse,
    IrrigationEventCreate,
    IrrigationEventResponse,
)
from backend.database import (
    create_irrigation_event,
    list_irrigation_events,
    create_irrigation_log,
    list_irrigation_logs,
    get_water_budget_summary,
)

router = APIRouter(prefix="/api", tags=["Water Conservation & Irrigation Events"])


@router.get("/water-budget")
def water_budget(field_id: int | None = Query(default=None)):
    """Retrieve cumulative applied water, seasonal reference comparison, and water saved."""
    return get_water_budget_summary(field_id)


# --- Completed Irrigation Events Endpoints (Phase 1 Requirement) ---

@router.get("/irrigation/events")
@router.get("/irrigation-events", include_in_schema=False)
def get_irrigation_events(
    limit: int = Query(default=100, ge=1, le=500, description="Max events to return"),
    field_id: Optional[int] = None,
    field_name: Optional[str] = None,
    measurement_source: Optional[str] = None,
):
    """List completed irrigation events with volume, duration, field area, and source."""
    items = list_irrigation_events(
        limit=limit,
        field_name=field_name,
        measurement_source=measurement_source,
        field_id=field_id,
    )
    return {"items": items, "count": len(items)}


@router.post("/irrigation/events", status_code=status.HTTP_201_CREATED)
@router.post("/irrigation-events", status_code=status.HTTP_201_CREATED, include_in_schema=False)
def add_irrigation_event(payload: IrrigationEventCreate):
    """Record a completed irrigation event into database."""
    try:
        data = payload.model_dump()
        # Handle volume and duration resolution
        vol = data.get("water_volume")
        if vol is None:
            vol = data.get("liters_applied")

        dur = data.get("irrigation_duration")
        if dur is None:
            dur = data.get("duration_minutes")

        if dur is None:
            dur = 60.0
        dur = float(dur)

        flow = data.get("flow_rate_lpm") or 50.0
        if vol is None:
            vol = dur * flow
        vol = float(vol)

        data["water_volume"] = vol
        data["liters_applied"] = vol
        data["irrigation_duration"] = dur
        data["duration_minutes"] = dur

        saved = create_irrigation_event(data)
        return {"item": saved, "message": "Irrigation event recorded successfully."}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not record irrigation event: {str(exc)}") from exc


# --- Backward Compatible Endpoints for Existing Irrigation Logs ---

@router.get("/irrigation-logs")
def get_irrigation_logs(limit: int = Query(default=100, ge=1, le=500), field_id: int | None = None):
    """List historical irrigation application events."""
    items = list_irrigation_logs(limit, field_id)
    return {"items": items, "count": len(items)}


@router.post("/irrigation-logs", status_code=201)
def record_irrigation_event(payload: IrrigationLogCreate):
    """Log an actual irrigation session into the farm water records."""
    try:
        saved = create_irrigation_log(payload.model_dump())
        return {"item": saved, "message": "Irrigation application logged successfully."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not record irrigation log: {str(exc)}") from exc
