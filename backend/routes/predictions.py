"""Routes for inference and prediction history."""
from fastapi import APIRouter, Query
from backend.schemas import SensorInput
from backend.database import list_predictions
from backend.services.irrigation_service import run_irrigation_prediction

router = APIRouter(prefix="/api", tags=["Predictions"])


@router.post("/predict")
@router.post("/predictions", include_in_schema=False)
def create_prediction(payload: SensorInput):
    """Predict irrigation requirement, pump runtime, water volume, and rain adjustments."""
    return run_irrigation_prediction(payload.model_dump())


@router.get("/predictions")
def prediction_history(
    limit: int = Query(default=50, ge=1, le=500),
    field_id: int | None = Query(default=None),
):
    """List historical predictions with agronomic and ML metrics."""
    items = list_predictions(limit, field_id)
    return {"items": items, "count": len(items)}
