from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class CycleCreate(BaseModel):
    start_date: date
    end_date: Optional[date] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be greater than or equal to start_date")
        return self


class CycleUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be greater than or equal to start_date")
        return self


class CycleResponse(BaseModel):
    id: str
    user_id: str
    start_date: date
    end_date: Optional[date] = None
    duration_days: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class CycleListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    cycles: list[CycleResponse]
