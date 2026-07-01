import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  getMockSymptomStats,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from "../../lib/symptomAnalytics";
import type { SymptomStat } from "../../lib/symptomAnalytics";
import { Card } from "../ui/Card";

interface SymptomFrequencyChartProps {
  totalCycles: number;
}

type PeriodKey = "3" | "6" | "hist";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "3", label: "Últimos 3" },
  { key: "6", label: "Últimos 6" },
  { key: "hist", label: "Histórico" },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: {
    payload: SymptomStat;
    value: number;
  }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload[0]) return null;

  const { name, category, avgIntensity, cycleCount } =
    payload[0].payload;
  const catLabel = CATEGORY_LABELS[category] ?? category;

  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-text-primary">
        {name}
        <span className="ml-1 font-normal text-text-muted">
          ({catLabel})
        </span>
      </p>
      <p className="text-text-secondary mt-0.5">
        Apareció en {cycleCount} ciclos
      </p>
      <p className="text-text-secondary">
        Intensidad promedio: {avgIntensity.toFixed(1)}/5
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <Card padding="sm">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Síntomas más frecuentes
      </h3>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-3xl mb-2">📊</p>
        <p className="text-sm text-text-secondary max-w-xs">
          Necesitas al menos 3 ciclos registrados para ver tus síntomas más
          frecuentes.
        </p>
      </div>
    </Card>
  );
}

export function SymptomFrequencyChart({
  totalCycles,
}: SymptomFrequencyChartProps) {
  const [period, setPeriod] = useState<PeriodKey>("3");

  const stats = useMemo(
    () => getMockSymptomStats(totalCycles),
    [totalCycles],
  );

  if (stats.length === 0) return <EmptyState />;

  const shown = stats.slice(0, 5);

  return (
    <Card padding="sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Síntomas más frecuentes
        </h3>

        <div className="flex rounded-lg border border-border overflow-hidden">
          {PERIOD_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                period === key
                  ? "bg-eva-500 text-white"
                  : "bg-white text-text-secondary hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={shown}
            layout="vertical"
            margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
            barSize={16}
          >
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              stroke="#e5e4e7"
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#6b6375" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e4e7" }}
              unit="%"
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "#6b6375" }}
              tickLine={false}
              axisLine={false}
              width={110}
            />
            <Tooltip content={<CustomTooltip />} />

            <Bar dataKey="frequency" radius={[0, 4, 4, 0]}>
              {shown.map((entry) => (
                <Cell
                  key={entry.symptomId}
                  fill={CATEGORY_COLORS[entry.category] ?? "#6b7280"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-text-muted">
        {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>)
          .filter((cat) => cat !== "otra")
          .map((cat) => (
            <span key={cat} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full inline-block"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              />
              {CATEGORY_LABELS[cat]}
            </span>
          ))}
      </div>
    </Card>
  );
}
