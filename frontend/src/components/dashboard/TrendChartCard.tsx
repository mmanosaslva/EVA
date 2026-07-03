import { useState } from "react";
import type { DurationChartPoint } from "../../lib/dashboardUtils";

const MONTH_NAMES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return MONTH_NAMES[d.getMonth()];
}

interface TrendChartCardProps {
  data: DurationChartPoint[];
  average: number;
}

export function TrendChartCard({ data, average }: TrendChartCardProps) {
  const [metric, setMetric] = useState<"duration" | "intensity">("duration");

  if (data.length === 0) {
    return (
      <div className="col-span-12 lg:col-span-7 bg-white rounded-3xl p-8 border border-border-subtle shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h5 className="text-headline-sm">Tendencia del Ciclo</h5>
            <p className="text-label-md text-text-muted">Últimos meses</p>
          </div>
        </div>
        <p className="text-body-sm text-text-muted text-center py-12">
          Registra al menos un ciclo completo para ver la tendencia.
        </p>
      </div>
    );
  }

  const maxDuration = Math.max(...data.map((d) => d.duration));
  const chartData = data.slice(-6);

  return (
    <div className="col-span-12 lg:col-span-7 bg-white rounded-3xl p-8 border border-border-subtle shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h5 className="text-headline-sm">Tendencia del Ciclo</h5>
          <p className="text-label-md text-text-muted">Últimos {data.length} ciclos</p>
        </div>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as "duration" | "intensity")}
          className="bg-surface-variant border-none rounded-lg text-label-md py-1.5 px-3 focus:ring-primary/20"
        >
          <option value="duration">Duración (Días)</option>
          <option value="intensity">Intensidad</option>
        </select>
      </div>

      <div className="h-64 flex items-end justify-between gap-2 px-4">
        {chartData.map((point, idx) => {
          const heightPct = (point.duration / (maxDuration || 1)) * 100;
          const isCurrent = idx === chartData.length - 1;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div className="relative group flex-1 w-full flex items-end">
                <div
                  className={`w-full rounded-t-xl relative ${
                    isCurrent ? "bg-primary" : "bg-primary-fixed-dim"
                  }`}
                  style={{ height: `${Math.max(4, heightPct)}%` }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-text-main text-white text-label-md px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {point.duration}d
                  </div>
                </div>
              </div>
              <span className="text-label-md text-text-muted">
                {getMonthLabel(point.startDate)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4 mt-6 text-label-md text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary-fixed-dim inline-block" />
          Duración
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />
          Actual
        </span>
        <span>
          Promedio: {average} días
        </span>
      </div>
    </div>
  );
}
