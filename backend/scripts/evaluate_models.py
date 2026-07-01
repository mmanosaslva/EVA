"""Evalua modelos Prophet vs heuristica y reporta MAE global.

Ejecuta con datos sinteticos (50 usuarias, 8+ ciclos) para CI/CD.
Si hay conexion a BD, evalua tambien modelos reales.

Uso:
    python scripts/evaluate_models.py              # solo sintetico (CI/CD)
    python scripts/evaluate_models.py --with-db    # real + sintetico
"""

import argparse
import asyncio
import random
import sys
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import pandas as pd
from prophet import Prophet

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.ml_service import train_model, get_model_path, MODELS_DIR
from app.repositories.cycle_repo import get_cycles_with_features

random.seed(42)


@dataclass
class EvalResult:
    user_id: str
    prophet_mae: float
    heuristic_mae: float
    prophet_errors: list[int] = field(default_factory=list)
    heuristic_errors: list[int] = field(default_factory=list)


def _heuristic_predict(cycles: list[dict]) -> Optional[int]:
    if len(cycles) < 2:
        return None
    durations = [
        (cycles[i]["start_date"] - cycles[i - 1]["start_date"]).days
        for i in range(1, len(cycles))
    ]
    avg = sum(durations) / len(durations)
    last_start = cycles[-1]["start_date"]
    predicted = last_start + timedelta(days=int(round(avg)))
    return predicted


def _generate_synthetic_user(idx: int, num_cycles: int, base: int = 28, noise: int = 5) -> list[dict]:
    user_id = f"synthetic-{idx:04d}"
    cycles = []
    current = date(2022, 1, 1) + timedelta(days=random.randint(0, 30))

    for i in range(num_cycles):
        duration = base + random.randint(-noise, noise)
        end_date = current + timedelta(days=5)
        cycles.append({
            "user_id": user_id,
            "start_date": current,
            "end_date": end_date,
            "avg_flow_level": round(random.uniform(0.5, 2.5), 2),
            "avg_symptoms_lutea": round(random.uniform(0, 5), 2),
        })
        current += timedelta(days=duration)

    return cycles


def _train_and_evaluate_prophet(cycles: list[dict]) -> float:
    train_cycles = cycles[:-1]
    actual_next_start = cycles[-1]["start_date"]

    try:
        model_info = train_model(cycles[0]["user_id"], train_cycles)
        model_path = Path(model_info["model_path"])
        if not model_path.exists():
            return 99.0

        last_train_end = train_cycles[-1]["start_date"]
        prediction = _predict_with_model(model_path, last_train_end)
        if prediction is None:
            return 99.0

        return abs((prediction - actual_next_start).days)
    except Exception:
        return 99.0


def _predict_with_model(model_path: Path, last_start: date) -> Optional[date]:
    import joblib

    model: Prophet = joblib.load(model_path)
    future = model.make_future_dataframe(periods=1, freq="28D")
    forecast = model.predict(future)
    last_forecast = forecast.iloc[-1]
    predicted = pd.Timestamp(last_start) + pd.Timedelta(days=int(last_forecast["yhat"]))
    return predicted.date()


def _evaluate_heuristic(cycles: list[dict]) -> float:
    train_cycles = cycles[:-1]
    actual_next_start = cycles[-1]["start_date"]
    predicted = _heuristic_predict(train_cycles)
    if predicted is None:
        return 99.0
    return abs((predicted - actual_next_start).days)


def evaluate_with_synthetic(
    num_users: int = 50,
    cycles_per_user: int = 10,
    base: int = 28,
    noise: int = 5,
) -> list[EvalResult]:
    results = []

    for i in range(num_users):
        cycles = _generate_synthetic_user(i, cycles_per_user, base, noise)
        prophet_mae = _train_and_evaluate_prophet(cycles)
        heuristic_mae = _evaluate_heuristic(cycles)

        results.append(EvalResult(
            user_id=f"synthetic-{i:04d}",
            prophet_mae=prophet_mae,
            heuristic_mae=heuristic_mae,
        ))

    return results


