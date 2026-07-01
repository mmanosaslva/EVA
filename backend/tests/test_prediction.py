import random
from datetime import date, timedelta
from unittest.mock import patch

import pytest

from app.services.prediction_service import predict_next_cycle_heuristic, predict_next_cycle
from app.utils.cycle_utils import calculate_current_phase

USER_ID = "550e8400-e29b-41d4-a716-446655440000"


def _make_cycle(start_date: date, end_date: date | None = None) -> dict:
    return {"start_date": start_date, "end_date": end_date}


@pytest.fixture
def synthetic_cycles():
    """Genera n ciclos sintéticos con duraciones = base ± noise aleatorio.

    Retorna una lista de dicts con start_date/end_date listos para el servicio.
    """
    def _generate(n: int, base: int = 28, noise: int = 0) -> list[dict]:
        random.seed(42)
        cycles = []
        current = date(2024, 1, 1)
        for _ in range(n):
            duration = base + random.randint(-noise, noise)
            end = current + timedelta(days=5)
            cycles.append(_make_cycle(current, end))
            current += timedelta(days=duration)
        return cycles
    return _generate


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


class TestExactCriterias:
    @pytest.mark.asyncio
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_irregular_cycles_24_32_28_30(self, mock_get):
        start_dates = [
            date(2025, 1, 1),
            date(2025, 1, 25),
            date(2025, 2, 26),
            date(2025, 3, 26),
            date(2025, 4, 25),
        ]
        cycles = [_make_cycle(s, s + timedelta(days=4)) for s in start_dates]
        mock_get.return_value = cycles
        result = await predict_next_cycle_heuristic(USER_ID)
        assert result["has_sufficient_data"] is True
        assert result["avg_cycle_length"] == 28.5
        assert result["predicted_start_date"] == date(2025, 5, 23)
        assert result["cycle_variability"] > 0
        assert result["confidence_range"]["early"] is not None
        assert result["confidence_range"]["late"] is not None
        assert result["confidence_range"]["early"] < result["predicted_start_date"] < result["confidence_range"]["late"]
        assert result["prediction_source"] == "heuristic"

    @pytest.mark.asyncio
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_sop_high_variability_19_45_23_38(self, mock_get):
        start_dates = [
            date(2025, 1, 1),
            date(2025, 1, 20),
            date(2025, 3, 6),
            date(2025, 3, 29),
            date(2025, 5, 6),
        ]
        cycles = [_make_cycle(s, s + timedelta(days=4)) for s in start_dates]
        mock_get.return_value = cycles
        result = await predict_next_cycle_heuristic(USER_ID)
        assert result["has_sufficient_data"] is True
        assert result["cycle_variability"] > 5.0
        assert result["avg_cycle_length"] == 31.2
        assert result["predicted_start_date"] == date(2025, 6, 6)
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


class TestMAE:
    @pytest.mark.asyncio
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_mae_below_3_days(self, mock_get, synthetic_cycles):
        base = 28
        noise = 4
        n = 20
        cycles = synthetic_cycles(n, base=base, noise=noise)

        errors = []
        for i in range(1, len(cycles)):
            known = cycles[:i]
            actual_start = cycles[i]["start_date"]
            mock_get.return_value = known
            result = await predict_next_cycle_heuristic(USER_ID)
            predicted = result["predicted_start_date"]
            if predicted is not None:
                errors.append(abs((predicted - actual_start).days))
        mae = sum(errors) / len(errors) if errors else 0
        assert mae < 3.0, f"MAE={mae:.2f} >= 3.0"
        assert result["prediction_source"] == "heuristic"


