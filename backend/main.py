"""FastAPI entry point for AI Smart Irrigation and Water Conservation."""
import os
import sys
from pathlib import Path

# Ensure smart-irrigation project root is always in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import uvicorn
from backend.database import init_db, engine
from backend.routes import predictions, sensors, analytics, fields, water_budget, crops


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Train missing model artifacts once on first startup; afterwards load saved files.
    from ml.predictor import train_if_needed
    train_if_needed()
    yield


app = FastAPI(
    title="AI Smart Irrigation & Water Conservation API",
    description=(
        "Full-stack educational & decision-support API for agricultural water management, "
        "combining soil sensors, ESP32 IoT telemetry, Random Forest machine learning, "
        "and FAO-56 agronomic calculations."
    ),
    version="1.2.0",
    lifespan=lifespan,
)

# CORS configurations
env_cors = os.getenv("CORS_ORIGINS")
if env_cors:
    origins = [o.strip() for o in env_cors.split(",") if o.strip()]
else:
    origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fields.router)
app.include_router(sensors.router)
app.include_router(predictions.router)
app.include_router(water_budget.router)
app.include_router(analytics.router)
app.include_router(crops.router)


@app.get("/", tags=["System"])
def root():
    return {
        "name": "AI Smart Irrigation & Water Conservation API",
        "version": "1.2.0",
        "docs": "/docs",
        "status": "running",
        "database": engine.dialect.name,
    }


@app.get("/api/health", tags=["System"])
def health():
    """Healthcheck endpoint verifying server status and database connectivity."""
    db_name = engine.dialect.name
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = f"{db_name} (connected)"
    except Exception as exc:
        db_status = f"{db_name} (error: {str(exc)})"

    return {
        "status": "healthy",
        "database": db_status,
        "ml_models": "loaded on demand",
        "modules": ["fields", "sensors_iot", "decision_support", "water_budget", "analytics", "ai_crop_doctor"],
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)

