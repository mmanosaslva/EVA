from datetime import date, timedelta
from unittest.mock import patch

import pytest

from app.services.prediction_service import predict_next_cycle_heuristic
from app.utils.cycle_utils import calculate_current_phase

USER_ID = "550e8400-e29b-41d4-a716-446655440000"


def _make_cycle(start_date: date, end_date: date | None = None) -> dict:
    return {"start_date": start_date, "end_date": end_date}


class TestPredictEmpty:
    @pytest.mark.asyncio
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_zero_cycles_returns_no_data(self, mock_get):
        mock_get.return_value = []
        result = await predict_next_cycle_heuristic(USER_ID)
        assert result["has_sufficient_data"] is False
        assert result["predicted_start_date"] is None
        assert result["avg_cycle_length"] == 0.0
        assert result["cycle_variability"] == 0.0
        assert result["confidence_range"]["early"] is None
        assert result["confidence_range"]["late"] is None
        assert result["prediction_source"] == "heuristic"


class TestPredictSingleCycle:
    @pytest.mark.asyncio
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_one_cycle_assumes_28_days(self, mock_get):
        start = date(2025, 6, 1)
        mock_get.return_value = [_make_cycle(start, date(2025, 6, 5))]
        result = await predict_next_cycle_heuristic(USER_ID)
        assert result["has_sufficient_data"] is True
        assert result["avg_cycle_length"] == 28.0
        assert result["cycle_variability"] == 0.0
        assert result["predicted_start_date"] == date(2025, 6, 29)
        assert result["confidence_range"]["early"] is None
        assert result["confidence_range"]["late"] is None
        assert result["prediction_source"] == "heuristic"


class TestPredictMultipleCycles:
    @pytest.mark.asyncio
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_regular_28_day_cycles(self, mock_get):
        cycles = [
            _make_cycle(date(2025, 5, 1), date(2025, 5, 5)),
            _make_cycle(date(2025, 5, 29), date(2025, 6, 2)),
            _make_cycle(date(2025, 6, 26), date(2025, 6, 30)),
        ]
        mock_get.return_value = cycles
        result = await predict_next_cycle_heuristic(USER_ID)
        assert result["has_sufficient_data"] is True
        assert result["avg_cycle_length"] == 28.0
        assert result["cycle_variability"] == 0.0
        assert result["predicted_start_date"] == date(2025, 7, 24)
        assert result["prediction_source"] == "heuristic"

    @pytest.mark.asyncio
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_irregular_cycles_sop_like(self, mock_get):
        cycles = [
            _make_cycle(date(2025, 1, 1), date(2025, 1, 6)),
            _make_cycle(date(2025, 2, 5), date(2025, 2, 10)),
            _make_cycle(date(2025, 3, 10), date(2025, 3, 15)),
        ]
        mock_get.return_value = cycles
        result = await predict_next_cycle_heuristic(USER_ID)
        assert result["has_sufficient_data"] is True
        assert result["avg_cycle_length"] == 34.0
        assert result["cycle_variability"] > 0
        assert result["predicted_start_date"] == date(2025, 4, 13)
        assert result["confidence_range"]["early"] is not None
        assert result["confidence_range"]["late"] is not None

    @pytest.mark.asyncio
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_two_cycles_varying_duration(self, mock_get):
        cycles = [
            _make_cycle(date(2025, 6, 1), date(2025, 6, 5)),
            _make_cycle(date(2025, 7, 3), date(2025, 7, 7)),
        ]
        mock_get.return_value = cycles
        result = await predict_next_cycle_heuristic(USER_ID)
        assert result["avg_cycle_length"] == 32.0
        assert result["cycle_variability"] == 0.0
        assert result["predicted_start_date"] == date(2025, 8, 4)

    @pytest.mark.asyncio
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_multiple_cycles_with_variability(self, mock_get):
        cycles = [
            _make_cycle(date(2025, 1, 1), date(2025, 1, 5)),
            _make_cycle(date(2025, 1, 28), date(2025, 2, 2)),
            _make_cycle(date(2025, 3, 1), date(2025, 3, 5)),
            _make_cycle(date(2025, 3, 30), date(2025, 4, 3)),
        ]
        mock_get.return_value = cycles
        result = await predict_next_cycle_heuristic(USER_ID)
        assert result["has_sufficient_data"] is True
        assert result["cycle_variability"] > 0.0
        assert result["confidence_range"]["early"] is not None
        assert result["confidence_range"]["late"] is not None
        assert result["confidence_range"]["early"] < result["predicted_start_date"] < result["confidence_range"]["late"]
        assert result["prediction_source"] == "heuristic"


class TestFertileWindow:
    @pytest.mark.asyncio
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_fertile_window_calculated(self, mock_get):
        cycles = [
            _make_cycle(date(2025, 6, 1), date(2025, 6, 5)),
        ]
        mock_get.return_value = cycles
        result = await predict_next_cycle_heuristic(USER_ID)
        fw = result["fertile_window"]
        assert fw["start"] is not None
        assert fw["end"] is not None
        assert fw["start"] < fw["end"]


class TestDaysUntilNext:
    @pytest.mark.asyncio
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_days_until_next_is_int(self, mock_get):
        cycles = [
            _make_cycle(date(2025, 6, 1), date(2025, 6, 5)),
        ]
        mock_get.return_value = cycles
        result = await predict_next_cycle_heuristic(USER_ID)
        assert isinstance(result["days_until_next"], int)


class TestCycleUtils:
    def test_no_cycle_returns_none(self):
        phase, day = calculate_current_phase(None)
        assert phase is None
        assert day is None

    def test_during_period(self):
        today = date.today()
        start = today - timedelta(days=2)
        end = today + timedelta(days=2)
        cycle = {"start_date": start, "end_date": end}
        phase, day = calculate_current_phase(cycle)
        assert phase == "menstruacion"
        assert day == 3

    def test_follicular_phase(self):
        start = date.today() - timedelta(days=8)
        cycle = {"start_date": start, "end_date": start + timedelta(days=4)}
        phase, day = calculate_current_phase(cycle)
        assert phase == "folicular"
        assert day == 9

    def test_ovulation_phase(self):
        start = date.today() - timedelta(days=14)
        cycle = {"start_date": start, "end_date": start + timedelta(days=5)}
        phase, day = calculate_current_phase(cycle)
        assert phase == "ovulacion"
        assert day == 15

    def test_luteal_phase(self):
        start = date.today() - timedelta(days=22)
        cycle = {"start_date": start, "end_date": start + timedelta(days=5)}
        phase, day = calculate_current_phase(cycle)
        assert phase == "lutea"
        assert day == 23

    def test_string_dates_are_parsed(self):
        start = date.today() - timedelta(days=2)
        cycle = {"start_date": start.isoformat(), "end_date": None}
        phase, day = calculate_current_phase(cycle)
        assert phase == "menstruacion"
        assert day == 3

    def test_cycle_without_end_date(self):
        start = date.today() - timedelta(days=10)
        cycle = {"start_date": start}
        phase, day = calculate_current_phase(cycle)
        assert phase == "folicular"
        assert day == 11
