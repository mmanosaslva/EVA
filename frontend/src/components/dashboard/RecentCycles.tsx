import type { Cycle } from "../../lib/types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

interface RecentCyclesProps {
  cycles: Cycle[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

function CycleRow({ cycle, isLast }: { cycle: Cycle; isLast: boolean }) {
  const startStr = formatDate(cycle.start_date);
  const endStr = cycle.end_date
    ? formatDate(cycle.end_date)
    : "presente";
  const isActive = cycle.end_date === null;

  return (
    <div
      className={`flex items-center justify-between py-2.5 ${
        isLast ? "" : "border-b border-border"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-2 w-2 rounded-full ${
            isActive ? "bg-eva-400" : "bg-gray-300"
          }`}
        />
        <span className="text-sm text-text-primary">
          {startStr} — {endStr}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">
          {cycle.duration_days > 0
            ? `${cycle.duration_days} días`
            : "En curso"}
        </span>
        <Badge variant={isActive ? "folicular" : "default"}>
          {isActive ? "Activo" : "Completado"}
        </Badge>
      </div>
    </div>
  );
}

export function RecentCycles({ cycles }: RecentCyclesProps) {
  if (cycles.length === 0) return null;

  return (
    <Card padding="sm">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Últimos ciclos
      </h3>
      <div>
        {cycles.map((cycle, idx) => (
          <CycleRow
            key={cycle.id}
            cycle={cycle}
            isLast={idx === cycles.length - 1}
          />
        ))}
      </div>
    </Card>
  );
}
