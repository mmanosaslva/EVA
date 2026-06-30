import { useState, useEffect, useCallback } from "react";
import type { Cycle } from "../lib/types";
import { getCycles } from "../services/cycleService";

interface UseCyclesReturn {
  cycles: Cycle[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCycles(): UseCyclesReturn {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getCycles();
        if (!cancelled) {
          setCycles(data.cycles);
        }
      } catch {
        if (!cancelled) {
          setError("No se pudieron cargar los ciclos");
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
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCycles();
      setCycles(data.cycles);
    } catch {
      setError("No se pudieron cargar los ciclos");
    } finally {
      setLoading(false);
    }
  }, []);

  return { cycles, loading, error, refetch };
}
