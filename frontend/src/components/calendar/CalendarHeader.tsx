import { MONTH_NAMES } from "../../lib/cycleUtils";

interface CalendarHeaderProps {
  month: number;
  year: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function CalendarHeader({
  month,
  year,
  onPrevMonth,
  onNextMonth,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between px-1 py-3">
      <button
        type="button"
        onClick={onPrevMonth}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eva-400"
        aria-label="Mes anterior"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h2 className="text-lg font-semibold text-text-primary">
        {MONTH_NAMES[month]} {year}
      </h2>
      <button
        type="button"
        onClick={onNextMonth}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eva-400"
        aria-label="Mes siguiente"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
