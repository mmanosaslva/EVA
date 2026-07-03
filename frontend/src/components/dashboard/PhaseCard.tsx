import type { CyclePhase } from "../../lib/types";
import { useNavigate } from "react-router-dom";

const phaseConfig: Record<CyclePhase, {
  bgColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  icon: string;
  label: string;
}> = {
  menstruacion: {
    bgColor: "bg-menstrual-pink",
    textColor: "text-primary",
    badgeBg: "bg-white/60 backdrop-blur-md",
    badgeText: "text-primary",
    icon: "water_drop",
    label: "Fase Menstrual",
  },
  folicular: {
    bgColor: "bg-follicular-green",
    textColor: "text-success-green",
    badgeBg: "bg-white/60 backdrop-blur-md",
    badgeText: "text-success-green",
    icon: "psychology",
    label: "Fase Folicular",
  },
  ovulacion: {
    bgColor: "bg-ovulation-purple",
    textColor: "text-secondary",
    badgeBg: "bg-white/60 backdrop-blur-md",
    badgeText: "text-secondary",
    icon: "favorite",
    label: "Fase de Ovulación",
  },
  lutea: {
    bgColor: "bg-luteal-yellow",
    textColor: "text-warning-orange",
    badgeBg: "bg-white/60 backdrop-blur-md",
    badgeText: "text-warning-orange",
    icon: "sunny",
    label: "Fase Lútea",
  },
};

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

interface PhaseCardProps {
  phase: CyclePhase | null;
  cycleDay: number;
  description: string;
  daysUntilNext: number;
  predictedDate: string;
  cycleId: string | null;
}

export function PhaseCard({
  phase,
  cycleDay,
  description,
  daysUntilNext,
  predictedDate,
  cycleId,
}: PhaseCardProps) {
  const navigate = useNavigate();
  const config = phase ? phaseConfig[phase] : null;

  if (!phase || !config) {
    return (
      <div className="col-span-12 lg:col-span-8 bg-surface-container-low rounded-3xl p-8 border border-border-subtle flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-text-muted mb-4 block">cycle</span>
          <p className="text-body-md text-text-muted">
            Registra un ciclo para ver tu fase actual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`col-span-12 lg:col-span-8 ${config.bgColor} rounded-3xl p-8 border border-border-subtle relative overflow-hidden`}>
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-12">
          <div>
            <span className={`px-4 py-1 rounded-full ${config.badgeBg} ${config.badgeText} font-bold text-label-md mb-4 inline-block`}>
              {config.label}
            </span>
            <h4 className="text-display-stat mt-4">Día {cycleDay}</h4>
            <p className="text-body-lg text-on-surface-variant mt-2 max-w-md">
              {description}
            </p>
          </div>
          <div className="w-20 h-20 bg-white/40 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/50 shrink-0">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {config.icon}
            </span>
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-black/5">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className="text-label-md text-text-muted">Siguiente Periodo</span>
                <span className="text-headline-sm">
                  {daysUntilNext === 0 ? "Hoy" : `En ${daysUntilNext} días`}
                </span>
                <span className="text-body-sm text-text-muted mt-0.5">
                  ~{formatDateShort(predictedDate)}
                </span>
              </div>
              <div className="w-px h-10 bg-black/5 mx-2 self-center" />
              <div className="flex flex-col">
                <span className="text-label-md text-text-muted">Duración Promedio</span>
                <span className="text-headline-sm">28 días</span>
              </div>
            </div>
            <button
              onClick={() =>
                cycleId
                  ? navigate(`/symptoms?date=${todayStr()}&cycleId=${cycleId}`)
                  : navigate("/symptoms")
              }
              className="bg-primary text-on-primary px-6 py-3 rounded-full font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all text-label-md whitespace-nowrap"
            >
              Registrar Síntomas
            </button>
          </div>
        </div>
      </div>

      <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
    </div>
  );
}
