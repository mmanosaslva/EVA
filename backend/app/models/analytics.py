from datetime import date
from typing import Optional

from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total_cycles: int
    avg_cycle_duration: float
    avg_period_duration: float
    cycle_variability_days: float
    shortest_cycle: Optional[int] = None
    longest_cycle: Optional[int] = None
    last_cycle_start: Optional[date] = None


class SymptomAnalyticsEntry(BaseModel):
    symptom_id: int
    name: str
    category: str
    frequency: float
    avg_intensity: float


class AnalyticsSymptoms(BaseModel):
    symptoms: list[SymptomAnalyticsEntry]
    cycles_analyzed: int
    total_logs_analyzed: int


class FlowDistributionEntry(BaseModel):
    phase: str
    flow_level: str
    count: int


class AnalyticsFlow(BaseModel):
    distribution: list[FlowDistributionEntry]
    total_days_analyzed: int


class AnalyticsPhases(BaseModel):
    avg_menstruation_days: float
    avg_follicular_days: float
    avg_ovulation_days: float
    avg_luteal_days: float
    avg_cycle_length: float
    note: str = "Fases folicular y lutea estimadas con modelo proporcional de 28 dias"
