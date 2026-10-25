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
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loading = Boolean(cycleId) && fetching;

  useEffect(() => {
    if (!cycleId) return;

    let cancelled = false;

    async function load() {
      setFetching(true);
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
          setFetching(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [cycleId]);

  const refetch = useCallback(async () => {
    if (!cycleId) return;

    setFetching(true);
    setError(null);
    try {
      const data = await getDailyLogsByCycle(cycleId);
      setLogs(data);
    } catch {
      setError("No se pudieron cargar los registros del ciclo");
    } finally {
      setFetching(false);
    }
  }, [cycleId]);

  return { logs, loading, error, refetch };
}