class TestPredictNextCycle:
    @pytest.mark.asyncio
    @patch("app.services.prediction_service.get_ml_model")
    @patch("app.services.prediction_service.ml_predict")
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_prophet_active_returns_prophet_source(self, mock_cycles, mock_prophet, mock_ml):
        cycles = [
            _make_cycle(date(2025, 5, 1), date(2025, 5, 5)),
            _make_cycle(date(2025, 5, 29), date(2025, 6, 2)),
        ]
        mock_cycles.return_value = cycles
        from tests.conftest import MockRow
        mock_ml.return_value = MockRow({
            "id": "ml-id",
            "user_id": USER_ID,
            "model_path": "/tmp/model.pkl",
            "mae": 1.2,
            "cycles_used": 7,
            "trained_at": None,
            "is_active": True,
        })
        mock_prophet.return_value = {
            "predicted_start_date": date(2025, 6, 26),
            "confidence_range": {
                "early": date(2025, 6, 22),
                "late": date(2025, 6, 30),
            },
            "predicted_duration_days": 28.0,
            "prediction_source": "prophet",
        }

        result = await predict_next_cycle(USER_ID)

        assert result["prediction_source"] == "prophet"
        assert result["predicted_start_date"] == date(2025, 6, 26)
        assert result["model_mae_days"] == 1.2
        assert result["cycles_used_for_training"] == 7
        assert result["confidence_range"]["early"] == date(2025, 6, 22)
        assert result["confidence_range"]["late"] == date(2025, 6, 30)
        assert result["fertile_window"]["start"] is not None
        assert result["fertile_window"]["end"] is not None
        assert result["days_until_next"] is not None
        assert result["current_phase"] is not None
        assert result["current_phase_day"] is not None

    @pytest.mark.asyncio
    @patch("app.services.prediction_service.get_ml_model")
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_no_ml_model_falls_back_to_heuristic(self, mock_cycles, mock_ml):
        cycles = [
            _make_cycle(date(2025, 5, 1), date(2025, 5, 5)),
            _make_cycle(date(2025, 5, 29), date(2025, 6, 2)),
        ]
        mock_cycles.return_value = cycles
        mock_ml.return_value = None

        result = await predict_next_cycle(USER_ID)

        assert result["prediction_source"] == "heuristic"
        assert result["predicted_start_date"] is not None
        assert result["model_mae_days"] is None
        assert result["cycles_used_for_training"] is None

    @pytest.mark.asyncio
    @patch("app.services.prediction_service.get_ml_model")
    @patch("app.services.prediction_service.ml_predict")
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_prophet_returns_none_falls_back(self, mock_cycles, mock_prophet, mock_ml):
        cycles = [
            _make_cycle(date(2025, 5, 1), date(2025, 5, 5)),
            _make_cycle(date(2025, 5, 29), date(2025, 6, 2)),
        ]
        mock_cycles.return_value = cycles
        from tests.conftest import MockRow
        mock_ml.return_value = MockRow({
            "id": "ml-id",
            "user_id": USER_ID,
            "model_path": "/tmp/model.pkl",
            "mae": 1.2,
            "cycles_used": 7,
            "trained_at": None,
            "is_active": True,
        })
        mock_prophet.return_value = None

        result = await predict_next_cycle(USER_ID)

        assert result["prediction_source"] == "heuristic"
        assert result["model_mae_days"] is None
        assert result["cycles_used_for_training"] is None

    @pytest.mark.asyncio
    @patch("app.services.prediction_service.get_ml_model")
    @patch("app.services.prediction_service.ml_predict")
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_prophet_exception_falls_back(self, mock_cycles, mock_prophet, mock_ml):
        cycles = [
            _make_cycle(date(2025, 5, 1), date(2025, 5, 5)),
            _make_cycle(date(2025, 5, 29), date(2025, 6, 2)),
        ]
        mock_cycles.return_value = cycles
        from tests.conftest import MockRow
        mock_ml.return_value = MockRow({
            "id": "ml-id",
            "user_id": USER_ID,
            "model_path": "/tmp/model.pkl",
            "mae": 1.2,
            "cycles_used": 7,
            "trained_at": None,
            "is_active": True,
        })
        mock_prophet.side_effect = RuntimeError("Prophet crash")

        result = await predict_next_cycle(USER_ID)

        assert result["prediction_source"] == "heuristic"

    @pytest.mark.asyncio
    @patch("app.services.prediction_service.get_ml_model")
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_zero_cycles_returns_insufficient_data(self, mock_cycles, mock_ml):
        mock_cycles.return_value = []

        result = await predict_next_cycle(USER_ID)

        assert result["has_sufficient_data"] is False
        assert result["predicted_start_date"] is None
        assert result["prediction_source"] == "heuristic"

    @pytest.mark.asyncio
    @patch("app.services.prediction_service.get_ml_model")
    @patch("app.services.prediction_service.ml_predict")
    @patch("app.services.prediction_service.cycle_repo.get_cycles_by_user")
    async def test_inactive_model_falls_back(self, mock_cycles, mock_prophet, mock_ml):
        cycles = [
            _make_cycle(date(2025, 5, 1), date(2025, 5, 5)),
            _make_cycle(date(2025, 5, 29), date(2025, 6, 2)),
        ]
        mock_cycles.return_value = cycles
        from tests.conftest import MockRow
        mock_ml.return_value = MockRow({
            "id": "ml-id",
            "user_id": USER_ID,
            "model_path": "/tmp/model.pkl",
            "mae": 1.2,
            "cycles_used": 7,
            "trained_at": None,
            "is_active": False,
        })

        result = await predict_next_cycle(USER_ID)

        assert result["prediction_source"] == "heuristic"
        mock_prophet.assert_not_called()
