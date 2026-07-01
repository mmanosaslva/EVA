import { useState, useCallback } from "react";
import type { DailyLog, DailySymptom } from "../lib/types";
import { createDailyLog, updateDailyLog } from "../services/dailyLogService";

interface UseDailyLogFormOptions {
  cycleId: string;
  date: string;
  initialData?: DailyLog | null;
  onSuccess: () => void;
}

interface SelectedSymptom {
  symptom_id: number;
  name: string;
  category: string;
  intensity: number;
}

interface UseDailyLogFormReturn {
  selectedSymptoms: Map<number, SelectedSymptom>;
  flowLevel: string;
  temperature: string;
  notes: string;
  error: string | null;
  submitting: boolean;
  successMessage: string | null;
  toggleSymptom: (symptom: { id: number; name: string; category: string }) => void;
  setIntensity: (symptomId: number, intensity: number) => void;
  setFlowLevel: (v: string) => void;
  setTemperature: (v: string) => void;
  setNotes: (v: string) => void;
  handleSubmit: () => Promise<void>;
  dismissSuccess: () => void;
}

function buildInitialSymptoms(data: DailyLog | null | undefined): Map<number, SelectedSymptom> {
  if (!data) return new Map();
  const map = new Map<number, SelectedSymptom>();
  data.symptoms.forEach((s) =>
    map.set(s.symptom_id, {
      symptom_id: s.symptom_id,
      name: s.name,
      category: s.category,
      intensity: s.intensity,
    }),
  );
  return map;
}

export function useDailyLogForm({
  cycleId,
  date,
  initialData,
  onSuccess,
}: UseDailyLogFormOptions): UseDailyLogFormReturn {
  const [selectedSymptoms, setSelectedSymptoms] = useState<
    Map<number, SelectedSymptom>
  >(() => buildInitialSymptoms(initialData));
  const [flowLevel, setFlowLevel] = useState<string>(
    initialData?.flow_level ?? "none",
  );
  const [temperature, setTemperature] = useState(
    initialData?.temperature?.toString() ?? "",
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleSymptom = useCallback(
    (symptom: { id: number; name: string; category: string }) => {
      setSelectedSymptoms((prev) => {
        const next = new Map(prev);
        if (next.has(symptom.id)) {
          next.delete(symptom.id);
        } else {
          next.set(symptom.id, {
            symptom_id: symptom.id,
            name: symptom.name,
            category: symptom.category,
            intensity: 3,
          });
        }
        return next;
      });
      setError(null);
    },
    [],
  );

  const setIntensity = useCallback((symptomId: number, intensity: number) => {
    setSelectedSymptoms((prev) => {
      const next = new Map(prev);
      const existing = next.get(symptomId);
      if (existing) {
        next.set(symptomId, { ...existing, intensity });
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const symptomsArray: DailySymptom[] = Array.from(
      selectedSymptoms.values(),
    ).map((s) => ({
      symptom_id: s.symptom_id,
      name: s.name,
      category: s.category,
      intensity: s.intensity,
    }));

    const tempValue = temperature ? parseFloat(temperature) : null;

    if (
      temperature &&
      (isNaN(tempValue!) || tempValue! < 35 || tempValue! > 42)
    ) {
      setError("La temperatura debe estar entre 35°C y 42°C");
      return;
    }

    setError(null);
    setSubmitting(true);
    setSuccessMessage(null);

    try {
      if (initialData) {
        await updateDailyLog(initialData.id, cycleId, {
          flow_level: flowLevel,
          temperature: tempValue,
          notes: notes || null,
          symptoms: symptomsArray,
        });
        setSuccessMessage("Registro actualizado correctamente");
      } else {
        await createDailyLog({
          cycle_id: cycleId,
          date,
          flow_level: flowLevel,
          temperature: tempValue,
          notes: notes || null,
          symptoms: symptomsArray,
        });
        setSuccessMessage("Registro guardado correctamente");
      }

      setTimeout(onSuccess, 800);
    } catch {
      setError("Ocurrió un error al guardar. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }, [selectedSymptoms, flowLevel, temperature, notes, cycleId, date, initialData, onSuccess]);

  const dismissSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  return {
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
  };
}
