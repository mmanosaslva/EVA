import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCycles } from "../hooks/useCycles";
import { useAuth } from "../hooks/useAuth";
import { computeDashboardData } from "../lib/dashboardUtils";
import { PhaseCard } from "../components/dashboard/PhaseCard";
import { CycleProgressCard } from "../components/dashboard/CycleProgressCard";
import { TrendChartCard } from "../components/dashboard/TrendChartCard";
import { RecommendationsCard } from "../components/dashboard/RecommendationsCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cycles, loading, error } = useCycles();

  const dashboardData = useMemo(
    () => (cycles.length > 0 ? computeDashboardData(cycles) : null),
    [cycles],
  );

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Usuaria";

  if (loading) {
    return (
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-12">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-fixed-dim border-t-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-12">
        <Card padding="md" className="border-error/20 bg-error-container/30 text-center">
          <p className="text-body-sm text-on-error-container">{error}</p>
          <Button
            variant="ghost"
            className="mt-3"
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
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-16 text-center">
        <span className="material-symbols-outlined text-6xl text-text-muted mb-4 block">
          menstrual_health
        </span>
        <h1 className="text-headline-md mb-2">
          Bienvenida a EVA
        </h1>
        <p className="text-body-sm text-text-muted mb-6 max-w-xs mx-auto">
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
    currentCycle,
    currentCycleDay,
    predictedCycleLength,
    currentPhase,
    currentPhaseDescription,
    predictedNextDate,
    daysUntilNext,
    avgPeriodDuration,
    durationChartData,
  } = dashboardData;

  return (
    <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
      <div className="mb-10">
        <p className="text-label-md text-primary font-bold uppercase tracking-widest mb-2">
          Estado Actual
        </p>
        <h3 className="text-headline-lg">Buenos días, {displayName}.</h3>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        <PhaseCard
          phase={currentPhase}
          cycleDay={currentCycleDay}
          description={currentPhaseDescription}
          daysUntilNext={daysUntilNext}
          predictedDate={predictedNextDate}
          cycleId={currentCycle?.id ?? null}
        />

        <CycleProgressCard
          cycleDay={currentCycleDay}
          predictedCycleLength={predictedCycleLength}
        />

        <TrendChartCard
          data={durationChartData}
          average={avgPeriodDuration}
        />

        <RecommendationsCard phase={currentPhase} />
      </div>
    </div>
  );
}
