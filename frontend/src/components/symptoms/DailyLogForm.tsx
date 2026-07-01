import { useEffect } from "react";
import type { DailyLog } from "../../lib/types";
import { useDailyLogForm } from "../../hooks/useDailyLogForm";
import { useSymptomStore } from "../../store/symptomStore";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Toast } from "../ui/Toast";
import { SymptomGrid } from "./SymptomGrid";
import { IntensitySlider } from "./IntensitySlider";
import { FlowSelector } from "./FlowSelector";
import { TemperatureInput } from "./TemperatureInput";

interface DailyLogFormProps {
  cycleId: string;
  date: string;
  initialData?: DailyLog | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function formatDateDisplay(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function DailyLogForm({
  cycleId,
  date,
  initialData,
  onSuccess,
  onCancel,
}: DailyLogFormProps) {
  const { symptoms: catalog, isLoaded, loadSymptoms } = useSymptomStore();
  const isEditing = Boolean(initialData);

  useEffect(() => {
    loadSymptoms();
  }, [loadSymptoms]);

  const {
    selectedSymptoms,
    flowLevel,
    temperature,
    notes,
    error,
    submitting,
    successMessage,
    toggleSymptom,
    setIntensity,
    setFlowLevel,
    setTemperature,
    setNotes,
    handleSubmit,
    dismissSuccess,
  } = useDailyLogForm({ cycleId, date, initialData: initialData ?? null, onSuccess });

  const selectedIds = new Set(selectedSymptoms.keys());

  return (
    <Card padding="md" className="mx-1 mt-3">
      <h3 className="mb-1 text-base font-semibold text-text-primary capitalize">
        {isEditing ? "Editar registro" : "Registrar día"}
      </h3>
      <p className="mb-4 text-sm text-text-muted capitalize">
        {formatDateDisplay(date)}
      </p>

      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">
            Síntomas
          </p>
          {!isLoaded ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-eva-300 border-t-eva-600" />
            </div>
          ) : (
            <SymptomGrid
              symptoms={catalog}
              selectedIds={selectedIds}
              onToggle={toggleSymptom}
            />
          )}

          {selectedSymptoms.size > 0 && (
            <div className="mt-4 space-y-3">
              {Array.from(selectedSymptoms.values()).map((s) => (
                <div key={s.symptom_id} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-text-secondary">
                    {s.name}
                  </span>
                  <div className="flex-1">
                    <IntensitySlider
                      value={s.intensity}
                      onChange={(v) => setIntensity(s.symptom_id, v)}
                    />
                  </div>
                  <span className="w-5 text-center text-xs font-medium text-text-muted">
                    {s.intensity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">
            Nivel de flujo
          </p>
          <FlowSelector value={flowLevel} onChange={setFlowLevel} />
        </div>

        <div className="flex gap-4">
          <div className="w-1/2">
            <TemperatureInput
              value={temperature}
              onChange={setTemperature}
            />
          </div>
          <div className="w-1/2 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="¿Cómo te sentiste hoy?"
              rows={2}
              className="rounded-lg border border-border px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-eva-400/30 resize-none"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Guardando...
              </span>
            ) : (
              "Guardar registro"
            )}
          </Button>
        </div>
      </div>

      {successMessage && (
        <Toast
          message={successMessage}
          variant="success"
          onDismiss={dismissSuccess}
        />
      )}
    </Card>
  );
}
