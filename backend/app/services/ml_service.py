import logging
from datetime import date
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd
from prophet import Prophet

logger = logging.getLogger(__name__)

MODELS_DIR = Path("ml_models")
MODELS_DIR.mkdir(exist_ok=True)

MIN_CYCLES_TO_TRAIN = 3


def get_model_path(user_id: str) -> Path:
    return MODELS_DIR / f"user_{user_id}.pkl"


def _evaluate_model(model: Prophet, df: pd.DataFrame) -> float:
    if len(df) < 4:
        return 99.0

    errors = []
    for i in range(2, len(df)):
        train_df = df.iloc[:i].copy()
        actual = df.iloc[i]["y"]

        eval_model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
            interval_width=0.80,
            changepoint_prior_scale=0.05,
        )
        eval_model.fit(train_df)
        future = eval_model.make_future_dataframe(periods=1, freq="28D")
        forecast = eval_model.predict(future)
        predicted = forecast.iloc[-1]["yhat"]
        errors.append(abs(actual - predicted))

    return sum(errors) / len(errors)


def train_model(user_id: str, cycles_data: list[dict]) -> dict:
    if len(cycles_data) < MIN_CYCLES_TO_TRAIN:
        raise ValueError(
            f"Se necesitan al menos {MIN_CYCLES_TO_TRAIN} ciclos para entrenar. "
            f"La usuaria tiene {len(cycles_data)}."
        )

    df = pd.DataFrame(cycles_data)
    df["ds"] = pd.to_datetime(df["start_date"])
    df = df.sort_values("ds")
    df["y"] = df["ds"].diff().dt.days.shift(-1)
    df = df.dropna(subset=["y"])

    if len(df) < 2:
        raise ValueError("Datos insuficientes despues de calcular duraciones.")

    model = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=False,
        daily_seasonality=False,
        seasonality_mode="additive",
        interval_width=0.80,
        changepoint_prior_scale=0.05,
    )

    if "avg_symptoms_lutea" in df.columns:
        model.add_regressor("avg_symptoms_lutea")
    if "avg_flow_level" in df.columns:
        model.add_regressor("avg_flow_level")

    model.fit(df)

    mae = _evaluate_model(model, df)

    model_path = get_model_path(user_id)
    joblib.dump(model, model_path)

    logger.info(f"Modelo entrenado para usuario {user_id[:8]}... | MAE: {mae:.2f} dias | Ciclos: {len(df)}")

    return {
        "model_path": str(model_path),
        "mae": round(mae, 3),
        "cycles_used": len(df),
    }


def predict_next_cycle(user_id: str, last_cycle_start: date) -> Optional[dict]:
    model_path = get_model_path(user_id)

    if not model_path.exists():
        return None

    model: Prophet = joblib.load(model_path)

    future = model.make_future_dataframe(periods=1, freq="28D")
    forecast = model.predict(future)

    last_forecast = forecast.iloc[-1]

    predicted_start = pd.Timestamp(last_cycle_start) + pd.Timedelta(days=int(last_forecast["yhat"]))

    return {
        "predicted_start_date": predicted_start.date(),
        "confidence_range": {
            "early": (pd.Timestamp(last_cycle_start) + pd.Timedelta(days=int(last_forecast["yhat_lower"]))).date(),
            "late": (pd.Timestamp(last_cycle_start) + pd.Timedelta(days=int(last_forecast["yhat_upper"]))).date(),
        },
        "predicted_duration_days": round(last_forecast["yhat"], 1),
        "prediction_source": "prophet",
    }
