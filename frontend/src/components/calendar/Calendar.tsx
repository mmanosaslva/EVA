import { useState, useMemo, useCallback } from "react";
import type { Cycle, CalendarDay } from "../../lib/types";
import { buildCalendarDays, DAY_NAMES } from "../../lib/cycleUtils";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarCell } from "./CalendarCell";
import { DayDetail } from "./DayDetail";

interface CalendarProps {
  cycles: Cycle[];
  onEditCycle?: (cycleId: string) => void;
  onRegisterDay?: (date: string, cycleId: string) => void;
  onViewHistory?: (cycleId: string) => void;
}

export function Calendar({
  cycles,
  onEditCycle,
  onRegisterDay,
  onViewHistory,
}: CalendarProps) {
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

  return (
    <div>
      <CalendarHeader
        month={month}
        year={year}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
      />

      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="py-1.5 text-center text-xs font-medium text-text-muted"
            aria-hidden="true"
          >
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <CalendarCell
            key={day.date.toISOString()}
            day={day}
            isSelected={
              selectedDay !== null &&
              selectedDay.date.getTime() === day.date.getTime()
            }
            onClick={handleDayClick}
          />
        ))}
      </div>

      <DayDetail
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
        onEditCycle={onEditCycle}
        onRegisterDay={onRegisterDay}
        onViewHistory={onViewHistory}
      />
    </div>
  );
}
