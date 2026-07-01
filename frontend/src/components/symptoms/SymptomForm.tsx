import { useState } from "react";
import type { SymptomCatalog } from "../../lib/types";
import { useDailyLogForm, FLOW_LABELS } from "../../hooks/useDailyLogForm";
import type { FlowLevel } from "../../hooks/useDailyLogForm";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Toast } from "../ui/Toast";

interface SymptomFormProps {
  date: string;
  cycleId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  fisica: "Física",
  emocional: "Emocional",
  digestiva: "Digestiva",
  otra: "Otra",
};

const CATEGORY_ICONS: Record<string, string> = {
  fisica: "💪",
  emocional: "😔",
  digestiva: "🌿",
  otra: "📋",
};

const FLOW_COLORS: Record<FlowLevel, string> = {
  none: "bg-gray-100 text-gray-600 border-gray-200",
  light: "bg-blue-50 text-blue-600 border-blue-200",
  medium: "bg-blue-100 text-blue-700 border-blue-300",
  heavy: "bg-red-50 text-red-600 border-red-200",
};

const FLOW_ACTIVE_COLORS: Record<FlowLevel, string> = {
  none: "bg-gray-200 text-gray-800 border-gray-400 ring-2 ring-gray-400/30",
  light: "bg-blue-100 text-blue-800 border-blue-400 ring-2 ring-blue-400/30",
  medium: "bg-blue-200 text-blue-900 border-blue-500 ring-2 ring-blue-500/30",
  heavy: "bg-red-100 text-red-800 border-red-400 ring-2 ring-red-400/30",
};

const FLOW_ICONS: Record<FlowLevel, string> = {
  none: "○",
  light: "💧",
  medium: "💧💧",
  heavy: "💧💧💧",
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SymptomForm({ date, cycleId, onSuccess, onCancel }: SymptomFormProps) {
  const {
    symptomsCatalog,
    loading,
    error: formError,
    selectedSymptoms,
    flowLevel,
    temperature,
    notes,
    saving,
    existingLog,
    toggleSymptom,
    setIntensity,
    setFlowLevel,
    setTemperature,
    setNotes,
    submit,
  } = useDailyLogForm({ date, cycleId, onSuccess });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error">("success");

  const groupedSymptoms = symptomsCatalog.reduce(
    (acc, s) => {
      const cat = s.category || "otra";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    },
    {} as Record<string, SymptomCatalog[]>,
  );

  const categoryOrder = ["fisica", "emocional", "digestiva", "otra"];

  const temperatureError =
    temperature !== ""
      ? (() => {
          const n = parseFloat(temperature);
          if (isNaN(n)) return "Ingresa un número válido";
          if (n < 35 || n > 42) return "Entre 35°C y 42°C";
          return undefined;
        })()
      : undefined;

  const handleSubmit = async () => {
    if (temperatureError) return;
    try {
      await submit();
      setToastVariant("success");
      setToastMessage("Registro guardado correctamente");
    } catch {
      setToastVariant("error");
      setToastMessage("Error al guardar. Intenta de nuevo.");
    }
  };

  if (loading) {
    return (
      <Card padding="md">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-eva-300 border-t-eva-600" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {toastMessage && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          onDismiss={() => setToastMessage(null)}
        />
      )}

      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary capitalize">
              {formatDate(date)}
            </h2>
            <p className="text-sm text-text-muted mt-0.5">
              {existingLog ? "Editando registro existente" : "Nuevo registro"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-text-muted hover:text-text-secondary transition-colors p-1"
            aria-label="Cerrar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {formError && !saving && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {formError}
          </div>
        )}

        {/* Symptoms grid by category */}
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Síntomas
          </h3>

          <div className="space-y-4">
            {categoryOrder.map((cat) => {
              const symptoms = groupedSymptoms[cat];
              if (!symptoms || symptoms.length === 0) return null;

              return (
                <div key={cat}>
                  <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">
                    {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {symptoms.map((symptom) => {
                      const isSelected = symptom.id in selectedSymptoms;
                      const intensity = selectedSymptoms[symptom.id] ?? 0;

                      return (
                        <div key={symptom.id}>
                          <button
                            type="button"
                            onClick={() => toggleSymptom(symptom.id)}
                            className={`w-full rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                              isSelected
                                ? "bg-eva-50 border-eva-300 text-eva-700"
                                : "bg-white border-border text-text-secondary hover:bg-gray-50"
                            }`}
                            aria-pressed={isSelected}
                            aria-label={`${symptom.name}${isSelected ? `, intensidad ${intensity}` : ""}`}
                          >
                            {symptom.name}
                          </button>

                          {isSelected && (
                            <div className="mt-1 px-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={1}
                                  max={5}
                                  value={intensity}
                                  onChange={(e) =>
                                    setIntensity(
                                      symptom.id,
                                      Number(e.target.value),
                                    )
                                  }
                                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-eva-500"
                                  aria-label={`Intensidad de ${symptom.name}`}
                                />
                                <span className="text-xs font-medium text-text-secondary w-4 text-center">
                                  {intensity}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Flow level */}
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Nivel de flujo
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(FLOW_LABELS) as FlowLevel[]).map((level) => {
              const isActive = flowLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFlowLevel(level)}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? FLOW_ACTIVE_COLORS[level] : FLOW_COLORS[level]
                  }`}
                  aria-pressed={isActive}
                >
                  <span className="text-lg leading-none">
                    {FLOW_ICONS[level]}
                  </span>
                  <span>{FLOW_LABELS[level]}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Temperature */}
        <section className="mb-6">
          <Input
            label="Temperatura basal (°C)"
            type="number"
            step="0.1"
            min="35"
            max="42"
            placeholder="Ej: 36.5"
            value={temperature}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTemperature(e.target.value)
            }
            error={temperatureError}
          />
          <p className="text-xs text-text-muted mt-1">Opcional — entre 35°C y 42°C</p>
        </section>

        {/* Notes */}
        <section className="mb-6">
          <label
            htmlFor="notes"
            className="block text-sm font-semibold text-text-primary mb-1.5"
          >
            Notas
          </label>
          <textarea
            id="notes"
            rows={3}
            maxLength={500}
            placeholder="¿Cómo te sientes hoy? Anota lo que consideres relevante..."
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setNotes(e.target.value)
            }
            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-eva-400/30 resize-none"
          />
          <p className="text-xs text-text-muted mt-1">
            {notes.length}/500 caracteres
          </p>
        </section>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={saving}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !!temperatureError}
            className="flex-1"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Guardando...
              </span>
            ) : (
              "Guardar"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

