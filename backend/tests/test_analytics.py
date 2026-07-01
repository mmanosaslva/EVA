import pytest
from unittest.mock import patch

from app.services.analytics_service import (
    get_summary,
    get_symptoms_analytics,
    get_flow_analytics,
    get_phases_analytics,
)

USER_ID = "550e8400-e29b-41d4-a716-446655440000"


class TestEmptyUser:
    """Usuario sin ciclos — todos los endpoints deben retornar datos vacios/ceros sin lanzar 500."""

    @pytest.mark.asyncio
    @patch("app.services.analytics_service.get_cycle_count")
    async def test_summary_empty(self, mock_count):
        mock_count.return_value = 0
        result = await get_summary(USER_ID)
        assert result["total_cycles"] == 0
        assert result["avg_cycle_duration"] == 0.0
        assert result["avg_period_duration"] == 0.0
        assert result["cycle_variability_days"] == 0.0
        assert result["shortest_cycle"] is None
        assert result["longest_cycle"] is None
        assert result["last_cycle_start"] is None

    @pytest.mark.asyncio
    @patch("app.services.analytics_service.get_all_cycle_ids")
    async def test_symptoms_empty(self, mock_ids):
        mock_ids.return_value = []
        result = await get_symptoms_analytics(USER_ID, cycles_back=None, limit=10)
        assert result["symptoms"] == []
        assert result["cycles_analyzed"] == 0
        assert result["total_logs_analyzed"] == 0

    @pytest.mark.asyncio
    @patch("app.services.analytics_service.get_last_cycle_ids")
    async def test_symptoms_with_cycles_back(self, mock_ids):
        mock_ids.return_value = []
        result = await get_symptoms_analytics(USER_ID, cycles_back=3, limit=10)
        assert result["symptoms"] == []
        assert result["cycles_analyzed"] == 0
        mock_ids.assert_called_once_with(USER_ID, 3)

    @pytest.mark.asyncio
    @patch("app.services.analytics_service.get_flow_distribution")
    @patch("app.services.analytics_service.count_logs_for_user")
    async def test_flow_empty(self, mock_count, mock_dist):
        mock_dist.return_value = []
        mock_count.return_value = 0
        result = await get_flow_analytics(USER_ID)
        assert result["distribution"] == []
        assert result["total_days_analyzed"] == 0

    @pytest.mark.asyncio
    @patch("app.services.analytics_service.get_cycle_count")
    async def test_phases_empty(self, mock_count):
        mock_count.return_value = 0
        result = await get_phases_analytics(USER_ID)
        assert result["avg_menstruation_days"] == 0.0
        assert result["avg_follicular_days"] == 0.0
        assert result["avg_ovulation_days"] == 0.0
        assert result["avg_luteal_days"] == 0.0
        assert result["avg_cycle_length"] == 0.0


class TestSchemaValidation:
    """Validacion de schemas Pydantic para los endpoints de analytics."""

    def test_summary_schema_valid(self):
        from app.models.analytics import AnalyticsSummary
        s = AnalyticsSummary(
            total_cycles=0,
            avg_cycle_duration=0.0,
            avg_period_duration=0.0,
            cycle_variability_days=0.0,
            shortest_cycle=None,
            longest_cycle=None,
            last_cycle_start=None,
        )
        assert s.total_cycles == 0

    def test_symptoms_schema_valid(self):
        from app.models.analytics import AnalyticsSymptoms
        s = AnalyticsSymptoms(symptoms=[], cycles_analyzed=0, total_logs_analyzed=0)
        assert s.symptoms == []

    def test_flow_schema_valid(self):
        from app.models.analytics import AnalyticsFlow
        s = AnalyticsFlow(distribution=[], total_days_analyzed=0)
        assert s.distribution == []

    def test_phases_schema_valid(self):
        from app.models.analytics import AnalyticsPhases
        s = AnalyticsPhases(
            avg_menstruation_days=0.0,
            avg_follicular_days=0.0,
            avg_ovulation_days=0.0,
            avg_luteal_days=0.0,
            avg_cycle_length=0.0,
        )
        assert "estimadas" in s.note


class TestPhasesCalculation:
    """Calculo de fases con datos reales."""

    @pytest.mark.asyncio
    @patch("app.services.analytics_service.get_cycle_count")
    @patch("app.services.analytics_service.get_cycle_stats")
    @patch("app.services.analytics_service.get_bleeding_days_per_cycle")
    async def test_phases_with_data(self, mock_bleeding, mock_stats, mock_count):
        mock_count.return_value = 5
        mock_stats.return_value = {"avg_duration": 27.5, "variability": 2.1, "shortest": 25, "longest": 30, "last_start": None}
        mock_bleeding.return_value = [5, 4, 6, 5, 5]
        result = await get_phases_analytics(USER_ID)
        assert result["avg_menstruation_days"] == 5.0
        assert result["avg_cycle_length"] == 27.5
        assert result["avg_ovulation_days"] == 3.0
        scale = 27.5 / 28.0
        assert result["avg_follicular_days"] == round(9.0 * scale, 1)
        assert result["avg_luteal_days"] == round(14.0 * scale, 1)
