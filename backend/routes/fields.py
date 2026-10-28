"""API routes for Farm Setup and Field Management."""
from fastapi import APIRouter, HTTPException, Path
from backend.schemas import FieldCreate, FieldUpdate, FieldResponse
from backend.database import list_fields, get_field, create_field, update_field, delete_field

router = APIRouter(prefix="/api/fields", tags=["Farm & Fields"])


@router.get("", response_model=list[dict])
def get_all_fields():
    """List all registered farm fields with latest telemetry and water budget status."""
    return list_fields()


@router.post("", status_code=201)
def add_field(payload: FieldCreate):
    """Register a new farm field with crop, soil, pump flow rate, and area."""
    try:
        new_field = create_field(payload.model_dump())
        return new_field
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not create field: {str(exc)}") from exc


@router.get("/{field_id}")
def get_field_by_id(field_id: int = Path(..., ge=1)):
    """Retrieve details, latest reading, and water budget for a single field."""
    field = get_field(field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found.")
    return field


@router.put("/{field_id}")
def modify_field(field_id: int, payload: FieldUpdate):
    """Update field characteristics, crop stage, or irrigation system parameters."""
    updated = update_field(field_id, {k: v for k, v in payload.model_dump().items() if v is not None})
    if not updated:
        raise HTTPException(status_code=404, detail="Field not found.")
    return updated


@router.delete("/{field_id}", status_code=204)
def remove_field(field_id: int):
    """Delete a field from the farm workspace."""
    success = delete_field(field_id)
    if not success:
        raise HTTPException(status_code=404, detail="Field not found.")
    return None
