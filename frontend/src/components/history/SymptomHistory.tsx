import type { DailyLog, Cycle } from "../../lib/types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { HistoryDay } from "./HistoryDay";

interface SymptomHistoryProps {
  cycle: Cycle | null;
  logs: DailyLog[];
  loading: boolean;
  error: string | null;
  onPrevCycle: () => void;
  onNextCycle: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onRegisterDay: () => void;
  onBack: () => void;
}

export function SymptomHistory({
  cycle,
  logs,
  loading,
  error,
  onPrevCycle,
  onNextCycle,
  hasPrev,
  hasNext,
  onRegisterDay,
  onBack,
}: SymptomHistoryProps) {
  return (
    <div>
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 flex items-center gap-1 text-sm text-eva-600 hover:text-eva-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Volver al calendario
        </button>
        <h1 className="text-2xl font-bold text-text-primary">
          Historial de síntomas
        </h1>
      </div>

      {cycle && (
        <Card padding="md" className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide">
                Ciclo
              </p>
              <p className="text-sm font-medium text-text-primary">
                {new Date(cycle.start_date + "T12:00:00").toLocaleDateString(
                  "es-ES",
                  { day: "numeric", month: "long", year: "numeric" },
                )}
                {cycle.end_date && (
                  <>
                    {" — "}
                    {new Date(cycle.end_date + "T12:00:00").toLocaleDateString(
                      "es-ES",
                      { day: "numeric", month: "long" },
                    )}
                  </>
                )}
              </p>
            </div>
            {cycle.duration_days > 0 && (
              <Badge variant="default">{cycle.duration_days} días</Badge>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="ghost"
              onClick={onPrevCycle}
              disabled={!hasPrev}
              className="flex-1 text-sm"
            >
              ← Anterior
            </Button>
            <Button
              variant="ghost"
              onClick={onNextCycle}
              disabled={!hasNext}
              className="flex-1 text-sm"
            >
              Siguiente →
            </Button>
          </div>
        </Card>
      )}

      {error && (
        <Card padding="md" className="mb-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {loading ? (
        <Card padding="lg">
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-eva-300 border-t-eva-600" />
          </div>
        </Card>
      ) : logs.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-sm font-medium text-text-primary">
            Sin registros en este ciclo
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Registra tus síntomas cada día para ver tu historial aquí.
          </p>
          <Button
            variant="primary"
            className="mt-4 text-sm"
            onClick={onRegisterDay}
          >
            Registrar primer día
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <HistoryDay key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
