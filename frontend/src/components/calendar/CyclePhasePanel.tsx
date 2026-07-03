import type { CyclePhase } from "../../lib/types";

const phaseConfig: Record<CyclePhase, {
  bgColor: string;
  iconColor: string;
  progressColor: string;
  icon: string;
  label: string;
  description: string;
}> = {
  menstruacion: {
    bgColor: "bg-menstrual-pink/50 border border-primary/20",
    iconColor: "text-primary",
    progressColor: "bg-primary",
    icon: "water_drop",
    label: "Fase Menstrual",
    description: "Es un buen momento para descansar y cuidar de ti. Prioriza el autocuidado y la hidratación.",
  },
  folicular: {
    bgColor: "bg-follicular-green/50 border border-tertiary/20",
    iconColor: "text-tertiary",
    progressColor: "bg-success-green",
    icon: "psychology",
    label: "Fase Folicular",
    description: "Tu energía está aumentando. Es un buen momento para nuevos proyectos y ejercicio.",
  },
  ovulacion: {
    bgColor: "bg-ovulation-purple/50 border border-secondary/20",
    iconColor: "text-secondary",
    progressColor: "bg-secondary",
    icon: "favorite",
    label: "Fase de Ovulación",
    description: "Estás en tu ventana fértil. Podrías notar mayor energía y confianza.",
  },
  lutea: {
    bgColor: "bg-luteal-yellow/50 border border-warning-orange/20",
    iconColor: "text-warning-orange",
    progressColor: "bg-warning-orange",
    icon: "sunny",
    label: "Fase Lútea",
    description: "Es normal sentirse con menos energía hoy. Prioriza el descanso y comidas ligeras.",
  },
};

interface CyclePhasePanelProps {
  phase: CyclePhase | null;
  cycleDay: number;
  predictedCycleLength: number;
}

export function CyclePhasePanel({
  phase,
  cycleDay,
  predictedCycleLength,
}: CyclePhasePanelProps) {
  const config = phase ? phaseConfig[phase] : null;

  if (!config) {
    return (
      <div className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <p className="text-body-sm text-text-muted text-center py-8">
          Registra un ciclo para ver tu fase actual.
        </p>
      </div>
    );
  }

  const progressPct = Math.min(100, Math.round((cycleDay / predictedCycleLength) * 100));

  return (
    <div className={`${config.bgColor} rounded-3xl p-6 relative overflow-hidden`}>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className={`px-3 py-1 rounded-full text-label-md border ${config.iconColor} bg-white/60 backdrop-blur-md`}>
            {config.label}
          </span>
          <span className={`material-symbols-outlined ${config.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
            {config.icon}
          </span>
        </div>

        <p className="text-body-md text-on-surface-variant mb-1">Día del ciclo</p>
        <h4 className="text-display-stat mb-4">
          {cycleDay}{" "}
          <span className="text-headline-sm font-normal text-text-muted">/ {predictedCycleLength}</span>
        </h4>

        <div className="w-full bg-surface-variant h-2 rounded-full mb-6">
          <div
            className={`${config.progressColor} h-full rounded-full transition-all duration-500`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <p className="text-body-sm text-on-surface-variant leading-relaxed">
          {config.description}
        </p>
      </div>

      <div className={`absolute -right-12 -bottom-12 w-40 h-40 ${config.iconColor} opacity-5 rounded-full blur-3xl`} />
    </div>
  );
}
