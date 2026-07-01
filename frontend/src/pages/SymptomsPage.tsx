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
        <p className="text-5xl mb-4">📅</p>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Sin ciclo para esta fecha
        </h2>
        <p className="text-sm text-text-secondary mb-6">
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
          <h1 className="text-2xl font-bold text-text-primary">
            Síntomas
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Registra cómo te sientes cada día de tu ciclo.
          </p>
        </div>
        <button
          type="button"
          onClick={handleFormCancel}
          className="text-text-muted hover:text-text-secondary transition-colors p-1"
          aria-label="Volver al calendario"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("registrar")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "registrar"
              ? "border-eva-500 text-eva-600"
              : "border-transparent text-text-muted hover:text-text-secondary"
          }`}
        >
          Registrar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("historial")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "historial"
              ? "border-eva-500 text-eva-600"
              : "border-transparent text-text-muted hover:text-text-secondary"
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
              className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Ciclo anterior"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="text-center">
              <span className="text-sm font-medium text-text-primary">
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
              className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Ciclo siguiente"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
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
