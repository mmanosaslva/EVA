import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useCycles } from "../hooks/useCycles";
import { useDailyLogs } from "../hooks/useDailyLogs";
import { SymptomForm } from "../components/symptoms/SymptomForm";
import { SymptomHistory } from "../components/symptoms/SymptomHistory";
import { Button } from "../components/ui/Button";

type TabId = "registrar" | "historial";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export default function SymptomsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const dateParam = searchParams.get("date") ?? todayStr();
  const cycleIdParam = searchParams.get("cycleId");
  const tabParam = searchParams.get("tab") as TabId | null;

  const { cycles } = useCycles();
  const [activeTab, setActiveTab] = useState<TabId>(tabParam ?? "registrar");

  const foundCycle = cycleIdParam
    ? cycles.find((c) => c.id === cycleIdParam)
    : cycles.find((c) => {
        const d = new Date(dateParam);
        d.setHours(0, 0, 0, 0);
        const start = new Date(c.start_date);
        start.setHours(0, 0, 0, 0);
        if (d < start) return false;
        if (c.end_date) {
          const end = new Date(c.end_date);
          end.setHours(23, 59, 59, 999);
          return d <= end;
        }
        const estimatedEnd = new Date(start.getTime() + 33 * 86400000);
        return d <= estimatedEnd;
      });

  const cycleId = foundCycle?.id;

  const cycleIndex = cycleId
    ? cycles.findIndex((c) => c.id === cycleId)
    : -1;

  const cyclesSortedAsc = useMemo(
    () =>
      [...cycles].sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
      ),
    [cycles],
  );

  const nextCycleStartDate = useMemo(() => {
    if (!foundCycle) return null;
    const currentIdx = cyclesSortedAsc.findIndex(
      (c) => c.id === foundCycle.id,
    );
    const next = cyclesSortedAsc[currentIdx + 1];
    return next ? next.start_date : null;
  }, [cyclesSortedAsc, foundCycle]);

  const {
    logs,
    loading: logsLoading,
    error: logsError,
  } = useDailyLogs(cycleId ?? "");

  const handleFormSuccess = () => {
    setTimeout(() => {
      navigate("/calendar", { replace: true });
    }, 1200);
  };

  const handleFormCancel = () => {
    navigate("/calendar", { replace: true });
  };

  const handleNavigateCycle = (direction: "prev" | "next") => {
    if (cycleIndex === -1) return;
    const newIndex =
      direction === "prev"
        ? Math.min(cycleIndex + 1, cycles.length - 1)
        : Math.max(cycleIndex - 1, 0);
    const targetCycle = cycles[newIndex];
    if (targetCycle) {
      navigate(
        `/symptoms?date=${dateParam}&cycleId=${targetCycle.id}&tab=${activeTab}`,
      );
    }
  };

  if (!cycleId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <span className="material-symbols-outlined text-6xl text-text-muted mb-4 block">
          calendar_today
        </span>
        <h2 className="text-headline-sm mb-2">
          Sin ciclo para esta fecha
        </h2>
        <p className="text-body-sm text-text-muted mb-6">
          Registra un ciclo primero desde el calendario para poder añadir síntomas.
        </p>
        <Button onClick={() => navigate("/calendar")}>Ir al calendario</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-headline-md">Síntomas</h1>
          <p className="mt-1 text-body-sm text-text-muted">
            Registra cómo te sientes cada día de tu ciclo.
          </p>
        </div>
        <button
          type="button"
          onClick={handleFormCancel}
          className="text-text-muted hover:text-primary transition-colors p-1"
          aria-label="Volver al calendario"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("registrar")}
          className={`px-4 py-2.5 text-label-md font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "registrar"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-primary"
          }`}
        >
          Registrar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("historial")}
          className={`px-4 py-2.5 text-label-md font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "historial"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-primary"
          }`}
        >
          Historial
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "registrar" && (
        <SymptomForm
          date={dateParam}
          cycleId={cycleId}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {activeTab === "historial" && (
        <div className="space-y-4">
          {/* Cycle navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleNavigateCycle("next")}
              disabled={cycleIndex <= 0}
              className="p-1.5 rounded-lg text-text-muted hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Ciclo anterior"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>

            <div className="text-center">
              <span className="text-body-sm font-medium">
                Ciclo {cycles.length - cycleIndex} de {cycles.length}
              </span>
              <p className="text-xs text-text-muted mt-0.5">
                {foundCycle?.start_date
                  ? new Date(foundCycle.start_date).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                    })
                  : ""}
                {foundCycle?.end_date
                  ? ` — ${new Date(foundCycle.end_date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`
                  : " — presente"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleNavigateCycle("prev")}
              disabled={cycleIndex >= cycles.length - 1}
              className="p-1.5 rounded-lg text-text-muted hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Ciclo siguiente"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          <SymptomHistory
            logs={logs}
            loading={logsLoading}
            error={logsError}
            cycle={foundCycle}
            nextCycleStartDate={nextCycleStartDate}
            onRegister={() => setActiveTab("registrar")}
          />
        </div>
      )}
    </div>
  );
}
