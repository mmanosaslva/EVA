import type { CycleResponse, DailyLogResponse, SymptomLogEntry } from "../../lib/types";
import { getCyclePhase, PHASE_LABELS } from "../../lib/cycleUtils";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface SymptomHistoryProps {
  logs: DailyLogResponse[];
  loading: boolean;
  error: string | null;
  cycle: CycleResponse | undefined;
  nextCycleStartDate: string | null;
  onRegister: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  fisica: "💪",
  emocional: "😔",
  digestiva: "🌿",
  otra: "📋",
};

const CATEGORY_COLORS: Record<string, string> = {
  fisica: "bg-red-100 text-red-700",
  emocional: "bg-lavender-100 text-lavender-700",
  digestiva: "bg-green-100 text-green-700",
  otra: "bg-gray-100 text-gray-700",
};

const FLOW_DISPLAY: Record<string, { label: string; color: string; bar: string }> = {
  none: { label: "Sin flujo", color: "text-gray-400", bar: "bg-gray-200" },
  light: { label: "Flujo leve", color: "text-blue-500", bar: "bg-blue-300" },
  medium: { label: "Flujo medio", color: "text-blue-600", bar: "bg-blue-400" },
  heavy: { label: "Flujo abundante", color: "text-red-500", bar: "bg-red-400" },
};

function formatDay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function IntensityBar({ value }: { value: number }) {
  const pct = (value / 5) * 100;
  const barColor =
    value <= 2
      ? "bg-green-400"
      : value === 3
        ? "bg-amber-400"
        : value === 4
          ? "bg-orange-400"
          : "bg-red-400";

  return (
    <div className="flex items-center gap-2 mt-0.5">
      <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-text-secondary w-4 text-right">
        {value}
      </span>
    </div>
  );
}

function SymptomRow({ symptom }: { symptom: SymptomLogEntry }) {
  const icon = CATEGORY_ICONS[symptom.category] ?? CATEGORY_ICONS.otra;
  const colorClasses =
    CATEGORY_COLORS[symptom.category] ?? CATEGORY_COLORS.otra;

  return (
    <li className="py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs" aria-hidden="true">
          {icon}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0 text-[11px] font-medium ${colorClasses}`}
        >
          {symptom.name}
        </span>
      </div>
      <div className="ml-6">
        <IntensityBar value={symptom.intensity} />
      </div>
    </li>
  );
}

function FlowIndicator({ flowLevel }: { flowLevel: string }) {
  const info = FLOW_DISPLAY[flowLevel] ?? FLOW_DISPLAY.none;

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        <span className={`h-1.5 w-4 rounded-sm ${flowLevel === "none" ? "bg-gray-100" : info.bar}`} />
        <span
          className={`h-1.5 w-4 rounded-sm ${
            flowLevel === "medium" || flowLevel === "heavy" ? info.bar : "bg-gray-100"
          }`}
        />
        <span
          className={`h-1.5 w-4 rounded-sm ${
            flowLevel === "heavy" ? info.bar : "bg-gray-100"
          }`}
        />
      </div>
      <span className={`text-xs font-medium ${info.color}`}>{info.label}</span>
    </div>
  );
}

function DayCard({
  log,
  cycle,
  nextCycleStartDate,
}: {
  log: DailyLogResponse;
  cycle: CycleResponse | undefined;
  nextCycleStartDate: string | null;
}) {
  const logDate = new Date(log.date);
  logDate.setHours(12, 0, 0, 0);

  let phaseLabel: string | null = null;
  if (cycle) {
    const phase = getCyclePhase(logDate, cycle, nextCycleStartDate ? new Date(nextCycleStartDate) : null);
    phaseLabel = PHASE_LABELS[phase];
  }

  return (
    <Card padding="sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-text-primary capitalize">
            {formatDay(log.date)}
          </h3>
          {phaseLabel && (
            <div className="mt-1">
              <Badge variant={cycle ? getCyclePhase(logDate, cycle, nextCycleStartDate ? new Date(nextCycleStartDate) : null) : "default"}>
                {phaseLabel}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <FlowIndicator flowLevel={log.flow_level ?? "none"} />
        </div>
      </div>

      {log.symptoms.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <ul className="space-y-1">
            {log.symptoms.map((s) => (
              <SymptomRow key={`${s.symptom_id}-${log.id}`} symptom={s} />
            ))}
          </ul>
        </div>
      )}

      {log.temperature !== null && log.temperature !== undefined && (
        <div className="mt-2 text-xs text-text-secondary">
          Temperatura basal:{" "}
          <span className="font-medium text-text-primary">
            {log.temperature}°C
          </span>
        </div>
      )}

      {log.notes && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-text-muted italic leading-relaxed">
            {log.notes}
          </p>
        </div>
      )}
    </Card>
  );
}

function EmptyState({ onRegister }: { onRegister: () => void }) {
  return (
    <Card padding="lg">
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-4xl mb-3">📋</p>
        <h3 className="text-base font-semibold text-text-primary mb-1">
          Sin registros en este ciclo
        </h3>
        <p className="text-sm text-text-secondary mb-5 max-w-xs">
          Aún no has registrado síntomas para este ciclo. Haz clic en el botón
          para comenzar tu primer registro diario.
        </p>
        <Button variant="primary" onClick={onRegister}>
          Ir a Registrar
        </Button>
      </div>
    </Card>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card padding="md" className="border-red-200 bg-red-50">
      <p className="text-sm text-red-600 text-center">{message}</p>
    </Card>
  );
}

function LoadingState() {
  return (
    <Card padding="lg">
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-eva-300 border-t-eva-600" />
      </div>
    </Card>
  );
}

export function SymptomHistory({
  logs,
  loading,
  error,
  cycle,
  nextCycleStartDate,
  onRegister,
}: SymptomHistoryProps) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (logs.length === 0) return <EmptyState onRegister={onRegister} />;

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return (
    <div className="space-y-3">
      {sortedLogs.map((log) => (
        <DayCard
          key={log.id}
          log={log}
          cycle={cycle}
          nextCycleStartDate={nextCycleStartDate}
        />
      ))}
    </div>
  );
}
