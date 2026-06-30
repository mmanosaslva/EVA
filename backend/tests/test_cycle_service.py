from datetime import date, datetime
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.services.cycle_service import (
    create_cycle,
    get_cycles_by_user,
    get_cycle_by_id,
    update_cycle,
    delete_cycle,
)
from tests.conftest import MockRow, TEST_USER_ID, TEST_CYCLE_ID

TEST_USER_2_ID = "550e8400-e29b-41d4-a716-446655449999"
TEST_LOG_ID = "550e8400-e29b-41d4-a716-446655440002"


def _make_cycle_row(**overrides) -> MockRow:
    return MockRow({
        "id": overrides.get("id", TEST_CYCLE_ID),
        "user_id": overrides.get("user_id", TEST_USER_ID),
        "start_date": overrides.get("start_date", date(2025, 6, 1)),
        "end_date": overrides.get("end_date", date(2025, 6, 5)),
        "created_at": overrides.get("created_at", datetime(2025, 6, 1, 12, 0, 0)),
        "updated_at": overrides.get("updated_at", datetime(2025, 6, 1, 12, 0, 0)),
    })


def _make_log_row(**overrides) -> MockRow:
    return MockRow({
        "id": overrides.get("id", TEST_LOG_ID),
        "cycle_id": overrides.get("cycle_id", TEST_CYCLE_ID),
        "date": overrides.get("date", date(2025, 6, 1)),
        "flow_level": overrides.get("flow_level", "medium"),
        "temperature": overrides.get("temperature", 36.5),
        "notes": overrides.get("notes", None),
    })


class TestCreateCycle:
    @patch("app.services.cycle_service.cycle_repo.get_cycle_by_start_date")
    @patch("app.services.cycle_service.cycle_repo.create_cycle")
    async def test_valid_dates(self, mock_create, mock_get):
        mock_get.return_value = None
        mock_create.return_value = _make_cycle_row()

        result = await create_cycle(
            user_id=TEST_USER_ID,
            data={"start_date": date(2025, 6, 1), "end_date": date(2025, 6, 5)},
        )

        assert result["duration_days"] == 4
        assert result["user_id"] == TEST_USER_ID
        mock_get.assert_awaited_once_with(TEST_USER_ID, date(2025, 6, 1))
        mock_create.assert_awaited_once()

    @patch("app.services.cycle_service.cycle_repo.get_cycle_by_start_date")
    async def test_duplicate_start_date(self, mock_get):
        mock_get.return_value = _make_cycle_row()

        with pytest.raises(HTTPException) as exc:
            await create_cycle(
                user_id=TEST_USER_ID,
                data={"start_date": date(2025, 6, 1)},
            )
        assert exc.value.status_code == 409
        assert "already exists" in exc.value.detail

    @patch("app.services.cycle_service.cycle_repo.get_cycle_by_start_date")
    @patch("app.services.cycle_service.cycle_repo.create_cycle")
    async def test_different_user_same_date(self, mock_create, mock_get):
        async def _side_effect(user_id, start_date):
            if user_id == TEST_USER_ID:
                return _make_cycle_row(user_id=TEST_USER_ID)
            return None
        mock_get.side_effect = _side_effect
        mock_create.return_value = _make_cycle_row(user_id=TEST_USER_2_ID)

        result = await create_cycle(
            user_id=TEST_USER_2_ID,
            data={"start_date": date(2025, 6, 1)},
        )
        assert result["user_id"] == TEST_USER_2_ID


class TestGetCyclesByUser:
    @patch("app.services.cycle_service.cycle_repo.count_cycles")
    @patch("app.services.cycle_service.cycle_repo.get_cycles_by_user")
    async def test_returns_cycles(self, mock_get, mock_count):
        mock_count.return_value = 2
        mock_get.return_value = [
            _make_cycle_row(start_date=date(2025, 6, 1)),
            _make_cycle_row(start_date=date(2025, 5, 1)),
        ]

        total, cycles = await get_cycles_by_user(TEST_USER_ID)
        assert total == 2
        assert len(cycles) == 2

    @patch("app.services.cycle_service.cycle_repo.count_cycles")
    @patch("app.services.cycle_service.cycle_repo.get_cycles_by_user")
    async def test_empty_user(self, mock_get, mock_count):
        mock_count.return_value = 0
        mock_get.return_value = []

        total, cycles = await get_cycles_by_user(TEST_USER_ID)
        assert total == 0
        assert cycles == []

    @patch("app.services.cycle_service.cycle_repo.count_cycles")
    @patch("app.services.cycle_service.cycle_repo.get_cycles_by_user")
    async def test_pagination(self, mock_get, mock_count):
        mock_count.return_value = 5
        mock_get.return_value = [
            _make_cycle_row(start_date=date(2025, 6, 1)),
        ]

        total, cycles = await get_cycles_by_user(TEST_USER_ID, limit=1, offset=2)
        assert total == 5
        assert len(cycles) == 1
        mock_get.assert_awaited_once_with(TEST_USER_ID, 1, 2, None)

    @patch("app.services.cycle_service.cycle_repo.count_cycles")
    @patch("app.services.cycle_service.cycle_repo.get_cycles_by_user")
    async def test_from_date_filter(self, mock_get, mock_count):
        mock_count.return_value = 1
        mock_get.return_value = [_make_cycle_row()]

        total, cycles = await get_cycles_by_user(TEST_USER_ID, from_date=date(2025, 1, 1))
        assert total == 1
        mock_get.assert_awaited_once_with(TEST_USER_ID, 20, 0, date(2025, 1, 1))


