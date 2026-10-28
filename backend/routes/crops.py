"""FastAPI route for AI Crop Doctor & Agricultural Image Diagnostics."""
from typing import Optional, List, Dict, Any
import base64
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field

from backend.services.crop_doctor_service import diagnose_crop_health, DIAGNOSTIC_KNOWLEDGE_BASE

router = APIRouter(prefix="/api/crops", tags=["AI Crop Doctor"])


class CropDiagnoseJSONRequest(BaseModel):
    image_base64: Optional[str] = Field(default=None, description="Data URL or Base64 encoded image string")
    crop_type: Optional[str] = Field(default="Wheat", max_length=50)
    plant_part: Optional[str] = Field(default="Leaf", max_length=50)
    symptoms: Optional[str] = Field(default=None, max_length=500)
    soil_type: Optional[str] = Field(default=None, max_length=50)
    field_name: Optional[str] = Field(default="Main Farm Plot", max_length=100)


@router.post("/diagnose")
def diagnose_crop_json(payload: CropDiagnoseJSONRequest):
    """Diagnose crop condition from Base64 image and field parameters."""
    image_bytes = None
    if payload.image_base64:
        raw = payload.image_base64
        if "," in raw:
            raw = raw.split(",", 1)[1]
        try:
            image_bytes = base64.b64decode(raw)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {str(exc)}")

    result = diagnose_crop_health(
        image_bytes=image_bytes,
        crop_type=payload.crop_type,
        plant_part=payload.plant_part,
        symptoms=payload.symptoms,
        soil_type=payload.soil_type,
        field_name=payload.field_name,
    )
    return result


@router.post("/upload-diagnose")
async def diagnose_crop_upload(
    file: Optional[UploadFile] = File(None),
    crop_type: Optional[str] = Form("Wheat"),
    plant_part: Optional[str] = Form("Leaf"),
    symptoms: Optional[str] = Form(""),
    field_name: Optional[str] = Form("Main Farm Plot"),
):
    """Diagnose crop condition from direct multipart image upload."""
    image_bytes = None
    if file:
        image_bytes = await file.read()

    result = diagnose_crop_health(
        image_bytes=image_bytes,
        crop_type=crop_type,
        plant_part=plant_part,
        symptoms=symptoms,
        field_name=field_name,
    )
    return result


@router.get("/knowledge-base")
def get_knowledge_base():
    """Return catalogue of detectable conditions and smart irrigation rules."""
    return {
        "conditions_count": len(DIAGNOSTIC_KNOWLEDGE_BASE),
        "supported_crops": ["Wheat", "Rice", "Cotton", "Tomato", "Maize", "Sugarcane", "Potato", "Soybean", "Groundnut"],
        "catalog": [
            {
                "key": k,
                "condition_name": v["condition_name"],
                "category": v["category"],
                "severity": v["severity"],
            }
            for k, v in DIAGNOSTIC_KNOWLEDGE_BASE.items()
        ],
    }

