import { useState, useEffect, useCallback } from "react";
import type { DailyLog } from "../lib/types";
import { getDailyLogsByCycle } from "../services/symptomService";

interface UseDailyLogsReturn {
  logs: DailyLog[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDailyLogs(cycleId: string): UseDailyLogsReturn {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDailyLogsByCycle(cycleId);
        if (!cancelled) {
          setLogs(data);
        }
      } catch {
        if (!cancelled) {
          setError("No se pudieron cargar los registros del ciclo");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [cycleId]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDailyLogsByCycle(cycleId);
      setLogs(data);
    } catch {
      setError("No se pudieron cargar los registros del ciclo");
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  return { logs, loading, error, refetch };
}
