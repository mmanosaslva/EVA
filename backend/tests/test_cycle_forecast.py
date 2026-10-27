import pytest

from app.services.cycle_forecast import (
    DEFAULT_CYCLE_LENGTH,
    exponential_smoothing,
    mean_length,
    median_length,
    weighted_moving_average,
)

ALL_METHODS = [mean_length, median_length, weighted_moving_average, exponential_smoothing]


@pytest.mark.parametrize("method", ALL_METHODS)
def test_empty_history_uses_default(method):
    assert method([]) == DEFAULT_CYCLE_LENGTH


@pytest.mark.parametrize("method", ALL_METHODS)
def test_constant_history_returns_that_length(method):
    assert method([30, 30, 30, 30]) == 30.0


def test_mean():
    assert mean_length([24, 32, 28, 30]) == 28.5


def test_median_even_and_odd():
    assert median_length([24, 32, 28, 30]) == 29.0
    assert median_length([24, 32, 28]) == 28.0


def test_median_ignores_one_outlier():
    assert median_length([28, 28, 56, 28]) == 28.0
    assert mean_length([28, 28, 56, 28]) == 35.0


def test_weighted_moving_average_favors_recent():
    # Pesos 1, 2, 3 → (1·26 + 2·28 + 3·32) / 6
    assert weighted_moving_average([26, 28, 32]) == pytest.approx(178 / 6)


def test_weighted_moving_average_uses_only_window():
    assert weighted_moving_average([90, 28, 28], window=2) == 28.0


def test_exponential_smoothing():
    # 30 → 0,3·20 + 0,7·30 = 27
    assert exponential_smoothing([30, 20], alpha=0.3) == pytest.approx(27.0)
