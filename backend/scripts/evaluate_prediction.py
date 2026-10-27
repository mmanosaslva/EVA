"""T24: compara métodos de predicción del próximo ciclo con datos sintéticos.

Validación walk-forward: cada ciclo se predice usando solo los anteriores de la misma usuaria.
Métricas: MAE en días, % dentro de ±2 días, tiempo por predicción y memoria máxima del proceso.
Cada método corre en su propio proceso para que la memoria incluya sus importaciones.
No se conecta a ninguna base de datos (Docs/s10/restricciones.md RX-10).

Uso:
    python scripts/evaluate_prediction.py                  # incluye Prophet si está instalado
    python scripts/evaluate_prediction.py --skip-prophet   # solo métodos simples
    python scripts/evaluate_prediction.py --users 40 --seed 7
"""

import argparse
import multiprocessing as mp
import random
import resource
import sys
import time
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.cycle_forecast import (  # noqa: E402
    DEFAULT_CYCLE_LENGTH,
    exponential_smoothing,
    mean_length,
    median_length,
    weighted_moving_average,
)

SCENARIOS = ("regular", "irregular", "pocos_ciclos", "atipico")
SIMPLE_METHODS = {
    "promedio": mean_length,
    "mediana": median_length,
    "promedio_ponderado": weighted_moving_average,
    "suavizado_exponencial": exponential_smoothing,
}
DECISION_MARGIN_DAYS = 0.5


# ── Datos sintéticos ────────────────────────────────────────────────────

def _lengths_for(scenario: str, rng: random.Random) -> list[int]:
    """Duraciones de ciclo (días) de una usuaria sintética según el escenario."""
    if scenario == "regular":
        base = rng.randint(26, 31)
        return [max(21, round(rng.gauss(base, 1.0))) for _ in range(rng.randint(6, 12))]
    if scenario == "irregular":
        # Base distinta por usuaria, ruido alto y una deriva lenta (p. ej. cambios hormonales).
        base = rng.uniform(25, 34)
        drift = rng.uniform(-0.4, 0.4)
        return [
            max(18, min(50, round(rng.gauss(base + drift * i, 4.0))))
            for i in range(rng.randint(6, 12))
        ]
    if scenario == "pocos_ciclos":
        # 1 a 3 duraciones conocidas antes de la que se predice.
        base = rng.randint(25, 32)
        return [max(21, round(rng.gauss(base, 2.0))) for _ in range(rng.randint(2, 4))]
    if scenario == "atipico":
        base = rng.randint(26, 31)
        lengths = [max(21, round(rng.gauss(base, 1.0))) for _ in range(rng.randint(7, 12))]
        outlier = rng.randint(1, len(lengths) - 2)
        lengths[outlier] += rng.choice([-1, 1]) * rng.randint(10, 18)
        return lengths
    raise ValueError(scenario)


def generate_users(scenario: str, n_users: int, seed: int) -> list[list[date]]:
    """Fechas de inicio de ciclo por usuaria. Determinista para un mismo seed."""
    rng = random.Random(f"{seed}-{scenario}")
    users = []
    for _ in range(n_users):
        start = date(2023, 1, 1) + timedelta(days=rng.randint(0, 60))
        starts = [start]
        for length in _lengths_for(scenario, rng):
            starts.append(starts[-1] + timedelta(days=length))
        users.append(starts)
    return users


def walk_forward_cases(starts: list[date]) -> list[tuple[list[date], int]]:
    """(inicios conocidos, duración real del ciclo siguiente) para cada punto de la serie."""
    return [
        (starts[:k], (starts[k] - starts[k - 1]).days)
        for k in range(2, len(starts))
    ]


# ── Prophet (mejor versión posible: sin regresores y con la fecha objetivo correcta) ──

def _prophet_predict(starts: list[date]) -> float:
    import logging

    import pandas as pd
    from prophet import Prophet

    logging.getLogger("cmdstanpy").setLevel(logging.ERROR)
    logging.getLogger("prophet").setLevel(logging.ERROR)

    lengths = [(starts[i] - starts[i - 1]).days for i in range(1, len(starts))]
    # Igual que producción: con menos de 2 duraciones Prophet no entrena y responde la heurística.
    if len(lengths) < 2:
        return mean_length(lengths)

    df = pd.DataFrame({"ds": pd.to_datetime(starts[:-1]), "y": lengths})
    model = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=False,
        daily_seasonality=False,
        interval_width=0.80,
        changepoint_prior_scale=0.05,
    )
    model.fit(df)
    forecast = model.predict(pd.DataFrame({"ds": [pd.Timestamp(starts[-1])]}))
    return float(forecast.iloc[0]["yhat"])