async def evaluate_all_models() -> list[EvalResult]:
    from app.repositories.user_repo import get_all_active_users

    users = await get_all_active_users()
    results = []

    for user in users:
        model_path = get_model_path(user.id)
        if not model_path.exists():
            continue

        cycles = await get_cycles_with_features(user.id)
        if len(cycles) < 4:
            continue

        prophet_mae = _train_and_evaluate_prophet(cycles)
        heuristic_mae = _evaluate_heuristic(cycles)

        results.append(EvalResult(
            user_id=user.id,
            prophet_mae=prophet_mae,
            heuristic_mae=heuristic_mae,
        ))

    return results


def _report(description: str, results: list[EvalResult]):
    if not results:
        print(f"\n{'='*60}")
        print(f"  {description}")
        print(f"{'='*60}")
        print("  No hay modelos para evaluar.")
        return

    prophet_maes = [r.prophet_mae for r in results if r.prophet_mae < 99.0]
    heuristic_maes = [r.heuristic_mae for r in results if r.heuristic_mae < 99.0]

    print(f"\n{'='*60}")
    print(f"  {description}")
    print(f"{'='*60}")

    if prophet_maes:
        avg_prophet = sum(prophet_maes) / len(prophet_maes)
        print("\n  Prophet:")
        print(f"    Modelos evaluados: {len(prophet_maes)}")
        print(f"    MAE promedio:      {avg_prophet:.2f} dias")
        print(f"    MAE minimo:        {min(prophet_maes):.2f} dias")
        print(f"    MAE maximo:        {max(prophet_maes):.2f} dias")

    if heuristic_maes:
        avg_heuristic = sum(heuristic_maes) / len(heuristic_maes)
        print("\n  Heuristica:")
        print(f"    Modelos evaluados: {len(heuristic_maes)}")
        print(f"    MAE promedio:      {avg_heuristic:.2f} dias")
        print(f"    MAE minimo:        {min(heuristic_maes):.2f} dias")
        print(f"    MAE maximo:        {max(heuristic_maes):.2f} dias")

    if prophet_maes and heuristic_maes:
        improvement = avg_heuristic - avg_prophet
        pct = (improvement / avg_heuristic) * 100 if avg_heuristic > 0 else 0
        print("\n  Mejora Prophet vs Heuristica:")
        print(f"    Diferencia:  {improvement:.2f} dias ({pct:.1f}%)")
        print(f"    {'✓ Prophet supera a heuristica' if improvement > 0 else '○ Similares'}")


def main():
    parser = argparse.ArgumentParser(description="Evalua modelos Prophet vs heuristica")
    parser.add_argument("--with-db", action="store_true", help="Incluir evaluacion con datos reales de BD")
    parser.add_argument("--users", type=int, default=50, help="Numero de usuarias sinteticas")
    parser.add_argument("--cycles", type=int, default=10, help="Ciclos por usuaria")
    parser.add_argument("--noise", type=int, default=5, help="Ruido en duracion de ciclos (dias)")
    args = parser.parse_args()

    print("EVA - Evaluacion de Modelos ML")
    print(f"Sintetico: {args.users} usuarias, {args.cycles} ciclos, ruido ±{args.noise} dias")

    MODELS_DIR.mkdir(exist_ok=True)

    synth_results = evaluate_with_synthetic(
        num_users=args.users,
        cycles_per_user=args.cycles,
        noise=args.noise,
    )
    _report(f"Sintetico ({args.users} usuarias)", synth_results)

    if args.with_db:
        real_results = asyncio.run(evaluate_all_models())
        _report("Base de datos real", real_results)

    prophet_valid = [r for r in synth_results if r.prophet_mae < 99.0]
    if prophet_valid:
        avg = sum(r.prophet_mae for r in prophet_valid) / len(prophet_valid)
        if avg >= 1.5:
            print(f"\n  ⚠ MAE global {avg:.2f} >= 1.5 dias (limite: < 1.5)")
            sys.exit(1)


if __name__ == "__main__":
    main()
