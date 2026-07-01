interface SymptomBarProps {
  value: number;
  max?: number;
  className?: string;
}

export function SymptomBar({ value, max = 5, className = "" }: SymptomBarProps) {
  const segments = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div className={`flex gap-0.5 ${className}`} aria-label={`Intensidad ${value} de ${max}`}>
      {segments.map((seg) => (
        <span
          key={seg}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            seg <= value ? "bg-eva-500" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}
