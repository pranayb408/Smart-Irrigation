"""Lightweight tests for the generated dataset and target definitions."""
from ml.preprocessing import load_dataset, FEATURE_COLUMNS, CLASS_TARGET, REG_TARGET


def test_dataset_has_required_features_and_targets():
    frame = load_dataset()
    assert len(frame) >= 100
    assert set(FEATURE_COLUMNS + [CLASS_TARGET, REG_TARGET]).issubset(frame.columns)
    assert frame[FEATURE_COLUMNS].notna().all().all()


def test_class_target_is_binary_and_water_non_negative():
    frame = load_dataset()
    assert set(frame[CLASS_TARGET].unique()).issubset({0, 1})
    assert (frame[REG_TARGET] >= 0).all()


def test_sensor_values_are_in_expected_ranges():
    frame = load_dataset()
    assert frame["soil_moisture"].between(0, 100).all()
    assert frame["humidity"].between(0, 100).all()
    assert frame["temperature"].between(-10, 60).all()
