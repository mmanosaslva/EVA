from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.models.prediction import (
    ConfidenceRange,
    FertileWindow,
    PredictionResponse,
)
from app.services import prediction_service

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.get("/next", response_model=PredictionResponse)
async def get_next_prediction(current_user: dict = Depends(get_current_user)):
    user_id: str = current_user["user_id"]
    result = await prediction_service.predict_next_cycle(user_id)

    if not result["has_sufficient_data"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No hay suficientes datos para generar una prediccion. Registra al menos un ciclo menstrual.",
        )

    return PredictionResponse(
        predicted_start_date=result["predicted_start_date"],
        confidence_range=ConfidenceRange(
            early=result["confidence_range"]["early"],
            late=result["confidence_range"]["late"],
        ),
        days_until_next=result["days_until_next"],
        current_phase=result["current_phase"],
        current_phase_day=result["current_phase_day"],
        prediction_source=result["prediction_source"],
        model_mae_days=result.get("model_mae_days"),
        cycles_used_for_training=result.get("cycles_used_for_training"),
        fertile_window=FertileWindow(
            start=result["fertile_window"]["start"],
            end=result["fertile_window"]["end"],
        ),
    )
