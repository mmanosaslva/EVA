import type { CalendarDay, CyclePhase } from "../../lib/types";

interface CalendarCellProps {
  day: CalendarDay;
  isSelected: boolean;
  isOvulationDay: boolean;
  isPredictedDay: boolean;
  onClick: (day: CalendarDay) => void;
}

const mobileCircle: Record<CyclePhase, string> = {
  menstruacion: "bg-menstrual-pink text-primary font-bold",
  folicular: "bg-follicular-green text-tertiary",
  ovulacion: "bg-ovulation-purple text-secondary font-bold",
  lutea: "bg-luteal-yellow text-warning-orange",
};

const desktopBg: Record<CyclePhase, string> = {
  menstruacion: "md:bg-menstrual-pink md:opacity-50",
  folicular: "md:bg-follicular-green md:opacity-40",
  ovulacion: "md:bg-ovulation-purple md:opacity-60 md:border md:border-secondary/30",
  lutea: "md:bg-luteal-yellow md:opacity-40",
};

export function CalendarCell({
  day,
  isSelected,
  isOvulationDay,
  isPredictedDay,
  onClick,
}: CalendarCellProps) {
  const isOtherMonth = !day.isCurrentMonth;
  const phase = day.phase;

  if (isOtherMonth) {
    return (
      <div
        className="aspect-square md:h-16 flex items-center justify-center text-text-muted opacity-0 md:opacity-30"
        aria-hidden
      >
        <span className="text-body-sm md:text-body-md">{day.dayOfMonth}</span>
      </div>
    );
  }

  let textClass = "text-text-main";
  let borderClass = "";

  if (day.isToday) {
    borderClass = "ring-2 ring-primary ring-offset-2 shadow-md bg-surface";
    textClass = "font-bold text-primary";
  } else if (isSelected) {
    borderClass = "ring-2 ring-primary ring-offset-1 bg-surface";
  } else if (isPredictedDay) {
    borderClass = "border-2 border-primary border-dotted opacity-60";
    textClass = "text-text-main";
  }

  return (
    <button
      type="button"
      onClick={() => onClick(day)}
      className={`aspect-square md:h-16 flex flex-col items-center justify-center relative group transition-all active:scale-95 ${borderClass}`}
      aria-label={`${day.dayOfMonth}${day.phase ? `, ${day.phase}` : ""}${day.isToday ? ", hoy" : ""}`}
    >
      {/* Desktop: full cell bg */}
      {phase && !day.isToday && !isPredictedDay && (
        <div className={`hidden md:block absolute inset-0 rounded-lg scale-90 ${desktopBg[phase]}`} />
      )}

      {/* Desktop: predicted border */}
      {isPredictedDay && (
        <div className="hidden md:block absolute inset-0 rounded-lg scale-90 border-2 border-primary border-dotted opacity-30" />
      )}

      {/* Mobile: circle bg */}
      {phase && !day.isToday && !isPredictedDay && (
        <span className={`md:hidden absolute inset-1 rounded-full ${mobileCircle[phase]}`} />
      )}

      {/* Mobile: prediction dot */}
      {isPredictedDay && !isOvulationDay && (
        <div className="md:hidden absolute bottom-1.5 w-1 h-1 rounded-full bg-secondary" />
      )}

      {/* Mobile: ovulation circle */}
      {isOvulationDay && !day.isToday && phase && (
        <span className={`md:hidden absolute inset-1 rounded-full ${mobileCircle[phase]}`} />
      )}

      <span className={`relative text-body-sm md:text-body-md z-10 ${textClass}`}>
        {day.dayOfMonth}
      </span>

      {day.isToday && (
        <span className="relative text-label-md text-primary font-bold -mt-1 hidden md:block">
          HOY
        </span>
      )}

      {isOvulationDay && !day.isToday && (
        <span
          className="material-symbols-outlined text-[10px] md:text-[12px] absolute -top-1 -right-1 text-secondary hidden md:block"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          star
        </span>
      )}
    </button>
  );
}
