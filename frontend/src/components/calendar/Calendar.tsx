import { useState, useMemo, useCallback } from "react";
import type { Cycle, CalendarDay } from "../../lib/types";
import { buildCalendarDays, MONTH_NAMES } from "../../lib/cycleUtils";

const DAY_NAMES_FULL = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_SHORT = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"];
import { CalendarCell } from "./CalendarCell";
import { DayDetail } from "./DayDetail";

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  da.setHours(0, 0, 0, 0);
  db.setHours(0, 0, 0, 0);
  return Math.floor((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

interface CalendarProps {
  cycles: Cycle[];
  onEditCycle?: (cycleId: string) => void;
}

export function Calendar({ cycles, onEditCycle }: CalendarProps) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = useMemo(
    () => buildCalendarDays(year, month, cycles),
    [year, month, cycles],
  );

  const sorted = useMemo(
    () =>
      [...cycles].sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
      ),
    [cycles],
  );

  const avgCycleLength = useMemo(() => {
    const cycleLengths: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      cycleLengths.push(
        daysBetween(sorted[i - 1].start_date, sorted[i].start_date),
      );
    }
    return cycleLengths.length > 0
      ? Math.round(cycleLengths.reduce((s, d) => s + d, 0) / cycleLengths.length)
      : 28;
  }, [sorted]);

  const predictedDays = useMemo(() => {
    const current = sorted.find((c) => c.end_date === null) ?? sorted[sorted.length - 1];
    if (!current) return { ovulation: new Set<number>(), nextPeriod: new Set<number>() };

    const start = new Date(current.start_date);
    start.setHours(0, 0, 0, 0);

    const ovulationDay = avgCycleLength - 14;
    const ovulationDate = new Date(start.getTime() + (ovulationDay - 1) * 86400000);

    const nextPeriodStart = new Date(start.getTime() + avgCycleLength * 86400000);

    const ovulationSet = new Set<number>();
    for (let i = -1; i <= 1; i++) {
      const d = new Date(ovulationDate.getTime() + i * 86400000);
      ovulationSet.add(d.getTime());
    }

    const periodSet = new Set<number>();
    for (let i = 0; i < 5; i++) {
      const d = new Date(nextPeriodStart.getTime() + i * 86400000);
      periodSet.add(d.getTime());
    }

    return { ovulation: ovulationSet, nextPeriod: periodSet };
  }, [sorted, avgCycleLength]);

  const handlePrevMonth = useCallback(() => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  }, [year, month]);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  }, [year, month]);

  const handleDayClick = useCallback((day: CalendarDay) => {
    setSelectedDay((prev) =>
      prev &&
      prev.date.getTime() === day.date.getTime() &&
      prev.date.getMonth() === day.date.getMonth()
        ? null
        : day,
    );
  }, []);

  const isRegular = cycles.length >= 3 && avgCycleLength >= 21 && avgCycleLength <= 35;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-headline-lg mb-2">
            {MONTH_NAMES[month]} {year}
          </h3>
          <div className="flex items-center gap-2 text-text-muted">
            <span
              className="material-symbols-outlined text-success-green"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <p className="text-body-md">
              {isRegular
                ? `Ciclo regular de ${avgCycleLength} días detectado`
                : cycles.length > 0
                  ? `${cycles.length} ciclo(s) registrado(s)`
                  : "Sin ciclos registrados"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-full border border-border-subtle bg-white active:scale-95 transition-all"
            aria-label="Mes anterior"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-full border border-border-subtle bg-white active:scale-95 transition-all"
            aria-label="Mes siguiente"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-4 pb-4 border-b border-border-subtle">
        {DAY_NAMES_FULL.map((name, i) => (
          <div
            key={name}
            className="text-center text-label-md text-text-muted"
          >
            <span className="hidden md:inline">{name}</span>
            <span className="md:hidden">{DAY_NAMES_SHORT[i]}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-4">
        {days.map((day) => {
          const isOvulation =
            !day.isToday && predictedDays.ovulation.has(day.date.getTime());
          const isPredicted =
            !day.isToday && !isOvulation && predictedDays.nextPeriod.has(day.date.getTime());

          return (
            <CalendarCell
              key={day.date.toISOString()}
              day={day}
              isSelected={
                selectedDay !== null &&
                selectedDay.date.getTime() === day.date.getTime()
              }
              isOvulationDay={isOvulation}
              isPredictedDay={isPredicted}
              onClick={handleDayClick}
            />
          );
        })}
      </div>

      <DayDetail
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
        onEditCycle={onEditCycle}
      />
    </div>
  );
}
