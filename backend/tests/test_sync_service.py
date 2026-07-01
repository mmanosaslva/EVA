import json
from datetime import date, datetime
from unittest.mock import patch

import pytest

from app.services.sync_service import process_sync

TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"
TEST_CYCLE_ID = "550e8400-e29b-41d4-a716-446655440001"
TEST_LOG_ID = "550e8400-e29b-41d4-a716-446655440002"


def _make_op(client_id, op_type, payload, timestamp=None):
    return {
        "client_id": client_id,
        "type": op_type,
        "payload": payload,
        "client_timestamp": timestamp or datetime(2025, 6, 1, 8, 0, 0),
    }


class TestProcessSync:
    @pytest.mark.asyncio
    @patch("app.services.sync_service.sync_repo.find_by_client_id")
    @patch("app.services.sync_service.sync_repo.insert_sync_operation")
    @patch("app.services.sync_service.cycle_service.create_cycle")
    async def test_create_cycle_applied(self, mock_create, mock_insert, mock_find):
        mock_find.return_value = None
        mock_create.return_value = {"id": TEST_CYCLE_ID}

        result = await process_sync(
            user_id=TEST_USER_ID,
            operations=[
                _make_op("op_001", "CREATE_CYCLE", {"start_date": "2025-06-01", "end_date": "2025-06-05"}),
            ],
        )

        assert result["applied"] == 1
        assert result["skipped"] == 0
        assert result["failed"] == 0
        assert result["results"][0]["client_id"] == "op_001"
        assert result["results"][0]["status"] == "applied"
        assert result["results"][0]["server_id"] == TEST_CYCLE_ID
        mock_create.assert_awaited_once()
        mock_insert.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("app.services.sync_service.sync_repo.find_by_client_id")
    @patch("app.services.sync_service.sync_repo.insert_sync_operation")
    async def test_duplicate_client_id_skipped(self, mock_insert, mock_find):
        mock_find.return_value = type("Row", (), {
            "_mapping": {"client_id": "op_001", "server_id": TEST_CYCLE_ID, "status": "applied"},
            "server_id": TEST_CYCLE_ID,
        })()

        result = await process_sync(
            user_id=TEST_USER_ID,
            operations=[
                _make_op("op_001", "CREATE_CYCLE", {"start_date": "2025-06-01"}),
            ],
        )

        assert result["applied"] == 0
        assert result["skipped"] == 1
        assert result["failed"] == 0
        assert result["results"][0]["status"] == "skipped"
        assert result["results"][0]["server_id"] == TEST_CYCLE_ID
        mock_insert.assert_not_called()

    @pytest.mark.asyncio
    @patch("app.services.sync_service.sync_repo.find_by_client_id")
    @patch("app.services.sync_service.sync_repo.resolve_client_id")
    @patch("app.services.sync_service.sync_repo.insert_sync_operation")
    @patch("app.services.sync_service.cycle_service.create_cycle")
    @patch("app.services.sync_service.symptom_service.create_log")
    async def test_create_cycle_then_daily_log_cross_reference(
        self, mock_create_log, mock_create_cycle, mock_insert, mock_resolve, mock_find
    ):
        mock_find.return_value = None
        mock_create_cycle.return_value = {"id": TEST_CYCLE_ID}
        mock_create_log.return_value = {"id": TEST_LOG_ID}

        ops = [
            _make_op("op_001", "CREATE_CYCLE", {"start_date": "2025-06-01"}, datetime(2025, 6, 1, 8, 0, 0)),
            _make_op("op_002", "CREATE_DAILY_LOG", {
                "cycle_client_id": "op_001",
                "date": "2025-06-01",
                "flow_level": "heavy",
                "symptoms": [{"symptom_id": 1, "intensity": 4}],
            }, datetime(2025, 6, 1, 9, 0, 0)),
        ]

        result = await process_sync(user_id=TEST_USER_ID, operations=ops)

        assert result["applied"] == 2
        assert result["skipped"] == 0
        assert result["failed"] == 0
        assert result["results"][0]["client_id"] == "op_001"
        assert result["results"][0]["status"] == "applied"
        assert result["results"][0]["server_id"] == TEST_CYCLE_ID
        assert result["results"][1]["client_id"] == "op_002"
        assert result["results"][1]["status"] == "applied"
        assert result["results"][1]["server_id"] == TEST_LOG_ID
        mock_create_cycle.assert_awaited_once()
        mock_create_log.assert_awaited_once()
        mock_resolve.assert_not_called()

    @pytest.mark.asyncio
    @patch("app.services.sync_service.sync_repo.find_by_client_id")
    @patch("app.services.sync_service.sync_repo.resolve_client_id")
    @patch("app.services.sync_service.sync_repo.insert_sync_operation")
    @patch("app.services.sync_service.cycle_service.update_cycle")
    async def test_update_cycle_resolves_from_table(
        self, mock_update, mock_insert, mock_resolve, mock_find
    ):
        mock_find.return_value = None
        mock_resolve.return_value = TEST_CYCLE_ID

        result = await process_sync(
            user_id=TEST_USER_ID,
            operations=[
                _make_op("op_003", "UPDATE_CYCLE", {
                    "cycle_client_id": "op_001",
                    "end_date": "2025-06-07",
                }),
            ],
        )

        assert result["applied"] == 1
        assert result["results"][0]["status"] == "applied"
        assert result["results"][0]["server_id"] == TEST_CYCLE_ID
        mock_resolve.assert_awaited_once_with("op_001")
        mock_update.assert_awaited_once_with(TEST_CYCLE_ID, TEST_USER_ID, {"end_date": date(2025, 6, 7)})

    @pytest.mark.asyncio
    @patch("app.services.sync_service.sync_repo.find_by_client_id")
    @patch("app.services.sync_service.sync_repo.resolve_client_id")
    @patch("app.services.sync_service.sync_repo.insert_sync_operation")
    @patch("app.services.sync_service.cycle_service.delete_cycle")
    async def test_delete_cycle(self, mock_delete, mock_insert, mock_resolve, mock_find):
        mock_find.return_value = None
        mock_resolve.return_value = TEST_CYCLE_ID

        result = await process_sync(
            user_id=TEST_USER_ID,
            operations=[
                _make_op("op_004", "DELETE_CYCLE", {"cycle_client_id": "op_001"}),
            ],
        )

        assert result["applied"] == 1
        mock_resolve.assert_awaited_once_with("op_001")
        mock_delete.assert_awaited_once_with(TEST_CYCLE_ID, TEST_USER_ID)

    @pytest.mark.asyncio
    @patch("app.services.sync_service.sync_repo.find_by_client_id")
    @patch("app.services.sync_service.sync_repo.resolve_client_id")
    @patch("app.services.sync_service.sync_repo.insert_sync_operation")
    @patch("app.services.sync_service.symptom_service.update_log")
    async def test_update_daily_log(self, mock_update, mock_insert, mock_resolve, mock_find):
        mock_find.return_value = None
        mock_resolve.return_value = TEST_LOG_ID

        result = await process_sync(
            user_id=TEST_USER_ID,
            operations=[
                _make_op("op_005", "UPDATE_DAILY_LOG", {
                    "log_client_id": "op_002",
                    "flow_level": "light",
                }),
            ],
        )

        assert result["applied"] == 1
        mock_resolve.assert_awaited_once_with("op_002")
        mock_update.assert_awaited_once_with(TEST_LOG_ID, {"flow_level": "light"}, TEST_USER_ID)

    @pytest.mark.asyncio
    @patch("app.services.sync_service.sync_repo.find_by_client_id")
    @patch("app.services.sync_service.sync_repo.resolve_client_id")
    @patch("app.services.sync_service.sync_repo.insert_sync_operation")
    @patch("app.services.sync_service.symptom_service.delete_log")
    async def test_delete_daily_log(self, mock_delete, mock_insert, mock_resolve, mock_find):
        mock_find.return_value = None
        mock_resolve.return_value = TEST_LOG_ID

        result = await process_sync(
            user_id=TEST_USER_ID,
            operations=[
                _make_op("op_006", "DELETE_DAILY_LOG", {"log_client_id": "op_002"}),
            ],
        )

        assert result["applied"] == 1
        mock_resolve.assert_awaited_once_with("op_002")
        mock_delete.assert_awaited_once_with(TEST_LOG_ID, TEST_USER_ID)

    @pytest.mark.asyncio
    @patch("app.services.sync_service.sync_repo.find_by_client_id")
    @patch("app.services.sync_service.sync_repo.insert_sync_operation")
    @patch("app.services.sync_service.cycle_service.create_cycle")
    async def test_operation_failure_is_isolated(self, mock_create, mock_insert, mock_find):
        mock_find.return_value = None
        mock_create.side_effect = [{"id": TEST_CYCLE_ID}, Exception("DB error")]

        ops = [
            _make_op("op_001", "CREATE_CYCLE", {"start_date": "2025-06-01"}),
            _make_op("op_002", "CREATE_CYCLE", {"start_date": "2025-06-10"}),
        ]

        result = await process_sync(user_id=TEST_USER_ID, operations=ops)

        assert result["applied"] == 1
        assert result["failed"] == 1
        assert result["results"][0]["status"] == "applied"
        assert result["results"][1]["status"] == "failed"
        assert result["results"][1]["error"] == "DB error"
        assert mock_insert.call_count == 2

    @pytest.mark.asyncio
    @patch("app.services.sync_service.sync_repo.find_by_client_id")
    @patch("app.services.sync_service.sync_repo.insert_sync_operation")
    @patch("app.services.sync_service.sync_repo.resolve_client_id")
    @patch("app.services.sync_service.cycle_service.create_cycle")
    @patch("app.services.sync_service.cycle_service.delete_cycle")
    async def test_mixed_batch_applied_skipped_failed(
        self, mock_delete, mock_create, mock_resolve, mock_insert, mock_find
    ):
        seen = set()

        def _find_side(client_id):
            if client_id in ("op_001", "op_002"):
                return None
            if client_id == "op_003":
                if client_id not in seen:
                    seen.add(client_id)
                    return None
                return type("Row", (), {"_mapping": {"server_id": TEST_CYCLE_ID}, "server_id": TEST_CYCLE_ID})()
            return None

        mock_find.side_effect = _find_side
        mock_create.return_value = {"id": TEST_CYCLE_ID}
        mock_resolve.return_value = None

        ops = [
            _make_op("op_001", "CREATE_CYCLE", {"start_date": "2025-06-01"}, datetime(2025, 6, 1, 8, 0)),
            _make_op("op_002", "CREATE_CYCLE", {"start_date": "2025-06-10"}, datetime(2025, 6, 1, 9, 0)),
            _make_op("op_003", "CREATE_CYCLE", {"start_date": "2025-06-20"}, datetime(2025, 6, 1, 10, 0)),
            _make_op("op_003", "CREATE_CYCLE", {"start_date": "2025-06-20"}, datetime(2025, 6, 1, 11, 0)),
            _make_op("op_004", "DELETE_CYCLE", {"cycle_client_id": "op_999"}, datetime(2025, 6, 1, 12, 0)),
        ]

        result = await process_sync(user_id=TEST_USER_ID, operations=ops)

        assert result["applied"] == 3
        assert result["skipped"] == 1
        assert result["failed"] == 1
        assert len(result["results"]) == 5

    @pytest.mark.asyncio
    @patch("app.services.sync_service.sync_repo.find_by_client_id")
    @patch("app.services.sync_service.sync_repo.insert_sync_operation")
    async def test_empty_batch(self, mock_insert, mock_find):
        result = await process_sync(user_id=TEST_USER_ID, operations=[])
        assert result["applied"] == 0
        assert result["skipped"] == 0
        assert result["failed"] == 0
        assert result["results"] == []

    @pytest.mark.asyncio
    @patch("app.services.sync_service.sync_repo.find_by_client_id")
    @patch("app.services.sync_service.sync_repo.resolve_client_id")
    @patch("app.services.sync_service.sync_repo.insert_sync_operation")
    @patch("app.services.sync_service.cycle_service.create_cycle")
    @patch("app.services.sync_service.cycle_service.delete_cycle")
    async def test_create_then_delete_same_batch(
        self, mock_delete, mock_create, mock_insert, mock_resolve, mock_find
    ):
        mock_find.return_value = None
        mock_create.return_value = {"id": TEST_CYCLE_ID}

        ops = [
            _make_op("op_001", "CREATE_CYCLE", {"start_date": "2025-06-01"}, datetime(2025, 6, 1, 8, 0)),
            _make_op("op_002", "DELETE_CYCLE", {"cycle_client_id": "op_001"}, datetime(2025, 6, 1, 9, 0)),
        ]

        result = await process_sync(user_id=TEST_USER_ID, operations=ops)

        assert result["applied"] == 2
        assert result["results"][0]["status"] == "applied"
        assert result["results"][1]["status"] == "applied"
        mock_create.assert_awaited_once()
        mock_delete.assert_awaited_once_with(TEST_CYCLE_ID, TEST_USER_ID)
        mock_resolve.assert_not_called()

    @pytest.mark.asyncio
    @patch("app.services.sync_service.sync_repo.find_by_client_id")
    @patch("app.services.sync_service.sync_repo.resolve_client_id")
    @patch("app.services.sync_service.sync_repo.insert_sync_operation")
    async def test_unresolved_client_id_fails(self, mock_insert, mock_resolve, mock_find):
        mock_find.return_value = None
        mock_resolve.return_value = None

        result = await process_sync(
            user_id=TEST_USER_ID,
            operations=[
                _make_op("op_003", "UPDATE_CYCLE", {
                    "cycle_client_id": "op_unknown",
                    "end_date": "2025-06-07",
                }),
            ],
        )

        assert result["failed"] == 1
        assert result["results"][0]["status"] == "failed"
        assert "No se encontró server_id" in result["results"][0]["error"]

    @pytest.mark.asyncio
    @patch("app.services.sync_service.sync_repo.find_by_client_id")
    @patch("app.services.sync_service.sync_repo.insert_sync_operation")
    @patch("app.services.sync_service.symptom_service.create_log")
    @patch("app.services.sync_service.cycle_service.create_cycle")
    async def test_create_daily_log_with_date_conversion(
        self, mock_create, mock_create_log, mock_insert, mock_find
    ):
        mock_find.return_value = None
        mock_create.return_value = {"id": TEST_CYCLE_ID}
        mock_create_log.return_value = {"id": TEST_LOG_ID}

        ops = [
            _make_op("op_001", "CREATE_CYCLE", {"start_date": "2025-06-01"}, datetime(2025, 6, 1, 8, 0, 0)),
            _make_op("op_002", "CREATE_DAILY_LOG", {
                "cycle_client_id": "op_001",
                "date": "2025-06-01",
                "temperature": 36.5,
                "symptoms": [{"symptom_id": 1, "intensity": 3}],
            }, datetime(2025, 6, 1, 9, 0, 0)),
        ]

        result = await process_sync(user_id=TEST_USER_ID, operations=ops)

        assert result["applied"] == 2
        called_data = mock_create_log.call_args[0][0]
        assert isinstance(called_data["date"], date)
        assert called_data["date"] == date(2025, 6, 1)
        assert called_data["temperature"] == 36.5
        assert called_data["symptoms"] == [{"symptom_id": 1, "intensity": 3}]
