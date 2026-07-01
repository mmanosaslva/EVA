from datetime import date
from unittest.mock import patch

import pytest

from app.services.export_service import export_csv, export_pdf

TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"
TEST_CYCLE_ID = "550e8400-e29b-41d4-a716-446655440001"
TEST_LOG_ID = "550e8400-e29b-41d4-a716-446655440002"


def _make_row(data: dict):
    from tests.conftest import MockRow
    return MockRow(data)


class TestExportCsv:
    @pytest.mark.asyncio
    @patch("app.services.export_service.get_symptoms_by_log")
    @patch("app.services.export_service.get_logs_by_cycle")
    @patch("app.services.export_service.cycle_repo.get_cycles_by_user")
    async def test_csv_with_data(self, mock_cycles, mock_logs, mock_symptoms):
        mock_cycles.return_value = [
            _make_row({"id": TEST_CYCLE_ID, "user_id": TEST_USER_ID,
                        "start_date": date(2025, 6, 1), "end_date": date(2025, 6, 5),
                        "created_at": None, "updated_at": None}),
        ]
        mock_logs.return_value = [
            _make_row({"id": TEST_LOG_ID, "cycle_id": TEST_CYCLE_ID,
                        "date": date(2025, 6, 1), "flow_level": "medium",
                        "temperature": 36.5, "notes": "colicos",
                        "created_at": None, "updated_at": None}),
        ]
        mock_symptoms.return_value = [
            _make_row({"symptom_id": 1, "intensity": 3, "name": "Dolor abdominal",
                        "category": "fisica", "common_phase": "menstruacion"}),
        ]

        csv_content = await export_csv(TEST_USER_ID)
        lines = csv_content.strip().split("\n")

        assert len(lines) >= 2
        assert "Dolor abdominal" in csv_content
        assert "2025-06-01" in csv_content
        assert "medium" in csv_content

    @pytest.mark.asyncio
    @patch("app.services.export_service.cycle_repo.get_cycles_by_user")
    async def test_csv_empty(self, mock_cycles):
        mock_cycles.return_value = []

        csv_content = await export_csv(TEST_USER_ID)
        lines = csv_content.strip().split("\n")

        assert len(lines) == 1
        assert "Fecha inicio ciclo" in csv_content

    @pytest.mark.asyncio
    @patch("app.services.export_service.get_symptoms_by_log")
    @patch("app.services.export_service.get_logs_by_cycle")
    @patch("app.services.export_service.cycle_repo.get_cycles_by_user")
    async def test_csv_log_without_symptoms(self, mock_cycles, mock_logs, mock_symptoms):
        mock_cycles.return_value = [
            _make_row({"id": TEST_CYCLE_ID, "user_id": TEST_USER_ID,
                        "start_date": date(2025, 6, 1), "end_date": date(2025, 6, 5),
                        "created_at": None, "updated_at": None}),
        ]
        mock_logs.return_value = [
            _make_row({"id": TEST_LOG_ID, "cycle_id": TEST_CYCLE_ID,
                        "date": date(2025, 6, 2), "flow_level": "light",
                        "temperature": None, "notes": None,
                        "created_at": None, "updated_at": None}),
        ]
        mock_symptoms.return_value = []

        csv_content = await export_csv(TEST_USER_ID)
        lines = csv_content.strip().split("\n")

        assert len(lines) == 2
        assert "light" in csv_content

    @pytest.mark.asyncio
    @patch("app.services.export_service.get_symptoms_by_log")
    @patch("app.services.export_service.get_logs_by_cycle")
    @patch("app.services.export_service.cycle_repo.get_cycles_by_user")
    async def test_csv_date_filter_passed_to_repo(self, mock_cycles, mock_logs, mock_symptoms):
        mock_cycles.return_value = []

        csv_content = await export_csv(
            TEST_USER_ID,
            from_date=date(2025, 8, 1),
            to_date=date(2025, 12, 31),
        )

        mock_cycles.assert_awaited_once_with(
            TEST_USER_ID, limit=1000, offset=0, from_date=date(2025, 8, 1),
        )
        lines = csv_content.strip().split("\n")
        assert len(lines) == 1  # header only, no data


class TestExportPdf:
    @pytest.mark.asyncio
    @patch("app.services.export_service.get_symptoms_by_log")
    @patch("app.services.export_service.get_logs_by_cycle")
    @patch("app.services.export_service.predict_next_cycle")
    @patch("app.services.export_service.get_symptoms_analytics")
    @patch("app.services.export_service.get_summary")
    @patch("app.services.export_service.cycle_repo.get_cycles_by_user")
    async def test_pdf_generates_bytes(
        self, mock_cycles, mock_summary, mock_analytics, mock_prediction, mock_logs, mock_symptoms
    ):
        mock_cycles.return_value = [
            _make_row({"id": TEST_CYCLE_ID, "user_id": TEST_USER_ID,
                        "start_date": date(2025, 6, 1), "end_date": date(2025, 6, 5),
                        "created_at": None, "updated_at": None}),
        ]
        mock_summary.return_value = {
            "total_cycles": 1,
            "avg_cycle_duration": 28.0,
            "avg_period_duration": 5.0,
            "cycle_variability_days": 0.0,
            "shortest_cycle": None,
            "longest_cycle": None,
            "last_cycle_start": "2025-06-01",
        }
        mock_analytics.return_value = {
            "symptoms": [],
            "cycles_analyzed": 1,
            "total_logs_analyzed": 0,
        }
        mock_prediction.return_value = {
            "has_sufficient_data": True,
            "predicted_start_date": date(2025, 6, 29),
            "prediction_source": "heuristic",
            "model_mae_days": None,
            "cycles_used_for_training": None,
        }
        mock_logs.return_value = []
        mock_symptoms.return_value = []

        pdf_bytes = await export_pdf(TEST_USER_ID, cycles_back=1)

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 100
        assert pdf_bytes[:4] == b"%PDF" or pdf_bytes.startswith(b"%PDF")
