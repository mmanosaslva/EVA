interface IntensitySliderProps {
  value: number;
  onChange: (value: number) => void;
}

const INTENSITY_LABELS = ["Muy leve", "Leve", "Moderado", "Intenso", "Muy intenso"];

export function IntensitySlider({ value, onChange }: IntensitySliderProps) {
  const segments = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Intensidad">
      {segments.map((seg) => (
        <button
          key={seg}
          type="button"
          role="radio"
          aria-checked={value === seg}
          aria-label={INTENSITY_LABELS[seg - 1]}
          onClick={() => onChange(seg)}
          className={`h-6 flex-1 rounded transition-colors ${
            seg <= value
              ? "bg-eva-500"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        />
      ))}
    </div>
  );
}
