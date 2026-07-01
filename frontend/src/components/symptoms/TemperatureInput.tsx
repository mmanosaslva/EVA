import { Input } from "../ui/Input";

interface TemperatureInputProps {
  value: string;
  onChange: (v: string) => void;
}

export function TemperatureInput({ value, onChange }: TemperatureInputProps) {
  const numValue = value ? parseFloat(value) : null;
  const hasError =
    value !== "" && (numValue === null || isNaN(numValue) || numValue < 35 || numValue > 42);

  return (
    <Input
      label="Temperatura basal"
      type="number"
      min={35}
      max={42}
      step={0.1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="36.5"
      error={hasError ? "Debe estar entre 35°C y 42°C" : undefined}
    />
  );
}
