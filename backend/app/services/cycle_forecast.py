"""Métodos simples para estimar la duración del próximo ciclo a partir de las anteriores.

Funciones puras: reciben duraciones en días (de la más antigua a la más reciente) y
devuelven la duración estimada. Se calculan al vuelo, sin archivos ni entrenamiento.
"""

from statistics import median

DEFAULT_CYCLE_LENGTH = 28.0
WMA_WINDOW = 6
SES_ALPHA = 0.3


def mean_length(lengths: list[int]) -> float:
    if not lengths:
        return DEFAULT_CYCLE_LENGTH
    return sum(lengths) / len(lengths)


def median_length(lengths: list[int]) -> float:
    if not lengths:
        return DEFAULT_CYCLE_LENGTH
    return float(median(lengths))


def weighted_moving_average(lengths: list[int], window: int = WMA_WINDOW) -> float:
    """Promedio de las últimas `window` duraciones con peso lineal: la más reciente pesa más."""
    if not lengths:
        return DEFAULT_CYCLE_LENGTH
    recent = lengths[-window:]
    weights = range(1, len(recent) + 1)
    return sum(w * x for w, x in zip(weights, recent)) / sum(weights)


def exponential_smoothing(lengths: list[int], alpha: float = SES_ALPHA) -> float:
    """Suavizado exponencial simple, iniciado con la primera duración."""
    if not lengths:
        return DEFAULT_CYCLE_LENGTH
    level = float(lengths[0])
    for x in lengths[1:]:
        level = alpha * x + (1 - alpha) * level
    return level
