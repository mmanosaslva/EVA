import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DurationChartPoint } from "../../lib/dashboardUtils";
import { Card } from "../ui/Card";

interface CycleDurationChartProps {
  data: DurationChartPoint[];
  average: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: {
    payload: DurationChartPoint;
  }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload[0]) return null;

  const { cycleNumber, duration, startDate } = payload[0].payload;
  const formatedDate = new Date(startDate).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-text-primary">
        Ciclo #{cycleNumber}
      </p>
      <p className="text-text-secondary mt-0.5">
        {duration} días · {formatedDate}
      </p>
    </div>
  );
}

export function CycleDurationChart({
  data,
  average,
}: CycleDurationChartProps) {
  if (data.length === 0) {
    return (
      <Card padding="sm">
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Duración de tus ciclos
        </h3>
        <p className="text-xs text-text-muted text-center py-8">
          Registra al menos un ciclo completo para ver el gráfico.
        </p>
      </Card>
    );
  }

  const zoneLow = average - 3;
  const zoneHigh = average + 3;
  const yMin = Math.max(0, Math.min(...data.map((d) => d.duration)) - 2);
  const yMax = Math.max(...data.map((d) => d.duration)) + 4;

  return (
    <Card padding="sm">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Duración de tus ciclos
      </h3>
      <div className="w-full" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e4e7" />
            <XAxis
              dataKey="cycleNumber"
              tick={{ fontSize: 12, fill: "#6b6375" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e4e7" }}
              label={{
                value: "Ciclo #",
                position: "insideBottom",
                offset: -4,
                fontSize: 11,
                fill: "#9ca3af",
              }}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 12, fill: "#6b6375" }}
              tickLine={false}
              axisLine={false}
              width={30}
              label={{
                value: "Días",
                position: "insideLeft",
                angle: -90,
                offset: 10,
                fontSize: 11,
                fill: "#9ca3af",
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 12 }}
            />

            <ReferenceArea
              y1={zoneLow}
              y2={zoneHigh}
              fill="#ec4899"
              fillOpacity={0.06}
              stroke="none"
            />

            <ReferenceLine
              y={average}
              stroke="#ec4899"
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />

            <Line
              type="monotone"
              dataKey="duration"
              name="Duración"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{
                r: 4,
                fill: "#8b5cf6",
                stroke: "#fff",
                strokeWidth: 2,
              }}
              activeDot={{ r: 6, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-lavender-500 inline-block" />
          Duración (días)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-eva-500 inline-block [border:none]" />
          Promedio ({average} días)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 bg-eva-500/10 rounded-sm inline-block" />
          ±3 días
        </span>
      </div>
    </Card>
  );
}
