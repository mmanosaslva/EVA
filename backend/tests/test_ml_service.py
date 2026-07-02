import random
from datetime import date, timedelta
from pathlib import Path

import joblib
import pytest
from prophet import Prophet

from app.services import ml_service
from app.services.ml_service import (
    train_model,
    predict_next_cycle,
    _evaluate_model,
)

USER_ID = "550e8400-e29b-41d4-a716-446655440000"


def _make_ml_cycle(start_date: date) -> dict:
    return {"start_date": start_date}


def _make_ml_cycle_with_features(start_date: date) -> dict:
    return {
        "start_date": start_date,
        "avg_flow_level": round(random.uniform(0.5, 2.5), 2),
        "avg_symptoms_lutea": round(random.uniform(0, 5), 2),
    }


def _generate_cycles(n: int, base: int = 28, noise: int = 0) -> list[dict]:
    random.seed(42)
    cycles = []
    current = date(2022, 1, 1)
    for _ in range(n):
        duration = base + random.randint(-noise, noise)
        cycles.append(_make_ml_cycle(current))
        current += timedelta(days=duration)
    return cycles


@pytest.fixture
def tmp_models_dir(monkeypatch, tmp_path):
    models_dir = tmp_path / "ml_models"
    models_dir.mkdir()
    monkeypatch.setattr(ml_service, "MODELS_DIR", models_dir)
    monkeypatch.setattr(ml_service, "get_model_path", lambda uid: models_dir / f"user_{uid}.pkl")
    return models_dir


class TestTrainModel:
    def test_less_than_3_cycles_raises_error(self):
        cycles = _generate_cycles(2)
        with pytest.raises(ValueError, match="al menos 3"):
            train_model(USER_ID, cycles)

    @pytest.mark.slow
    def test_5_regular_cycles_trains_successfully(self, tmp_models_dir):
        cycles = _generate_cycles(5, base=28, noise=0)
        result = train_model(USER_ID, cycles)
        assert result["cycles_used"] == 4
        assert result["mae"] < 99.0
        assert Path(result["model_path"]).exists()

    @pytest.mark.slow
    def test_irregular_cycles_trains_without_error(self, tmp_models_dir):
        cycles = _generate_cycles(6, base=28, noise=6)
        result = train_model(USER_ID, cycles)
        assert result["cycles_used"] >= 3
        assert result["mae"] < 99.0

    @pytest.mark.slow
    def test_sop_high_variability_trains_without_error(self, tmp_models_dir):
        durations = [19, 45, 23, 38, 30, 28]
        cycles = []
        current = date(2022, 1, 1)
        for d in durations:
            cycles.append(_make_ml_cycle(current))
            current += timedelta(days=d)
        result = train_model(USER_ID, cycles)
        assert result["cycles_used"] >= 3
        assert result["mae"] < 99.0

    @pytest.mark.slow
    def test_with_features_regressors(self, tmp_models_dir):
        cycles = []
        current = date(2022, 1, 1)
        for _ in range(5):
            duration = 28 + random.randint(-3, 3)
            cycles.append(_make_ml_cycle_with_features(current))
            current += timedelta(days=duration)
        result = train_model(USER_ID, cycles)
        assert result["cycles_used"] == 4


class TestPredictNextCycle:
    @pytest.mark.slow
    def test_without_model_returns_none(self):
        result = predict_next_cycle("nonexistent-user", date(2025, 1, 1))
        assert result is None

    @pytest.mark.slow
    def test_after_training_returns_prediction(self, tmp_models_dir):
        cycles = _generate_cycles(6, base=28, noise=2)
        train_model(USER_ID, cycles)
        last_start = cycles[-1]["start_date"]
        result = predict_next_cycle(USER_ID, last_start)
        assert result is not None
        assert result["prediction_source"] == "prophet"
        assert "predicted_start_date" in result
        assert "confidence_range" in result

    @pytest.mark.slow
    def test_prediction_error_below_2_days_regular_cycles(self, tmp_models_dir):
        cycles = _generate_cycles(7, base=28, noise=0)
        train_cycles = cycles[:-1]
        actual_start = cycles[-1]["start_date"]
        train_model(USER_ID, train_cycles)
        last_train_start = train_cycles[-1]["start_date"]
        result = predict_next_cycle(USER_ID, last_train_start)
        assert result is not None
        error = abs((result["predicted_start_date"] - actual_start).days)
        assert error < 2, f"Error de prediccion: {error} dias"


class TestSerialization:
    @pytest.mark.slow
    def test_model_serialization_deserialization(self, tmp_models_dir):
        cycles = _generate_cycles(5, base=28, noise=2)
        train_model(USER_ID, cycles)

        model_path = tmp_models_dir / f"user_{USER_ID}.pkl"
        assert model_path.exists()

        loaded: Prophet = joblib.load(model_path)
        assert isinstance(loaded, Prophet)

    @pytest.mark.slow
    def test_loaded_model_predicts_same_as_original(self, tmp_models_dir):
        cycles = _generate_cycles(5, base=28, noise=1)
        train_model(USER_ID, cycles)

        model_path = tmp_models_dir / f"user_{USER_ID}.pkl"
        loaded: Prophet = joblib.load(model_path)

        future = loaded.make_future_dataframe(periods=1, freq="28D")
        forecast = loaded.predict(future)
        assert "yhat" in forecast.columns
        assert forecast.iloc[-1]["yhat"] is not None


class TestEvaluateModel:
    @pytest.mark.slow
    def test_less_than_4_cycles_returns_99(self):
        cycles = _generate_cycles(3, base=28, noise=0)
        df = _cycles_to_df(cycles)
        model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
        )
        model.fit(df)
        mae = _evaluate_model(model, df)
        assert mae == 99.0

    @pytest.mark.slow
    def test_6_cycles_returns_finite_mae(self):
        cycles = _generate_cycles(6, base=28, noise=3)
        df = _cycles_to_df(cycles)
        model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
        )
        model.fit(df)
        mae = _evaluate_model(model, df)
        assert mae < 99.0
        assert mae > 0


def _cycles_to_df(cycles: list[dict]):
    import pandas as pd

    df = pd.DataFrame(cycles)
    df["ds"] = pd.to_datetime(df["start_date"])
    df = df.sort_values("ds")
    df["y"] = df["ds"].diff().dt.days.shift(-1)
    return df.dropna(subset=["y"])
