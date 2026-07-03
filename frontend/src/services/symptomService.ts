import type { SymptomCatalog, DailyLog, DailyLogListResponse } from "../lib/types";
import { apiClient } from "./apiClient";

let catalogCache: SymptomCatalog[] | null = null;

const logsCache = new Map<string, DailyLog[]>();

export async function getSymptomsCatalog(): Promise<SymptomCatalog[]> {
  if (catalogCache) return catalogCache;
  catalogCache = await apiClient<SymptomCatalog[]>("/symptoms");
  return catalogCache;
}

export async function getDailyLogsByCycle(cycleId: string): Promise<DailyLog[]> {
  if (logsCache.has(cycleId)) return logsCache.get(cycleId)!;
  const data = await apiClient<DailyLogListResponse>(
    `/daily-logs?cycle_id=${cycleId}`,
  );
  logsCache.set(cycleId, data.logs);
  return data.logs;
}

export async function getDailyLogByDate(
  cycleId: string,
  date: string,
): Promise<DailyLog | null> {
  const logs = await getDailyLogsByCycle(cycleId);
  return logs.find((l) => l.date === date) ?? null;
}

export async function createDailyLog(data: {
  cycle_id: string;
  date: string;
  flow_level?: string;
  temperature?: number;
  notes?: string;
  symptoms: { symptom_id: number; intensity: number }[];
}): Promise<DailyLog> {
  const result = await apiClient<DailyLog>("/daily-logs", { method: "POST", body: data });
  logsCache.delete(data.cycle_id);
  return result;
}

export async function updateDailyLog(
  logId: string,
  data: {
    date?: string;
    flow_level?: string;
    temperature?: number | null;
    notes?: string | null;
    symptoms?: { symptom_id: number; intensity: number }[];
  },
): Promise<DailyLog> {
  const result = await apiClient<DailyLog>(`/daily-logs/${logId}`, {
    method: "PUT",
    body: data,
  });
  logsCache.clear();
  return result;
}
