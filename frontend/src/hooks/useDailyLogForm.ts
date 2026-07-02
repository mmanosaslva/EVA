import { useState, useEffect, useCallback } from "react";
import type { SymptomResponse, DailyLogResponse } from "../lib/types";
import {
  getSymptomsCatalog,
  getDailyLogByDate,
  createDailyLog,
  updateDailyLog,
} from "../services/symptomService";

export type FlowLevel = "none" | "light" | "medium" | "heavy";

export interface UseDailyLogFormReturn {
  symptomsCatalog: SymptomResponse[];
  loading: boolean;
  error: string | null;
  selectedSymptoms: Record<number, number>;
  flowLevel: FlowLevel;
  temperature: string;
  notes: string;
  saving: boolean;
  success: boolean;
  existingLog: DailyLogResponse | null;
  toggleSymptom: (symptomId: number) => void;
  setIntensity: (symptomId: number, intensity: number) => void;
  setFlowLevel: (level: FlowLevel) => void;
  setTemperature: (value: string) => void;
  setNotes: (value: string) => void;
  submit: () => Promise<void>;
}

interface UseDailyLogFormOptions {
  date: string;
  cycleId: string;
  onSuccess?: () => void;
}

const FLOW_LABELS: Record<FlowLevel, string> = {
  none: "Ninguno",
  light: "Leve",
  medium: "Medio",
  heavy: "Abundante",
};

export { FLOW_LABELS };

export function useDailyLogForm({
  date,
  cycleId,
  onSuccess,
}: UseDailyLogFormOptions): UseDailyLogFormReturn {
  const [symptomsCatalog, setSymptomsCatalog] = useState<SymptomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<
    Record<number, number>
  >({});
  const [flowLevel, setFlowLevelState] = useState<FlowLevel>("none");
  const [temperature, setTemperature] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [existingLog, setExistingLog] = useState<DailyLogResponse | null>(null);

  // Load catalog + existing log
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [catalog, log] = await Promise.all([
          getSymptomsCatalog(),
          getDailyLogByDate(cycleId, date),
        ]);
        if (!cancelled) {
          setSymptomsCatalog(catalog);
          if (log) {
            setExistingLog(log);
            const symptomsMap: Record<number, number> = {};
            for (const s of log.symptoms) {
              symptomsMap[s.symptom_id] = s.intensity;
            }
            setSelectedSymptoms(symptomsMap);
            setFlowLevelState((log.flow_level as FlowLevel) || "none");
            setTemperature(
              log.temperature !== null ? String(log.temperature) : "",
            );
            setNotes(log.notes ?? "");
          }
        }
      } catch {
        if (!cancelled) {
          setError("No se pudo cargar el formulario. Intenta de nuevo.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [cycleId, date]);

  const toggleSymptom = useCallback((symptomId: number) => {
    setSelectedSymptoms((prev) => {
      const next = { ...prev };
      if (symptomId in next) {
        delete next[symptomId];
      } else {
        next[symptomId] = 1;
      }
      return next;
    });
  }, []);

  const setIntensity = useCallback(
    (symptomId: number, intensity: number) => {
      setSelectedSymptoms((prev) => {
        if (!(symptomId in prev)) return prev;
        return { ...prev, [symptomId]: intensity };
      });
    },
    [],
  );

  const setFlowLevel = useCallback((level: FlowLevel) => {
    setFlowLevelState(level);
  }, []);

  const submit = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const symptomsPayload = Object.entries(selectedSymptoms).map(
        ([id, intensity]) => ({
          symptom_id: Number(id),
          intensity,
        }),
      );

      if (existingLog) {
        await updateDailyLog(existingLog.id, {
          flow_level: flowLevel,
          temperature: temperature ? parseFloat(temperature) : null,
          notes: notes || null,
          symptoms: symptomsPayload,
        });
      } else {
        await createDailyLog({
          cycle_id: cycleId,
          date,
          flow_level: flowLevel,
          temperature: temperature ? parseFloat(temperature) : undefined,
          notes: notes || undefined,
          symptoms: symptomsPayload,
        });
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al guardar el registro. Intenta de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  }, [selectedSymptoms, flowLevel, temperature, notes, existingLog, cycleId, date, onSuccess]);

  return {
    symptomsCatalog,
    loading,
    error,
    selectedSymptoms,
    flowLevel,
    temperature,
    notes,
    saving,
    success,
    existingLog,
    toggleSymptom,
    setIntensity,
    setFlowLevel,
    setTemperature,
    setNotes,
    submit,
  };
}
