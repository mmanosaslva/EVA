import type { CalendarDay, CyclePhase } from "../../lib/types";

interface CalendarCellProps {
  day: CalendarDay;
  isSelected: boolean;
  onClick: (day: CalendarDay) => void;
}

const phaseBg: Record<CyclePhase, string> = {
  menstruacion: "bg-red-50 border-red-200",
  folicular: "bg-lavender-50 border-lavender-200",
  ovulacion: "bg-green-50 border-green-200",
  lutea: "bg-amber-50 border-amber-200",
};

export function CalendarCell({ day, isSelected, onClick }: CalendarCellProps) {
  const isOtherMonth = !day.isCurrentMonth;
  const phaseClass = day.phase ? phaseBg[day.phase] : "border-transparent";

  let cellClasses =
    "relative flex flex-col items-center rounded-lg border py-1.5 transition-colors cursor-pointer min-h-[44px]";

  if (isOtherMonth) {
    cellClasses += " opacity-35";
  } else {
    cellClasses += ` ${phaseClass}`;
    if (!day.phase) {
      cellClasses += " hover:bg-surface-alt";
    } else {
      cellClasses += " hover:brightness-95";
    }
  }

  if (day.isToday) {
    cellClasses += " ring-2 ring-eva-500 ring-offset-1";
  }

  if (isSelected) {
    cellClasses += " ring-2 ring-offset-1 ring-eva-600";
  }

  const phaseLabel = day.phase
    ? {
        menstruacion: "Menstruación",
        folicular: "Folicular",
        ovulacion: "Ovulación",
        lutea: "Lútea",
      }[day.phase]
    : "Sin ciclo registrado";

  const todayLabel = day.isToday ? " (hoy)" : "";

  return (
    <button
      type="button"
      className={cellClasses}
      onClick={() => onClick(day)}
      aria-label={`${day.dayOfMonth}, ${phaseLabel}${todayLabel}`}
    >
      <span
        className={`text-sm ${
          day.isToday
            ? "font-bold text-eva-600"
            : isOtherMonth
              ? "text-text-muted"
              : "text-text-primary"
        }`}
      >
        {day.dayOfMonth}
      </span>
      {day.phase && !isOtherMonth && (
        <span
          className={`mt-0.5 h-1 w-1 rounded-full ${
            day.phase === "menstruacion"
              ? "bg-red-400"
              : day.phase === "folicular"
                ? "bg-lavender-400"
                : day.phase === "ovulacion"
                  ? "bg-green-400"
                  : "bg-amber-400"
          }`}
        />
      )}
    </button>
  );
}
