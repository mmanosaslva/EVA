from datetime import date

import pytest
from pydantic import ValidationError

from app.models.symptom import SymptomEntry, DailyLogCreate, DailyLogUpdate, SymptomResponse, SymptomLogEntry, DailyLogResponse, DailyLogListResponse
from app.models.cycle import CycleCreate, CycleUpdate


class TestCycleSchemas:

    def test_create_valid(self):
        c = CycleCreate(start_date=date(2025, 6, 1))
        assert c.start_date == date(2025, 6, 1)
        assert c.end_date is None

    def test_create_with_end(self):
        c = CycleCreate(start_date=date(2025, 6, 1), end_date=date(2025, 6, 5))
        assert c.end_date == date(2025, 6, 5)

    def test_create_invalid_dates(self):
        with pytest.raises(ValidationError):
            CycleCreate(start_date=date(2025, 6, 5), end_date=date(2025, 6, 1))

    def test_update_partial(self):
        c = CycleUpdate(start_date=date(2025, 6, 1))
        assert c.start_date == date(2025, 6, 1)

    def test_update_empty(self):
        c = CycleUpdate()
        assert c.start_date is None


class TestSymptomSchemas:

    def test_entry_valid(self):
        s = SymptomEntry(symptom_id=1, intensity=3)
        assert s.symptom_id == 1
        assert s.intensity == 3

    def test_entry_intensity_too_low(self):
        with pytest.raises(ValidationError):
            SymptomEntry(symptom_id=1, intensity=0)

    def test_entry_intensity_too_high(self):
        with pytest.raises(ValidationError):
            SymptomEntry(symptom_id=1, intensity=6)

    def test_response(self):
        s = SymptomResponse(id=1, name="Fatiga", category="fisica", common_phase="lutea")
        assert s.id == 1
        assert s.common_phase == "lutea"

    def test_response_nullable_phase(self):
        s = SymptomResponse(id=1, name="Fatiga", category="fisica")
        assert s.common_phase is None

    def test_symptom_log_entry(self):
        s = SymptomLogEntry(symptom_id=1, intensity=3, name="Fatiga", category="fisica", common_phase="lutea")
        assert s.name == "Fatiga"


class TestDailyLogSchemas:

    def test_create_minimal(self):
        d = DailyLogCreate(cycle_id="550e8400-e29b-41d4-a716-446655440001", date=date(2025, 6, 1))
        assert d.symptoms == []

    def test_create_with_symptoms(self):
        d = DailyLogCreate(
            cycle_id="550e8400-e29b-41d4-a716-446655440001",
            date=date(2025, 6, 1),
            flow_level="medium",
            temperature=36.75,
            symptoms=[{"symptom_id": 1, "intensity": 3}],
        )
        assert len(d.symptoms) == 1
        assert d.flow_level == "medium"

    def test_create_invalid_flow(self):
        with pytest.raises(ValidationError):
            DailyLogCreate(cycle_id="x", date=date(2025, 6, 1), flow_level="extreme")

    def test_create_invalid_temperature(self):
        with pytest.raises(ValidationError):
            DailyLogCreate(cycle_id="x", date=date(2025, 6, 1), temperature=50.0)

    def test_update_partial(self):
        d = DailyLogUpdate(flow_level="light")
        assert d.flow_level == "light"
        assert d.symptoms is None

    def test_update_with_symptoms(self):
        d = DailyLogUpdate(symptoms=[{"symptom_id": 1, "intensity": 3}])
        assert d.symptoms is not None

    def test_update_empty_symptoms_clears_all(self):
        d = DailyLogUpdate(symptoms=[])
        assert d.symptoms == []

    def test_response(self):
        d = DailyLogResponse(
            id="a", cycle_id="b", date=date(2025, 6, 1),
            created_at="2025-06-01T00:00:00", updated_at="2025-06-01T00:00:00",
        )
        assert d.symptoms == []

    def test_response_with_symptoms(self):
        d = DailyLogResponse(
            id="a", cycle_id="b", date=date(2025, 6, 1),
            created_at="2025-06-01T00:00:00", updated_at="2025-06-01T00:00:00",
            symptoms=[{"symptom_id": 1, "intensity": 3, "name": "Fatiga", "category": "fisica", "common_phase": None}],
        )
        assert len(d.symptoms) == 1

    def test_list_response(self):
        r = DailyLogListResponse(total=0, limit=50, offset=0, logs=[])
        assert r.total == 0


class TestDataFixtures:

    def test_user_data(self, user_data):
        assert user_data["id"].startswith("550e8400")
        assert user_data["email"] == "test@example.com"

    def test_cycle_data(self, cycle_data):
        assert cycle_data["user_id"] == "550e8400-e29b-41d4-a716-446655440000"
        assert cycle_data["start_date"] == date(2025, 6, 1)

    def test_log_data(self, log_data):
        assert log_data["flow_level"] == "medium"
        assert log_data["temperature"] == 36.75

    def test_log_with_symptoms(self, log_with_symptoms):
        assert len(log_with_symptoms["symptoms"]) == 2
        assert log_with_symptoms["symptoms"][0]["name"] == "Dolor abdominal (colicos)"

    def test_symptom_catalog_entries(self, symptom_catalog_entries):
        assert len(symptom_catalog_entries) == 5
        categories = {s["category"] for s in symptom_catalog_entries}
        assert "fisica" in categories
        assert "emocional" in categories
        assert "digestiva" in categories
