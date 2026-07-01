import type { Cycle } from "../../lib/types";
import { useCycleForm } from "../../hooks/useCycleForm";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Toast } from "../ui/Toast";

interface CycleFormProps {
  initialData?: Pick<Cycle, "id" | "start_date" | "end_date">;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CycleForm({ initialData, onSuccess, onCancel }: CycleFormProps) {
  const {
    startDate,
    endDate,
    error,
    submitting,
    successMessage,
    setStartDate,
    setEndDate,
    handleSubmit,
    dismissSuccess,
  } = useCycleForm({ initialData, onSuccess });

  const isEditing = Boolean(initialData);

  return (
    <Card padding="md" className="mx-1 mt-3">
      <h3 className="mb-4 text-base font-semibold text-text-primary">
        {isEditing ? "Editar ciclo" : "Nuevo ciclo"}
      </h3>

      <div className="flex flex-col gap-4">
        <Input
          label="Fecha de inicio"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />

        <Input
          label="Fecha de fin"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="Opcional"
        />
        <span className="-mt-3 text-xs text-text-muted">
          La fecha de fin de la menstruación. Si no la conoces, puedes dejarla vacía.
        </span>

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
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Guardando...
              </span>
            ) : isEditing ? (
              "Actualizar ciclo"
            ) : (
              "Crear ciclo"
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
