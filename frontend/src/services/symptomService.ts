import type { SymptomResponse, DailyLogResponse, DailyLogListResponse, SymptomLogEntry } from "../lib/types";
import { api } from "./apiClient";
import { getSymptomsCatalog as getCachedCatalog } from "../db/logStore";
import { saveLog, saveSymptoms } from "../db/logStore";
import { enqueue } from "../db";

export async function getSymptomsCatalog(): Promise<SymptomResponse[]> {
  try {
    return await api.get<SymptomResponse[]>("/symptoms");
  } catch {
    const cached = await getCachedCatalog();
    if (cached.length > 0) {
      return cached.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        common_phase: s.common_phase,
      }));
    }
    throw new Error("No se pudo cargar el catálogo de síntomas");
  }
}

export async function getDailyLogsByCycle(cycleId: string): Promise<DailyLogResponse[]> {
  const result = await api.get<DailyLogListResponse>("/daily-logs", { cycle_id: cycleId });
  return result.logs;
}

export async function getDailyLogByDate(
  cycleId: string,
  date: string,
): Promise<DailyLogResponse | null> {
  try {
    const result = await api.get<DailyLogListResponse>("/daily-logs", { cycle_id: cycleId });
    return result.logs.find((l) => l.date === date) ?? null;
  } catch {
    return null;
  }
}

export async function createDailyLog(data: {
  cycle_id: string;
  date: string;
  flow_level?: string;
  temperature?: number;
  notes?: string;
  symptoms: { symptom_id: number; intensity: number }[];
}): Promise<DailyLogResponse> {
  const now = new Date().toISOString();

  try {
    const result = await api.post<DailyLogResponse>("/daily-logs", data);
    cacheLog(result);
    return result;
  } catch {
    const localId = `offline-${Date.now()}`;
    const symptomEntries: SymptomLogEntry[] = data.symptoms.map((s) => ({
      symptom_id: s.symptom_id,
      name: `Síntoma ${s.symptom_id}`,
      category: "otra",
      common_phase: null,
      intensity: s.intensity,
    }));

    const localLog: DailyLogResponse = {
      id: localId,
      cycle_id: data.cycle_id,
      date: data.date,
      flow_level: data.flow_level ?? null,
      temperature: data.temperature ?? null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
      symptoms: symptomEntries,
    };

    try {
      await saveLog({
        id: localId,
        cycle_id: data.cycle_id,
        date: data.date,
        flow_level: data.flow_level ?? "none",
        temperature: data.temperature ?? null,
        notes: data.notes ?? null,
        created_at: now,
        updated_at: now,
      }, "pending");

      if (data.symptoms.length > 0) {
        await saveSymptoms(
          data.symptoms.map((s) => ({
            log_id: localId,
            symptom_id: s.symptom_id,
            intensity: s.intensity,
          })),
        );
      }

      await enqueue({
        entity: "dailyLog",
        operation: "create",
        entityId: localId,
        payload: data as unknown as Record<string, unknown>,
        createdAt: now,
        retryCount: 0,
      });
    } catch {
      // IndexedDB no disponible
    }
    return localLog;
  }
}

function cacheLog(log: DailyLogResponse): void {
  try {
    saveLog({
      id: log.id,
      cycle_id: log.cycle_id,
      date: log.date,
      flow_level: log.flow_level ?? "none",
      temperature: log.temperature,
      notes: log.notes,
      created_at: log.created_at,
      updated_at: log.updated_at,
    }, "synced");

    if (log.symptoms.length > 0) {
      saveSymptoms(
        log.symptoms.map((s) => ({
          log_id: log.id,
          symptom_id: s.symptom_id,
          intensity: s.intensity,
        })),
      );
    }
  } catch {
    // IndexedDB no disponible
  }
}

export async function updateDailyLog(
  logId: string,
  data: {
    date?: string;
    flow_level?: string;
    temperature?: number | null;
    notes?: string | null;
    symptoms?: { symptom_id: number; intensity: number }[];
    cycle_id?: string;
  },
): Promise<DailyLogResponse> {
  try {
    const result = await api.put<DailyLogResponse>(`/daily-logs/${logId}`, data);
    cacheLog(result);
    return result;
  } catch {
    const now = new Date().toISOString();
    const symptomEntries: SymptomLogEntry[] = (data.symptoms || []).map((s) => ({
      symptom_id: s.symptom_id,
      name: `Síntoma ${s.symptom_id}`,
      category: "otra",
      common_phase: null,
      intensity: s.intensity,
    }));

    const localLog: DailyLogResponse = {
      id: logId,
      cycle_id: data.cycle_id ?? "",
      date: data.date ?? "",
      flow_level: data.flow_level ?? null,
      temperature: data.temperature ?? null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
      symptoms: symptomEntries,
    };

    try {
      await saveLog({
        id: logId,
        cycle_id: data.cycle_id ?? "",
        date: data.date ?? "",
        flow_level: data.flow_level ?? "none",
        temperature: data.temperature ?? null,
        notes: data.notes ?? null,
        created_at: now,
        updated_at: now,
      }, "pending");

      if (data.symptoms && data.symptoms.length > 0) {
        await saveSymptoms(
          data.symptoms.map((s) => ({
            log_id: logId,
            symptom_id: s.symptom_id,
            intensity: s.intensity,
          })),
        );
      }

      await enqueue({
        entity: "dailyLog",
        operation: "update",
        entityId: logId,
        payload: data as unknown as Record<string, unknown>,
        createdAt: now,
        retryCount: 0,
      });
    } catch {
      // IndexedDB no disponible
    }
    return localLog;
  }
}

export async function deleteDailyLog(logId: string): Promise<void> {
  try {
    await api.delete(`/daily-logs/${logId}`);
  } catch {
    const now = new Date().toISOString();
    try {
      await enqueue({
        entity: "dailyLog",
        operation: "delete",
        entityId: logId,
        payload: {},
        createdAt: now,
        retryCount: 0,
      });
    } catch {
      // IndexedDB no disponible
    }
    throw new Error("No se pudo eliminar el registro en este momento");
  }
}
