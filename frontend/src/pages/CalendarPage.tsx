import { useState, useCallback, useMemo } from "react";
import { useCycles } from "../hooks/useCycles";
import { computeDashboardData } from "../lib/dashboardUtils";
import { Calendar } from "../components/calendar/Calendar";
import { CyclePhasePanel } from "../components/calendar/CyclePhasePanel";
import { UpcomingEventsPanel } from "../components/calendar/UpcomingEventsPanel";
import { PhaseLegend } from "../components/calendar/PhaseLegend";
import { DayDetailsCard } from "../components/calendar/DayDetailsCard";
import { CycleForm } from "../components/cycle/CycleForm";
import { Card } from "../components/ui/Card";

export default function CalendarPage() {
  const { cycles, loading, error, refetch } = useCycles();
  const [showForm, setShowForm] = useState(false);
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);

  const dashboardData = useMemo(
    () => (cycles.length > 0 ? computeDashboardData(cycles) : null),
    [cycles],
  );

  const editingCycle = editingCycleId
    ? cycles.find((c) => c.id === editingCycleId)
    : null;

  const handleNewCycle = useCallback(() => {
    setEditingCycleId(null);
    setShowForm(true);
  }, []);

  const handleEditCycle = useCallback((cycleId: string) => {
    setEditingCycleId(cycleId);
    setShowForm(true);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    setEditingCycleId(null);
    refetch();
  }, [refetch]);

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
    setEditingCycleId(null);
  }, []);

  return (
    <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-8">
      {error && (
        <Card padding="md" className="mb-4 border-error/20 bg-error-container/30">
          <p className="text-body-sm text-on-error-container">{error}</p>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-fixed-dim border-t-primary" />
        </div>
      ) : showForm ? (
        <div className="max-w-lg mx-auto">
          <CycleForm
            initialData={
              editingCycle
                ? {
                    id: editingCycle.id,
                    start_date: editingCycle.start_date,
                    end_date: editingCycle.end_date,
                  }
                : undefined
            }
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
            <div>
              <h3 className="text-headline-lg mb-2">Calendario de Ciclo</h3>
              <p className="text-body-md text-text-muted">
                Visualiza tu ciclo actual y el historial de ciclos anteriores.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewCycle}
                className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full text-label-md font-bold transition-all hover:opacity-90 active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined">add</span>
                Nuevo Ciclo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            <div className="lg:col-span-8 bg-surface border border-border-subtle rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <Calendar cycles={cycles} onEditCycle={handleEditCycle} />
            </div>

            <div className="lg:col-span-4 space-y-gutter">
              {dashboardData && (
                <>
                  <CyclePhasePanel
                    phase={dashboardData.currentPhase}
                    cycleDay={dashboardData.currentCycleDay}
                    predictedCycleLength={dashboardData.predictedCycleLength}
                  />

                  <UpcomingEventsPanel
                    daysUntilNext={dashboardData.daysUntilNext}
                    predictedDate={dashboardData.predictedNextDate}
                    fertileStart={dashboardData.fertileStart}
                    fertileEnd={dashboardData.fertileEnd}
                    totalCycles={dashboardData.totalCycles}
                  />
                </>
              )}

              <div className="bg-primary-container p-6 rounded-3xl text-on-primary-container relative overflow-hidden shadow-md">
                <div className="relative z-10">
                  <h4 className="text-headline-sm mb-2">Seguimiento de Síntomas</h4>
                  <p className="text-body-sm opacity-90 mb-4">
                    No has registrado síntomas hoy. ¿Cómo te sientes?
                  </p>
                  <button
                    onClick={() => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      const cycleId = dashboardData?.currentCycle?.id;
                      window.location.href = `/symptoms?date=${todayStr}${cycleId ? `&cycleId=${cycleId}` : ""}`;
                    }}
                    className="bg-surface text-primary px-4 py-2 rounded-full text-label-md font-bold shadow-sm active:scale-95 transition-transform"
                  >
                    Registrar ahora
                  </button>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <span
                    className="material-symbols-outlined text-[64px]"
                    style={{ fontVariationSettings: "'wght' 200" }}
                  >
                    psychology
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <PhaseLegend />
          </div>

          {dashboardData && (
            <DayDetailsCard
              phase={dashboardData.currentPhase}
              cycleDay={dashboardData.currentCycleDay}
              cycleId={dashboardData.currentCycle?.id ?? null}
            />
          )}

          <button
            onClick={handleNewCycle}
            className="md:hidden fixed right-6 bottom-24 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50"
            aria-label="Nuevo ciclo"
          >
            <span className="material-symbols-outlined text-2xl">add</span>
          </button>
        </>
      )}
    </div>
  );
}
