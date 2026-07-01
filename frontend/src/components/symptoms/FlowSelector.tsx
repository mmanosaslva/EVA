interface FlowSelectorProps {
  value: string;
  onChange: (v: string) => void;
}

const FLOW_OPTIONS = [
  {
    value: "none",
    label: "Ninguno",
    dot: "bg-gray-200",
    activeDot: "bg-gray-400",
  },
  {
    value: "light",
    label: "Leve",
    dot: "bg-red-200",
    activeDot: "bg-red-400",
  },
  {
    value: "medium",
    label: "Medio",
    dot: "bg-red-300",
    activeDot: "bg-red-500",
  },
  {
    value: "heavy",
    label: "Abundante",
    dot: "bg-red-400",
    activeDot: "bg-red-600",
  },
];

export function FlowSelector({ value, onChange }: FlowSelectorProps) {
  return (
    <div className="flex gap-2">
      {FLOW_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
            value === opt.value
              ? "border-eva-400 bg-eva-50 text-eva-700"
              : "border-border bg-white text-text-muted hover:bg-surface-alt"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              value === opt.value ? opt.activeDot : opt.dot
            }`}
          />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
