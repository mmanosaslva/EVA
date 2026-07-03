interface CycleProgressCardProps {
  cycleDay: number;
  predictedCycleLength: number;
}

export function CycleProgressCard({
  cycleDay,
  predictedCycleLength,
}: CycleProgressCardProps) {
  const progress = Math.min(100, Math.round((cycleDay / predictedCycleLength) * 100));
  const circumference = 2 * Math.PI * 58;
  const dashOffset = circumference * (1 - progress / 100);

  return (
    <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white rounded-3xl p-6 border border-border-subtle flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-secondary-fixed rounded-xl">
          <span className="material-symbols-outlined text-secondary">cycle</span>
        </div>
        <h5 className="text-headline-sm">Progreso del Ciclo</h5>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r="58"
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              r="58"
              fill="none"
              stroke="#8455ef"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-headline-md">{progress}%</span>
            <span className="text-label-md text-text-muted">completado</span>
          </div>
        </div>
      </div>

      <p className="text-center text-body-sm text-text-muted mt-4">
        Día {cycleDay} de ~{predictedCycleLength} días estimados.
      </p>
    </div>
  );
}
