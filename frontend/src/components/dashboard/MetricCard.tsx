import { Card } from "../ui/Card";

interface MetricCardProps {
  icon: string;
  value: string;
  label: string;
  subtitle?: string;
  variant?: "default" | "highlight" | "phase";
  phase?: string;
}

const variantStyles: Record<string, string> = {
  default: "text-text-primary",
  highlight: "text-primary",
  phase: "text-secondary",
};

export function MetricCard({
  icon,
  value,
  label,
  subtitle,
  variant = "default",
  phase,
}: MetricCardProps) {
  const phaseColors: Record<string, string> = {
    menstruacion: "bg-error-container/30 border-error/20",
    folicular: "bg-secondary-fixed border-secondary-fixed-dim",
    ovulacion: "bg-green-50 border-green-200",
    lutea: "bg-luteal-yellow border-warning-orange/20",
  };

  const extraClass = phase ? phaseColors[phase] ?? "" : "";

  return (
    <Card padding="sm" className={`${extraClass}`}>
      <div className="flex flex-col items-center text-center gap-1">
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>
        <span
          className={`text-xl font-bold leading-tight ${variantStyles[variant]}`}
        >
          {value}
        </span>
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        {subtitle && (
          <span className="text-[11px] text-text-muted leading-tight max-w-[140px]">
            {subtitle}
          </span>
        )}
      </div>
    </Card>
  );
}
