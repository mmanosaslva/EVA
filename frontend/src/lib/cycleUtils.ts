import type { Cycle, CalendarDay, CyclePhase } from "./types";

export function getCyclePhase(
  date: Date,
  cycle: Cycle,
  nextCycleStart: Date | null,
): CyclePhase {
  const start = new Date(cycle.start_date);
  start.setHours(0, 0, 0, 0);
  const dayOfCycle =
    Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const periodEnd = cycle.end_date
    ? new Date(cycle.end_date)
    : new Date(start.getTime() + 4 * 86400000);
  periodEnd.setHours(0, 0, 0, 0);
  const periodEndDay =
    Math.floor((periodEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
    1;

  if (dayOfCycle <= periodEndDay) return "menstruacion";

  const cycleLength = nextCycleStart
    ? Math.floor(
        (nextCycleStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      )
    : 28;

  const ovulationDay = cycleLength - 14;

  if (dayOfCycle >= ovulationDay - 1 && dayOfCycle <= ovulationDay + 1) {
    return "ovulacion";
  }
  if (dayOfCycle < ovulationDay) return "folicular";
  return "lutea";
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function buildCalendarDays(
  year: number,
  month: number,
  cycles: Cycle[],
): CalendarDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const sorted = [...cycles].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
  );

  const days: CalendarDay[] = [];

  // Previous month filler days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    d.setHours(0, 0, 0, 0);
    const phase = findPhaseForDate(d, sorted);
    days.push({
      date: d,
      dayOfMonth: d.getDate(),
      isCurrentMonth: false,
      isToday: isSameDay(d, today),
      phase: phase.phase,
      cycleId: phase.cycleId,
      dailyLog: null,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    d.setHours(0, 0, 0, 0);
    const phase = findPhaseForDate(d, sorted);
    days.push({
      date: d,
      dayOfMonth: i,
      isCurrentMonth: true,
      isToday: isSameDay(d, today),
      phase: phase.phase,
      cycleId: phase.cycleId,
      dailyLog: null,
    });
  }

  // Next month filler days
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      d.setHours(0, 0, 0, 0);
      const phase = findPhaseForDate(d, sorted);
      days.push({
        date: d,
        dayOfMonth: d.getDate(),
        isCurrentMonth: false,
        isToday: isSameDay(d, today),
        phase: phase.phase,
        cycleId: phase.cycleId,
        dailyLog: null,
      });
    }
  }

  return days;
}

function findPhaseForDate(
  date: Date,
  sortedCycles: Cycle[],
): { phase: CyclePhase | null; cycleId: string | null } {
  for (let i = 0; i < sortedCycles.length; i++) {
    const cycle = sortedCycles[i];
    const start = new Date(cycle.start_date);
    start.setHours(0, 0, 0, 0);

    if (date < start) continue;

    const nextCycle = sortedCycles[i + 1] ?? null;
    const nextCycleStart = nextCycle
      ? new Date(nextCycle.start_date)
      : null;

    if (nextCycleStart) {
      nextCycleStart.setHours(0, 0, 0, 0);
      if (date >= nextCycleStart) continue;
    } else {
      const estimatedEnd = new Date(start.getTime() + 33 * 86400000);
      if (date > estimatedEnd) continue;
    }

    return {
      phase: getCyclePhase(date, cycle, nextCycleStart),
      cycleId: cycle.id,
    };
  }

  return { phase: null, cycleId: null };
}

export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const PHASE_LABELS: Record<CyclePhase, string> = {
  menstruacion: "Menstruación",
  folicular: "Folicular",
  ovulacion: "Ovulación",
  lutea: "Lútea",
};
