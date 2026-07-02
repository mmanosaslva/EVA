import { api } from "./apiClient";
import type { CycleResponse, CycleListResponse } from "../lib/types";
import { saveCycle, getAllCycles } from "../db";
import { enqueue } from "../db";

function mapOfflineToCycleResponse(c: {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string | null;
  duration_days: number | null;
  created_at: string;
  updated_at: string;
}): CycleResponse {
  return {
    id: c.id,
    user_id: c.user_id,
    start_date: c.start_date,
    end_date: c.end_date,
    duration_days: c.duration_days,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

function persistCycle(cycle: CycleResponse, status: "synced" | "pending"): void {
  try {
    saveCycle({
      id: cycle.id,
      user_id: cycle.user_id,
      start_date: cycle.start_date,
      end_date: cycle.end_date,
      duration_days: cycle.duration_days ?? 0,
      created_at: cycle.created_at,
      updated_at: cycle.updated_at,
    }, status);
  } catch {
    // IndexedDB no disponible
  }
}

export async function getCycles(): Promise<CycleListResponse> {
  try {
    return await api.get<CycleListResponse>("/cycles");
  } catch {
    const cached = await getAllCycles();
    if (cached.length > 0) {
      return {
        total: cached.length,
        limit: cached.length,
        offset: 0,
        cycles: cached.map(mapOfflineToCycleResponse),
      };
    }
    throw new Error("No se pudieron cargar los ciclos");
  }
}

export async function createCycle(data: {
  start_date: string;
  end_date?: string;
}): Promise<CycleResponse> {
  const body: Record<string, string> = { start_date: data.start_date };
  if (data.end_date) body.end_date = data.end_date;

  try {
    const result = await api.post<CycleResponse>("/cycles", body);
    persistCycle(result, "synced");
    return result;
  } catch {
    const localId = `offline-${Date.now()}`;
    const now = new Date().toISOString();
    const localCycle: CycleResponse = {
      id: localId,
      user_id: "offline-user",
      start_date: data.start_date,
      end_date: data.end_date ?? null,
      duration_days: null,
      created_at: now,
      updated_at: now,
    };
    persistCycle(localCycle, "pending");

    try {
      await enqueue({
        entity: "cycle",
        operation: "create",
        entityId: localId,
        payload: body,
        createdAt: now,
        retryCount: 0,
      });
    } catch {
      // IndexedDB no disponible
    }
    return localCycle;
  }
}

export async function updateCycle(
  id: string,
  data: { start_date?: string; end_date?: string },
): Promise<CycleResponse> {
  const body: Record<string, string> = {};
  if (data.start_date) body.start_date = data.start_date;
  if (data.end_date !== undefined) body.end_date = data.end_date;

  try {
    const result = await api.put<CycleResponse>(`/cycles/${id}`, body);
    persistCycle(result, "synced");
    return result;
  } catch {
    const now = new Date().toISOString();
    const localCycle: CycleResponse = {
      id,
      user_id: "offline-user",
      start_date: data.start_date ?? "",
      end_date: data.end_date ?? null,
      duration_days: null,
      created_at: now,
      updated_at: now,
    };
    persistCycle(localCycle, "pending");

    try {
      await enqueue({
        entity: "cycle",
        operation: "update",
        entityId: id,
        payload: body,
        createdAt: now,
        retryCount: 0,
      });
    } catch {
      // IndexedDB no disponible
    }
    return localCycle;
  }
}

export async function deleteCycle(cycleId: string): Promise<void> {
  try {
    await api.delete(`/cycles/${cycleId}`);
  } catch {
    const now = new Date().toISOString();
    try {
      await enqueue({
        entity: "cycle",
        operation: "delete",
        entityId: cycleId,
        payload: {},
        createdAt: now,
        retryCount: 0,
      });
    } catch {
      // IndexedDB no disponible
    }
    throw new Error("No se pudo eliminar el ciclo en este momento");
  }
}
