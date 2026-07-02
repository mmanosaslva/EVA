import { useState, useEffect, useCallback } from "react";
import type { InsightMessage } from "../services/insightService";
import { getInsightsHistory, postInsight } from "../services/insightService";

interface UseInsightsReturn {
  messages: InsightMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  sendQuestion: (text: string) => Promise<void>;
}

export function useInsights(): UseInsightsReturn {
  const [messages, setMessages] = useState<InsightMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const history = await getInsightsHistory();
        if (!cancelled) setMessages(history);
      } catch {
        if (!cancelled) setError("No se pudo cargar el historial");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true;     };
  }, []);

  const sendQuestion = useCallback(async (text: string) => {
    const userMsg: InsightMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setError(null);

    try {
      const data = await postInsight(text);
      const evaMsg: InsightMessage = {
        id: `e-${Date.now()}`,
        role: "eva",
        content: data.insight,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, evaMsg]);
    } catch {
      setError("No se pudo obtener respuesta. Intentá de nuevo.");
    } finally {
      setSending(false);
    }
  }, []);

  return { messages, loading, sending, error, sendQuestion };
}
