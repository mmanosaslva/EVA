from datetime import date
from typing import Optional

from pydantic import BaseModel


class ConfidenceRange(BaseModel):
    early: Optional[date] = None
    late: Optional[date] = None


class FertileWindow(BaseModel):
    start: Optional[date] = None
    end: Optional[date] = None


class PredictionResponse(BaseModel):
    predicted_start_date: Optional[date] = None
    confidence_range: ConfidenceRange = ConfidenceRange()
    days_until_next: Optional[int] = None
    current_phase: Optional[str] = None
    current_phase_day: Optional[int] = None
    prediction_source: Optional[str] = None
    model_mae_days: Optional[float] = None
    cycles_used_for_training: Optional[int] = None
    fertile_window: FertileWindow = FertileWindow()
