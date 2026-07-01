from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class InsightRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Pregunta de la usuaria sobre su ciclo")
    context_cycles: int = Field(default=3, ge=1, le=12, description="Cantidad de ciclos a considerar para el contexto")


class InsightResponse(BaseModel):
    insight: str
    phase: Optional[str] = None
    source: str
    disclaimer: str = "EVA no reemplaza el consejo médico profesional."


class InsightHistoryItem(BaseModel):
    id: str
    question: str
    insight: str
    phase: Optional[str] = None
    source: str
    created_at: datetime


class InsightHistoryResponse(BaseModel):
    total: int
    limit: int
    offset: int
    insights: list[InsightHistoryItem]
