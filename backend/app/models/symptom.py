from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class SymptomEntry(BaseModel):
    symptom_id: int
    intensity: int = Field(ge=1, le=5)


class SymptomResponse(BaseModel):
    id: int
    name: str
    category: str
    common_phase: Optional[str] = None


class SymptomLogEntry(BaseModel):
    symptom_id: int
    intensity: int
    name: str
    category: str
    common_phase: Optional[str] = None


class DailyLogCreate(BaseModel):
    cycle_id: str
    date: date
    flow_level: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=35.0, le=42.0)
    notes: Optional[str] = None
    symptoms: list[SymptomEntry] = []

    @model_validator(mode="after")
    def validate_flow_level(self):
        if self.flow_level and self.flow_level not in ("none", "light", "medium", "heavy"):
            raise ValueError("flow_level must be one of: none, light, medium, heavy")
        return self


class DailyLogUpdate(BaseModel):
    date: Optional[date] = None
    flow_level: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=35.0, le=42.0)
    notes: Optional[str] = None
    symptoms: Optional[list[SymptomEntry]] = None

    @model_validator(mode="after")
    def validate_flow_level(self):
        if self.flow_level and self.flow_level not in ("none", "light", "medium", "heavy"):
            raise ValueError("flow_level must be one of: none, light, medium, heavy")
        return self


class DailyLogResponse(BaseModel):
    id: str
    cycle_id: str
    date: date
    flow_level: Optional[str] = None
    temperature: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    symptoms: list[SymptomLogEntry] = []


class DailyLogListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    logs: list[DailyLogResponse]
