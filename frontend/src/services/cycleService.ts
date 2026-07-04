import type { Cycle, CyclesResponse } from "../lib/types";
import { apiClient } from "./apiClient";

let cyclesCache: CyclesResponse | null = null;

export async function getCycles(): Promise<CyclesResponse> {
  if (cyclesCache) return cyclesCache;
  cyclesCache = await apiClient<CyclesResponse>("/cycles");
  return cyclesCache;
}

export async function createCycle(data: {
  start_date: string;
  end_date?: string;
}): Promise<Cycle> {
  const result = await apiClient<Cycle>("/cycles", { method: "POST", body: data });
  cyclesCache = null;
  return result;
}

export async function updateCycle(
  id: string,
  data: { start_date?: string; end_date?: string },
): Promise<Cycle> {
  const result = await apiClient<Cycle>(`/cycles/${id}`, { method: "PUT", body: data });
  cyclesCache = null;
  return result;
}

export function invalidateCycleCache(): void {
  cyclesCache = null;
}