class TestGetCycleById:
    @patch("app.services.cycle_service.cycle_repo.get_cycle_by_id")
    @patch("app.services.cycle_service.get_logs_by_cycle")
    async def test_found(self, mock_logs, mock_get):
        mock_get.return_value = _make_cycle_row()
        mock_logs.return_value = []

        result = await get_cycle_by_id(TEST_CYCLE_ID, TEST_USER_ID)
        assert result["id"] == TEST_CYCLE_ID
        assert result["duration_days"] == 4
        assert result["daily_logs"] == []

    @patch("app.services.cycle_service.cycle_repo.get_cycle_by_id")
    @patch("app.services.cycle_service.get_logs_by_cycle")
    async def test_found_with_daily_logs(self, mock_logs, mock_get):
        mock_get.return_value = _make_cycle_row()
        mock_logs.return_value = [_make_log_row()]

        result = await get_cycle_by_id(TEST_CYCLE_ID, TEST_USER_ID)
        assert len(result["daily_logs"]) == 1
        assert result["daily_logs"][0]["flow_level"] == "medium"

    @patch("app.services.cycle_service.cycle_repo.get_cycle_by_id")
    async def test_not_found(self, mock_get):
        mock_get.return_value = None

        with pytest.raises(HTTPException) as exc:
            await get_cycle_by_id("nonexistent", TEST_USER_ID)
        assert exc.value.status_code == 404

    @patch("app.services.cycle_service.cycle_repo.get_cycle_by_id")
    async def test_wrong_user_returns_404(self, mock_get):
        mock_get.return_value = None

        with pytest.raises(HTTPException) as exc:
            await get_cycle_by_id(TEST_CYCLE_ID, TEST_USER_2_ID)
        assert exc.value.status_code == 404


class TestUpdateCycle:
    @patch("app.services.cycle_service.cycle_repo.update_cycle")
    async def test_update_valid(self, mock_update):
        mock_update.return_value = _make_cycle_row(end_date=date(2025, 6, 7))

        result = await update_cycle(
            cycle_id=TEST_CYCLE_ID,
            user_id=TEST_USER_ID,
            data={"end_date": date(2025, 6, 7)},
        )
        assert result["duration_days"] == 6

    @patch("app.services.cycle_service.cycle_repo.update_cycle")
    async def test_not_found(self, mock_update):
        mock_update.return_value = None

        with pytest.raises(HTTPException) as exc:
            await update_cycle(
                cycle_id="nonexistent",
                user_id=TEST_USER_ID,
                data={"end_date": date(2025, 6, 5)},
            )
        assert exc.value.status_code == 404

    @patch("app.services.cycle_service.cycle_repo.update_cycle")
    async def test_wrong_user_returns_404(self, mock_update):
        mock_update.return_value = None

        with pytest.raises(HTTPException) as exc:
            await update_cycle(
                cycle_id=TEST_CYCLE_ID,
                user_id=TEST_USER_2_ID,
                data={"end_date": date(2025, 6, 5)},
            )
        assert exc.value.status_code == 404

    @patch("app.services.cycle_service.cycle_repo.get_cycle_by_start_date")
    @patch("app.services.cycle_service.cycle_repo.update_cycle")
    async def test_duplicate_start_date(self, mock_update, mock_get):
        mock_get.return_value = _make_cycle_row(id="other-id")

        with pytest.raises(HTTPException) as exc:
            await update_cycle(
                cycle_id=TEST_CYCLE_ID,
                user_id=TEST_USER_ID,
                data={"start_date": date(2025, 6, 15)},
            )
        assert exc.value.status_code == 409
        mock_update.assert_not_awaited()

    @patch("app.services.cycle_service.cycle_repo.get_cycle_by_start_date")
    @patch("app.services.cycle_service.cycle_repo.update_cycle")
    async def test_update_same_cycle_allowed(self, mock_update, mock_get):
        mock_get.return_value = _make_cycle_row(id=TEST_CYCLE_ID)
        mock_update.return_value = _make_cycle_row(end_date=date(2025, 6, 7))

        result = await update_cycle(
            cycle_id=TEST_CYCLE_ID,
            user_id=TEST_USER_ID,
            data={"start_date": date(2025, 6, 1), "end_date": date(2025, 6, 7)},
        )
        assert result["duration_days"] == 6


class TestDeleteCycle:
    @patch("app.services.cycle_service.cycle_repo.delete_cycle")
    async def test_delete_success(self, mock_delete):
        mock_delete.return_value = True

        await delete_cycle(TEST_CYCLE_ID, TEST_USER_ID)
        mock_delete.assert_awaited_once_with(TEST_CYCLE_ID, TEST_USER_ID)

    @patch("app.services.cycle_service.cycle_repo.delete_cycle")
    async def test_not_found(self, mock_delete):
        mock_delete.return_value = False

        with pytest.raises(HTTPException) as exc:
            await delete_cycle("nonexistent", TEST_USER_ID)
        assert exc.value.status_code == 404



