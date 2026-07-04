from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.services.symptom_service import list_logs_by_cycle, create_log
from tests.conftest import MockRow, TEST_USER_ID, TEST_CYCLE_ID, TEST_LOG_ID


def _make_cycle_row(**overrides) -> MockRow:
    from datetime import date, datetime
    return MockRow({
        "id": overrides.get("id", TEST_CYCLE_ID),
        "user_id": overrides.get("user_id", TEST_USER_ID),
        "start_date": overrides.get("start_date", date(2025, 6, 1)),
        "end_date": overrides.get("end_date", date(2025, 6, 5)),
        "created_at": overrides.get("created_at", datetime(2025, 6, 1, 12, 0, 0)),
        "updated_at": overrides.get("updated_at", datetime(2025, 6, 1, 12, 0, 0)),
    })


def _make_log_row(**overrides) -> MockRow:
    from datetime import date, datetime
    return MockRow({
        "id": overrides.get("id", TEST_LOG_ID),
        "cycle_id": overrides.get("cycle_id", TEST_CYCLE_ID),
        "date": overrides.get("date", date(2025, 6, 1)),
        "flow_level": overrides.get("flow_level", "medium"),
        "temperature": overrides.get("temperature", 36.5),
        "notes": overrides.get("notes", None),
        "created_at": overrides.get("created_at", datetime(2025, 6, 1, 12, 0, 0)),
        "updated_at": overrides.get("updated_at", datetime(2025, 6, 1, 12, 0, 0)),
    })


class TestListLogsByCycleValidation:
    async def test_empty_cycle_id_returns_400(self):
        with pytest.raises(HTTPException) as exc:
            await list_logs_by_cycle(cycle_id="", user_id=TEST_USER_ID)
        assert exc.value.status_code == 400
        assert "cycle_id" in exc.value.detail

    async def test_invalid_uuid_returns_400(self):
        with pytest.raises(HTTPException) as exc:
            await list_logs_by_cycle(cycle_id="not-a-uuid", user_id=TEST_USER_ID)
        assert exc.value.status_code == 400
        assert "cycle_id" in exc.value.detail

    async def test_short_invalid_uuid_returns_400(self):
        with pytest.raises(HTTPException) as exc:
            await list_logs_by_cycle(cycle_id="abc", user_id=TEST_USER_ID)
        assert exc.value.status_code == 400

    async def test_none_cycle_id_returns_400(self):
        with pytest.raises(HTTPException) as exc:
            await list_logs_by_cycle(cycle_id=None, user_id=TEST_USER_ID)
        assert exc.value.status_code == 400


class TestListLogsByCycle:
    @patch("app.services.symptom_service.cycle_repo.get_cycle_by_id")
    async def test_valid_uuid_cycle_not_found_returns_404(self, mock_get):
        mock_get.return_value = None

        with pytest.raises(HTTPException) as exc:
            await list_logs_by_cycle(
                cycle_id="550e8400-e29b-41d4-a716-4466554400aa",
                user_id=TEST_USER_ID,
            )
        assert exc.value.status_code == 404

    @patch("app.services.symptom_service.get_symptoms_by_log")
    @patch("app.services.symptom_service.get_logs_by_cycle_paginated")
    @patch("app.services.symptom_service.count_logs_by_cycle")
    @patch("app.services.symptom_service.cycle_repo.get_cycle_by_id")
    async def test_valid_uuid_returns_logs(
        self, mock_get_cycle, mock_count, mock_logs, mock_symptoms
    ):
        mock_get_cycle.return_value = _make_cycle_row()
        mock_count.return_value = 1
        mock_logs.return_value = [_make_log_row()]
        mock_symptoms.return_value = []

        total, logs = await list_logs_by_cycle(
            cycle_id=TEST_CYCLE_ID,
            user_id=TEST_USER_ID,
        )
        assert total == 1
        assert len(logs) == 1
        assert logs[0]["id"] == TEST_LOG_ID


class TestCreateLogValidation:
    @patch("app.services.symptom_service.cycle_repo.get_cycle_by_id")
    async def test_invalid_cycle_id_returns_400(self, mock_get):
        with pytest.raises(HTTPException) as exc:
            await create_log(
                data={"cycle_id": "invalid", "date": "2025-06-01"},
                user_id=TEST_USER_ID,
            )
        assert exc.value.status_code == 400
        mock_get.assert_not_awaited()

    @patch("app.services.symptom_service.cycle_repo.get_cycle_by_id")
    async def test_empty_cycle_id_returns_400(self, mock_get):
        with pytest.raises(HTTPException) as exc:
            await create_log(
                data={"cycle_id": "", "date": "2025-06-01"},
                user_id=TEST_USER_ID,
            )
        assert exc.value.status_code == 400
        mock_get.assert_not_awaited()


class TestValidateUUIDHelper:
    def test_validate_uuid_or_400_valid(self):
        from app.core.validators import validate_uuid_or_400
        validate_uuid_or_400(TEST_CYCLE_ID)

    def test_validate_uuid_or_400_invalid(self):
        from app.core.validators import validate_uuid_or_400

        with pytest.raises(HTTPException) as exc:
            validate_uuid_or_400("bad-uuid", "field")
        assert exc.value.status_code == 400
        assert "field" in exc.value.detail

    def test_validate_uuid_or_400_empty(self):
        from app.core.validators import validate_uuid_or_400

        with pytest.raises(HTTPException) as exc:
            validate_uuid_or_400("", "cycle_id")
        assert exc.value.status_code == 400

    def test_validate_uuid_or_400_none(self):
        from app.core.validators import validate_uuid_or_400

        with pytest.raises(HTTPException) as exc:
            validate_uuid_or_400(None, "cycle_id")
        assert exc.value.status_code == 400
