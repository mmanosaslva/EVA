import { useState, useCallback } from "react";
import type { CycleResponse } from "../lib/types";
import { createCycle, updateCycle } from "../services/cycleService";

interface UseCycleFormOptions {
  initialData?: Pick<CycleResponse, "id" | "start_date" | "end_date">;
  onSuccess: () => void;
}

interface UseCycleFormReturn {
  startDate: string;
  endDate: string;
  error: string | null;
  submitting: boolean;
  successMessage: string | null;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  handleSubmit: () => Promise<void>;
  dismissSuccess: () => void;
}

export function useCycleForm({
  initialData,
  onSuccess,
}: UseCycleFormOptions): UseCycleFormReturn {
  const [startDate, setStartDate] = useState(initialData?.start_date ?? "");
  const [endDate, setEndDate] = useState(initialData?.end_date ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validate = useCallback((): string | null => {
    if (!startDate) return "La fecha de inicio es obligatoria";

    if (endDate && startDate) {
      const start = new Date(startDate + "T00:00:00");
      const end = new Date(endDate + "T00:00:00");
      if (end < start) {
        return "La fecha de fin no puede ser anterior a la fecha de inicio";
      }
    }

    return null;
  }, [startDate, endDate]);

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);
    setSuccessMessage(null);

    try {
      const payload = {
        start_date: startDate,
        end_date: endDate || undefined,
      };

      if (initialData) {
        await updateCycle(initialData.id, payload);
        setSuccessMessage("Ciclo actualizado correctamente");
      } else {
        await createCycle(payload);
        setSuccessMessage("Ciclo creado correctamente");
      }

      setTimeout(onSuccess, 800);
    } catch {
      setError("Ocurrió un error al guardar el ciclo. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }, [startDate, endDate, initialData, onSuccess, validate]);

  const dismissSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  return {
    startDate,
    endDate,
    error,
    submitting,
    successMessage,
    setStartDate,
    setEndDate,
    handleSubmit,
    dismissSuccess,
  };
}
