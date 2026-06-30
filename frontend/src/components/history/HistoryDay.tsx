import type { DailyLog } from "../../lib/types";
import { Card } from "../ui/Card";
import { SymptomBar } from "./SymptomBar";

interface HistoryDayProps {
  log: DailyLog;
}

const FLOW_LABELS: Record<string, string> = {
  none: "Sin flujo",
  light: "Flujo leve",
  medium: "Flujo medio",
  heavy: "Flujo abundante",
};

const FLOW_DOT: Record<string, string> = {
  none: "bg-gray-200",
  light: "bg-red-200",
  medium: "bg-red-400",
  heavy: "bg-red-600",
};

const CATEGORY_ICONS: Record<string, string> = {
  fisica: "💪",
  emocional: "😔",
  digestiva: "🌿",
};

const CATEGORY_TEXT_COLOR: Record<string, string> = {
  fisica: "text-red-600",
  emocional: "text-lavender-600",
  digestiva: "text-green-600",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function HistoryDay({ log }: HistoryDayProps) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary capitalize">
          {formatDate(log.date)}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${FLOW_DOT[log.flow_level]}`} />
          <span className="text-xs text-text-muted">
            {FLOW_LABELS[log.flow_level]}
          </span>
        </div>
      </div>

      {log.symptoms.length > 0 && (
        <div className="space-y-2.5">
          {log.symptoms.map((s) => (
            <div key={s.symptom_id} className="flex items-center gap-2">
              <span className="w-5 text-center text-xs">
                {CATEGORY_ICONS[s.category]}
              </span>
              <span
                className={`w-32 shrink-0 text-xs font-medium ${CATEGORY_TEXT_COLOR[s.category]}`}
              >
                {s.name}
              </span>
              <SymptomBar value={s.intensity} className="flex-1" />
              <span className="w-4 text-center text-xs text-text-muted">
                {s.intensity}
              </span>
            </div>
          ))}
        </div>
      )}

      {log.temperature && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-text-muted">
            Temperatura basal:{" "}
            <span className="font-medium text-text-primary">
              {log.temperature}°C
            </span>
          </p>
        </div>
      )}

      {log.notes && (
        <div className={`${log.symptoms.length > 0 || log.temperature ? "mt-3 pt-3 border-t border-border" : "mt-3"}`}>
          <p className="text-xs text-text-muted italic">{log.notes}</p>
        </div>
      )}
    </Card>
  );
}
