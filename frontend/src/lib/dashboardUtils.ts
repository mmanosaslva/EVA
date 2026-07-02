import type { CycleResponse, CyclePhase } from "./types";
import { getCyclePhase } from "./cycleUtils";

export interface DashboardData {
  avgCycleDuration: number;
  avgPeriodDuration: number;
  totalCycles: number;
  currentCycle: CycleResponse | null;
  currentCycleDay: number;
  predictedCycleLength: number;
  currentPhase: CyclePhase | null;
  currentPhaseLabel: string;
  currentPhaseDescription: string;
  predictedNextDate: string;
  daysUntilNext: number;
  confidenceEarly: string;
  confidenceLate: string;
  cycleVariability: number;
  fertileStart: string;
  fertileEnd: string;
  predictionSource: "heuristic" | "prophet";
  modelMaeDays: number | null;
  cyclesUsedForTraining: number | null;
  pastCycles: CycleResponse[];
  durationChartData: DurationChartPoint[];
}

export interface DurationChartPoint {
  cycleNumber: number;
  duration: number;
  startDate: string;
}

const PHASE_DESCRIPTIONS: Record<CyclePhase, string> = {
  menstruacion: "Tu cuerpo está liberando el revestimiento uterino. Es un buen momento para descansar.",
  folicular: "Tus niveles de estrógeno están aumentando. Te sentirás con más energía.",
  ovulacion: "Estás en tu ventana fértil. Podrías notar mayor libido y energía.",
  lutea: "La progesterona aumenta. Pueden aparecer síntomas premenstruales.",
};

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  da.setHours(0, 0, 0, 0);
  db.setHours(0, 0, 0, 0);
  return Math.floor((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeDashboardData(cycles: CycleResponse[]): DashboardData {
  const sorted = [...cycles].sort(
    (a, b) =>
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
  );

  const completed = sorted.filter((c) => c.end_date !== null);
  const current = sorted.find((c) => c.end_date === null) ?? null;

  const durations = completed.map((c) =>
    daysBetween(c.start_date, c.end_date!),
  );
  const avgPeriodDuration =
    durations.length > 0
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : 0;

  // Cycle-to-cycle durations (start → start)
  const cycleDurations: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    cycleDurations.push(daysBetween(sorted[i - 1].start_date, sorted[i].start_date));
  }

  const avgCycleDuration =
    cycleDurations.length > 0
      ? Math.round(
          cycleDurations.reduce((s, d) => s + d, 0) / cycleDurations.length,
        )
      : 28;

  const predictedCycleLength = avgCycleDuration;

  let cycleVariability = 3;
  if (cycleDurations.length >= 2) {
    const mean =
      cycleDurations.reduce((s, d) => s + d, 0) / cycleDurations.length;
    const variance =
      cycleDurations.reduce((s, d) => s + Math.pow(d - mean, 2), 0) /
      cycleDurations.length;
    cycleVariability = Math.max(1, Math.round(Math.sqrt(variance)));
  }

  const currentCycleDay = current
    ? daysBetween(current.start_date, new Date().toISOString().split("T")[0]) + 1
    : 0;

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let currentPhase: CyclePhase | null = null;
  let currentPhaseLabel = "Sin ciclo activo";
  let currentPhaseDescription = "";

  if (current && sorted.length >= 1) {
    const currentIdx = sorted.findIndex((c) => c.id === current.id);
    const nextCycle = sorted[currentIdx + 1] ?? null;
    const nextCycleStart = nextCycle ? new Date(nextCycle.start_date) : null;
    if (nextCycleStart) nextCycleStart.setHours(12, 0, 0, 0);

    currentPhase = getCyclePhase(today, current, nextCycleStart);
    currentPhaseLabel =
      currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1);
    currentPhaseDescription =
      PHASE_DESCRIPTIONS[currentPhase] ?? "";
  }

  // Predicted next period (heuristic)
  const lastStart = sorted[sorted.length - 1].start_date;
  const lastStartDate = new Date(lastStart);
  lastStartDate.setHours(0, 0, 0, 0);
  const predictedDate = new Date(
    lastStartDate.getTime() + avgCycleDuration * 86400000,
  );
  const predictedNextDate = predictedDate.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];
  const daysUntilNext = Math.max(0, daysBetween(todayStr, predictedNextDate));

  const earlyDate = new Date(
    predictedDate.getTime() - cycleVariability * 86400000,
  );
  const lateDate = new Date(
    predictedDate.getTime() + cycleVariability * 86400000,
  );
  const confidenceEarly = earlyDate.toISOString().split("T")[0];
  const confidenceLate = lateDate.toISOString().split("T")[0];

  const fertileStart = new Date(
    predictedDate.getTime() - 16 * 86400000,
  )
    .toISOString()
    .split("T")[0];
  const fertileEnd = new Date(
    predictedDate.getTime() - 12 * 86400000,
  )
    .toISOString()
    .split("T")[0];

  const predictionSource: "heuristic" | "prophet" = completed.length >= 3 ? "heuristic" : "heuristic";
  const modelMaeDays: number | null = null;
  const cyclesUsedForTraining: number | null = completed.length >= 3 ? completed.length : null;

  const pastCycles = completed.slice(-3).reverse();

  const durationChartData: DurationChartPoint[] = sorted
    .filter((c) => c.end_date !== null)
    .map((c, idx) => ({
      cycleNumber: idx + 1,
      duration: daysBetween(c.start_date, c.end_date!),
      startDate: c.start_date,
    }));

  return {
    avgCycleDuration,
    avgPeriodDuration,
    totalCycles: sorted.length,
    currentCycle: current,
    currentCycleDay,
    predictedCycleLength,
    currentPhase,
    currentPhaseLabel,
    currentPhaseDescription,
    predictedNextDate,
    daysUntilNext,
    confidenceEarly,
    confidenceLate,
    cycleVariability,
    fertileStart,
    fertileEnd,
    predictionSource,
    modelMaeDays,
    cyclesUsedForTraining,
    pastCycles,
    durationChartData,
  };
}
