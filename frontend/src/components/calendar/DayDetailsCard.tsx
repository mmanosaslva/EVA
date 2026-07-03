import type { CyclePhase } from "../../lib/types";
import { useNavigate } from "react-router-dom";

const phaseInfo: Record<CyclePhase, {
  bgColor: string;
  iconColor: string;
  iconBg: string;
  icon: string;
  label: string;
}> = {
  menstruacion: {
    bgColor: "bg-menstrual-pink",
    iconColor: "text-primary",
    iconBg: "bg-white",
    icon: "water_drop",
    label: "Fase Menstrual",
  },
  folicular: {
    bgColor: "bg-follicular-green",
    iconColor: "text-success-green",
    iconBg: "bg-white",
    icon: "psychology",
    label: "Fase Folicular",
  },
  ovulacion: {
    bgColor: "bg-ovulation-purple",
    iconColor: "text-secondary",
    iconBg: "bg-white",
    icon: "favorite",
    label: "Fase de Ovulación",
  },
  lutea: {
    bgColor: "bg-luteal-yellow",
    iconColor: "text-warning-orange",
    iconBg: "bg-white",
    icon: "sunny",
    label: "Fase Lútea",
  },
};

interface DayDetailsCardProps {
  phase: CyclePhase | null;
  cycleDay: number;
  cycleId: string | null;
}

export function DayDetailsCard({ phase, cycleDay, cycleId }: DayDetailsCardProps) {
  const navigate = useNavigate();
  const config = phase ? phaseInfo[phase] : null;

  // Placeholder values for flow/mood until we have real daily log data
  const flowLevel = "Cremoso";
  const moodLabel = "Energética";

  return (
    <div className="lg:hidden mt-8">
      <h2 className="text-headline-sm mb-4">Detalles de hoy</h2>

      <div className="grid grid-cols-2 gap-4">
        {config ? (
          <div className={`col-span-2 ${config.bgColor} p-5 rounded-2xl border border-border-subtle flex items-center justify-between`}>
            <div>
              <span className="text-label-md uppercase text-success-green tracking-widest">
                Fase Actual
              </span>
              <p className="text-headline-md">{config.label}</p>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Día {cycleDay} del ciclo
              </p>
            </div>
            <div className={`w-12 h-12 ${config.iconBg} rounded-full flex items-center justify-center ${config.iconColor}`}>
              <span className="material-symbols-outlined text-3xl">{config.icon}</span>
            </div>
          </div>
        ) : (
          <div className="col-span-2 bg-surface-container-low p-5 rounded-2xl border border-border-subtle text-center">
            <p className="text-body-sm text-text-muted">
              Registra un ciclo para ver los detalles de hoy.
            </p>
          </div>
        )}

        <div className="bg-white p-4 rounded-2xl border border-border-subtle shadow-sm">
          <span className="material-symbols-outlined text-primary mb-2">water_drop</span>
          <p className="text-body-sm text-text-muted">Flujo</p>
          <p className="text-body-md font-semibold">{flowLevel}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border-subtle shadow-sm">
          <span className="material-symbols-outlined text-warning-orange mb-2">mood</span>
          <p className="text-body-sm text-text-muted">Ánimo</p>
          <p className="text-body-md font-semibold">{moodLabel}</p>
        </div>
      </div>

      {cycleId && (
        <button
          onClick={() => {
            const todayStr = new Date().toISOString().split("T")[0];
            navigate(`/symptoms?date=${todayStr}&cycleId=${cycleId}`);
          }}
          className="mt-4 w-full py-3 bg-primary text-on-primary rounded-full text-label-md font-bold transition-all active:scale-95 shadow-sm"
        >
          Registrar síntomas de hoy
        </button>
      )}
    </div>
  );
}
