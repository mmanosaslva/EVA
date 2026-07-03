function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  da.setHours(0, 0, 0, 0);
  db.setHours(0, 0, 0, 0);
  return Math.floor((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

interface UpcomingEventsPanelProps {
  daysUntilNext: number;
  predictedDate: string;
  fertileStart: string;
  fertileEnd: string;
  totalCycles: number;
}

export function UpcomingEventsPanel({
  daysUntilNext,
  predictedDate,
  fertileStart,
  fertileEnd,
  totalCycles,
}: UpcomingEventsPanelProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const daysSinceFertileEnd = daysBetween(fertileEnd, todayStr);
  const fertileEnded = daysSinceFertileEnd > 0;

  return (
    <div className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <h4 className="text-headline-sm mb-6">Próximos Eventos</h4>

      {totalCycles === 0 ? (
        <p className="text-body-sm text-text-muted text-center py-4">
          Registra ciclos para ver predicciones.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-menstrual-pink flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary">water_drop</span>
            </div>
            <div className="flex-1">
              <p className="text-body-md font-bold text-text-main">Próximo periodo</p>
              <p className="text-body-sm text-text-muted">
                {daysUntilNext === 0
                  ? "Hoy"
                  : `En ${daysUntilNext} días (${formatDate(predictedDate)})`}
              </p>
            </div>
            <div className="text-right">
              <span className="text-label-md text-success-green bg-success-green/10 px-2 py-0.5 rounded">
                {daysUntilNext <= 3 ? "95% Prob." : "~80% Prob."}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-ovulation-purple flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary">favorite</span>
            </div>
            <div className="flex-1">
              <p className="text-body-md font-bold text-text-main">Ventana fértil</p>
              <p className="text-body-sm text-text-muted">
                {fertileEnded
                  ? `Terminó hace ${daysSinceFertileEnd} días`
                  : daysBetween(todayStr, fertileStart) > 0
                    ? `Inicia en ${daysBetween(todayStr, fertileStart)} días`
                    : "Ahora"}
              </p>
              <p className="text-label-md text-text-muted mt-0.5">
                {formatDate(fertileStart)} — {formatDate(fertileEnd)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
