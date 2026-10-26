from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class InsightRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Pregunta de la usuaria sobre su ciclo")
    context_cycles: int = Field(default=3, ge=1, le=12, description="Cantidad de ciclos a considerar para el contexto")


class InsightResponse(BaseModel):
    # Sin proveedor ni modelo: el cambio entre LLMs es invisible para la usuaria (RX-06)
    insight: str
    phase: Optional[str] = None
    disclaimer: str = "EVA no reemplaza el consejo médico profesional."
    is_automatic: bool = False


class InsightHistoryItem(BaseModel):
    id: str
    question: str
    insight: str
    phase: Optional[str] = None
    is_automatic: bool = False
    created_at: datetime


class InsightHistoryResponse(BaseModel):
    total: int
    limit: int
    offset: int
    insights: list[InsightHistoryItem]
