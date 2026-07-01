import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCycles } from "../hooks/useCycles";
import { computeDashboardData } from "../lib/dashboardUtils";
import { MetricCard } from "../components/dashboard/MetricCard";
import { RecentCycles } from "../components/dashboard/RecentCycles";
import { CycleDurationChart } from "../components/charts/CycleDurationChart";
import { SymptomFrequencyChart } from "../components/charts/SymptomFrequencyChart";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { cycles, loading, error } = useCycles();

  const dashboardData = useMemo(
    () => (cycles.length > 0 ? computeDashboardData(cycles) : null),
    [cycles],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-eva-300 border-t-eva-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <Card padding="md" className="border-red-200 bg-red-50 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button
            variant="ghost"
            className="mt-3 text-sm"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  if (!dashboardData || cycles.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-5xl mb-4">🌸</p>
        <h1 className="text-xl font-bold text-text-primary mb-2">
          Bienvenida a EVA
        </h1>
        <p className="text-sm text-text-secondary mb-6 max-w-xs mx-auto">
          Registra tu primer ciclo menstrual para comenzar a recibir
          predicciones personalizadas y seguimiento de síntomas.
        </p>
        <Button onClick={() => navigate("/calendar")}>
          Registrar mi primer ciclo
        </Button>
      </div>
    );
  }

  const {
    avgCycleDuration,
    avgPeriodDuration,
    totalCycles,
    currentCycle,
    currentCycleDay,
    predictedCycleLength,
    currentPhaseLabel,
    currentPhaseDescription,
    predictedNextDate,
    daysUntilNext,
    pastCycles,
    durationChartData,
  } = dashboardData;

  const formattedPredicted = new Date(predictedNextDate).toLocaleDateString(
    "es-ES",
    {
      day: "numeric",
      month: "long",
    },
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">EVA</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Tu salud, tus datos, tu ciclo.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <MetricCard
          icon="📊"
          value={`${avgCycleDuration}`}
          label="Duración promedio"
          subtitle={`${totalCycles} ciclos registrados`}
          variant="highlight"
        />

        <MetricCard
          icon="📅"
          value={daysUntilNext === 0 ? "Hoy" : `${daysUntilNext}`}
          label={
            daysUntilNext === 0
              ? "Próximo período"
              : daysUntilNext === 1
                ? "Día para tu período"
                : "Días para tu período"
          }
          subtitle={`Estimado: ${formattedPredicted}`}
          variant="highlight"
        />

        <MetricCard
          icon="🌱"
          value={currentPhaseLabel}
          label="Fase actual"
          subtitle={currentPhaseDescription}
          variant="phase"
          phase={dashboardData.currentPhase ?? undefined}
        />

        <MetricCard
          icon="📍"
          value={currentCycle ? `Día ${currentCycleDay}` : "—"}
          label={`de ${predictedCycleLength} días`}
          subtitle={
            currentCycle
              ? `Inició el ${new Date(currentCycle.start_date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`
              : "Sin ciclo activo"
          }
        />
      </div>

      {/* Cycle Duration Chart — Issue #25 */}
      <div className="mb-5">
        <CycleDurationChart
          data={durationChartData}
          average={avgPeriodDuration}
        />
      </div>

      {/* Symptom Frequency Chart — Issue #26 */}
      <div className="mb-5">
        <SymptomFrequencyChart totalCycles={totalCycles} />
      </div>

      {/* Recent Cycles */}
      <div className="mb-5">
        <RecentCycles cycles={pastCycles} />
      </div>

      {/* Quick action */}
      {currentCycle && (
        <Button
          className="w-full"
          onClick={() =>
            navigate(
              `/symptoms?date=${todayStr()}&cycleId=${currentCycle.id}`,
            )
          }
        >
          Registrar cómo me siento hoy
        </Button>
      )}

      {/* Navigation links */}
      <div className="mt-5 flex gap-3">
        <Button
          variant="ghost"
          className="flex-1 text-sm"
          onClick={() => navigate("/calendar")}
        >
          Ver calendario
        </Button>
        <Button
          variant="ghost"
          className="flex-1 text-sm"
          onClick={() =>
            navigate(
              `/symptoms?cycleId=${currentCycle?.id ?? ""}&tab=historial`,
            )
          }
        >
          Historial de síntomas
        </Button>
      </div>
    </div>
  );
}
