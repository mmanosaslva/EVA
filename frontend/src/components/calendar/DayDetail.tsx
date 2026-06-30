import type { CalendarDay } from "../../lib/types";
import { PHASE_LABELS } from "../../lib/cycleUtils";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface DayDetailProps {
  day: CalendarDay | null;
  onClose: () => void;
  onEditCycle?: (cycleId: string) => void;
  onRegisterDay?: (date: string, cycleId: string) => void;
  onViewHistory?: (cycleId: string) => void;
}

export function DayDetail({
  day,
  onClose,
  onEditCycle,
  onRegisterDay,
  onViewHistory,
}: DayDetailProps) {
  if (!day) return null;

  const formattedDate = day.date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Card padding="md" className="mx-1 mt-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-text-primary capitalize">
            {formattedDate}
          </h3>
          {day.phase ? (
            <Badge variant={day.phase} className="mt-1">
              {PHASE_LABELS[day.phase]}
            </Badge>
          ) : (
            <span className="text-sm text-text-muted">
              Sin ciclo registrado
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:text-text-secondary transition-colors"
          aria-label="Cerrar detalle"
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
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {day.dailyLog ? (
        <div className="mt-3 space-y-2 text-sm text-text-secondary">
          {day.dailyLog.flow_level && day.dailyLog.flow_level !== "none" && (
            <p>
              Flujo:{" "}
              <span className="font-medium text-text-primary">
                {
                  {
                    light: "Leve",
                    medium: "Medio",
                    heavy: "Abundante",
                  }[day.dailyLog.flow_level]
                }
              </span>
            </p>
          )}
          {day.dailyLog.temperature && (
            <p>
              Temperatura:{" "}
              <span className="font-medium text-text-primary">
                {day.dailyLog.temperature}°C
              </span>
            </p>
          )}
          {day.dailyLog.symptoms.length > 0 && (
            <div>
              <p className="mb-1">Síntomas:</p>
              <div className="flex flex-wrap gap-1">
                {day.dailyLog.symptoms.map((s) => (
                  <span
                    key={s.symptom_id}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-text-secondary"
                  >
                    {s.name} · {s.intensity}/5
                  </span>
                ))}
              </div>
            </div>
          )}
          {day.dailyLog.notes && (
            <p className="italic text-text-muted">{day.dailyLog.notes}</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-text-muted">
          No hay registro para este día.
        </p>
      )}

      {day.cycleId && (
        <div className="mt-4 pt-3 border-t border-border space-y-2">
          {onRegisterDay && (
            <Button
              variant="primary"
              className="w-full text-sm"
              onClick={() =>
                onRegisterDay(
                  day.date.toISOString().split("T")[0],
                  day.cycleId!,
                )
              }
            >
              {day.dailyLog ? "Editar registro del día" : "Registrar síntomas"}
            </Button>
          )}
          {onViewHistory && (
            <Button
              variant="secondary"
              className="w-full text-sm"
              onClick={() => onViewHistory(day.cycleId!)}
            >
              Ver historial del ciclo
            </Button>
          )}
          {onEditCycle && (
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => onEditCycle(day.cycleId!)}
            >
              Editar este ciclo
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
