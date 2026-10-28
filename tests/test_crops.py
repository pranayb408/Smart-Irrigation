"""Tests for AI Crop Doctor and agronomic image diagnosis endpoint."""
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_crop_knowledge_base():
    """Verify crop doctor knowledge base returns supported crops and conditions."""
    response = client.get("/api/crops/knowledge-base")
    assert response.status_code == 200
    data = response.json()
    assert "conditions_count" in data
    assert data["conditions_count"] >= 5
    assert "Wheat" in data["supported_crops"]
    assert "Tomato" in data["supported_crops"]


def test_crop_diagnose_json_healthy():
    """Verify JSON diagnosis for healthy crop with no symptoms."""
    payload = {
        "crop_type": "Wheat",
        "plant_part": "Leaf",
        "symptoms": "Healthy deep green leaves",
        "field_name": "Test Field A"
    }
    response = client.post("/api/crops/diagnose", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["crop_type"] == "Wheat"
    assert "confidence_score" in data
    assert "irrigation_advice" in data
    assert "immediate_actions" in data
    assert "organic_treatment" in data
    assert "chemical_treatment" in data


def test_crop_diagnose_json_rust():
    """Verify diagnosis detects rust when symptoms or foliage indicate yellow rust."""
    payload = {
        "crop_type": "Wheat",
        "plant_part": "Leaf",
        "symptoms": "yellow stripes and orange dust on leaves",
        "field_name": "Block 2"
    }
    response = client.post("/api/crops/diagnose", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "Rust" in data["condition_name"]
    assert data["category"] == "Fungal"
    assert "sprinkler" in data["irrigation_advice"].lower() or "drip" in data["irrigation_advice"].lower()
