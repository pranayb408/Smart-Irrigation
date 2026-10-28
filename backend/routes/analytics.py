"""Routes for dashboard summaries and analytics."""
from fastapi import APIRouter
from backend.database import get_dashboard_summary, get_analytics
from ml.predictor import get_metrics

router = APIRouter(prefix="/api", tags=["Analytics"])


@router.get("/dashboard")
def dashboard():
    return get_dashboard_summary()


@router.get("/analytics")
def analytics():
    return get_analytics()


@router.get("/model-metrics")
def model_metrics():
    return get_metrics()