# ── Ejecución por método (en un proceso aparte) ─────────────────────────

def _run_method(method: str, cases_by_scenario: dict) -> dict:
    predict = _prophet_predict if method == "prophet" else None
    simple = SIMPLE_METHODS.get(method)

    results = {}
    for scenario, cases in cases_by_scenario.items():
        errors, elapsed = [], 0.0
        for starts, actual in cases:
            t0 = time.perf_counter()
            if predict:
                predicted = predict(starts)
            else:
                lengths = [(starts[i] - starts[i - 1]).days for i in range(1, len(starts))]
                predicted = simple(lengths)
            elapsed += time.perf_counter() - t0
            errors.append(abs(round(predicted) - actual))
        results[scenario] = {
            "mae": sum(errors) / len(errors),
            "within_2": 100 * sum(e <= 2 for e in errors) / len(errors),
            "ms_per_prediction": 1000 * elapsed / len(cases),
            "n": len(cases),
        }
    # ru_maxrss está en KB en Linux.
    results["max_rss_mb"] = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
    return results


def evaluate(methods: list[str], n_users: int, seed: int) -> dict:
    cases_by_scenario = {
        scenario: [
            case
            for starts in generate_users(scenario, n_users, seed)
            for case in walk_forward_cases(starts)
        ]
        for scenario in SCENARIOS
    }
    ctx = mp.get_context("spawn")
    report = {}
    for method in methods:
        with ctx.Pool(1) as pool:
            report[method] = pool.apply(_run_method, (method, cases_by_scenario))
    return report


def _mean_mae(result: dict) -> float:
    return sum(result[s]["mae"] for s in SCENARIOS) / len(SCENARIOS)


def decide(report: dict) -> str:
    simple = {m: r for m, r in report.items() if m != "prophet"}
    best_overall = min(simple, key=lambda m: _mean_mae(simple[m]))
    lines = [
        f"Menor MAE promedio entre escenarios: {best_overall} ({_mean_mae(simple[best_overall]):.2f} días)."
    ]
    if "prophet" in report:
        best = min(simple, key=lambda m: simple[m]["irregular"]["mae"])
        gain = simple[best]["irregular"]["mae"] - report["prophet"]["irregular"]["mae"]
        verdict = "SE QUEDA" if gain >= DECISION_MARGIN_DAYS else "SE ELIMINA"
        lines.append(
            f"Prophet {verdict}: en irregular mejora {gain:+.2f} días de MAE frente a {best} "
            f"(regla: ≥ {DECISION_MARGIN_DAYS} días)."
        )
    return "\n".join(lines)


def print_report(report: dict, n_users: int, seed: int) -> None:
    print(f"\nEVA · T24 · {n_users} usuarias sintéticas por escenario · seed {seed}")
    print(f"Duración por defecto sin historial: {DEFAULT_CYCLE_LENGTH} días\n")
    header = "| Método | " + " | ".join(SCENARIOS) + " | ms/pred (prom.) | Memoria máx. (MB) |"
    print("MAE en días (% dentro de ±2 días)\n")
    print(header)
    print("|" + "---|" * (len(SCENARIOS) + 3))
    for method, r in report.items():
        cells = [f"{r[s]['mae']:.2f} ({r[s]['within_2']:.0f} %)" for s in SCENARIOS]
        ms = sum(r[s]["ms_per_prediction"] for s in SCENARIOS) / len(SCENARIOS)
        print(f"| {method} | " + " | ".join(cells) + f" | {ms:.3f} | {r['max_rss_mb']:.0f} |")
    n_cases = {s: next(iter(report.values()))[s]["n"] for s in SCENARIOS}
    print("\nPredicciones evaluadas: " + ", ".join(f"{s} {n}" for s, n in n_cases.items()))
    print("\n" + decide(report))


def main() -> None:
    parser = argparse.ArgumentParser(description="Evalúa métodos de predicción del ciclo (T24)")
    parser.add_argument("--users", type=int, default=40, help="Usuarias sintéticas por escenario")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--skip-prophet", action="store_true", help="No evaluar Prophet")
    args = parser.parse_args()

    methods = list(SIMPLE_METHODS)
    if not args.skip_prophet:
        methods.append("prophet")
    report = evaluate(methods, args.users, args.seed)
    print_report(report, args.users, args.seed)


if __name__ == "__main__":
    main()
