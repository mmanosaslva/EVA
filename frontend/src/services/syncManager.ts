import { api } from "./apiClient";
import { peekAll, dequeue, queueLength, markCycleSynced, markLogSynced } from "../db";

type SyncStatusCallback = (status: SyncStatusState) => void;

export interface SyncStatusState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncResult: "success" | "error" | null;
  lastSyncMessage: string;
}

interface SyncResponse {
  applied: number;
  skipped: number;
  failed: number;
  results: { client_id: string; status: string; server_id?: string; error?: string }[];
}

let listeners: SyncStatusCallback[] = [];
const currentStatus: SyncStatusState = {
  isSyncing: false,
  pendingCount: 0,
  lastSyncResult: null,
  lastSyncMessage: "",
};

function notify() {
  for (const listener of listeners) {
    listener({ ...currentStatus });
  }
}

export function subscribeToSyncStatus(cb: SyncStatusCallback) {
  listeners.push(cb);
  cb({ ...currentStatus });
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function getSyncStatus(): SyncStatusState {
  return { ...currentStatus };
}

async function updatePendingCount() {
  currentStatus.pendingCount = await queueLength();
  notify();
}

export async function processSyncQueue(): Promise<void> {
  if (currentStatus.isSyncing) return;

  if (!navigator.onLine) {
    currentStatus.lastSyncResult = "error";
    currentStatus.lastSyncMessage = "Sin conexión a internet";
    notify();
    return;
  }

  currentStatus.isSyncing = true;
  currentStatus.lastSyncResult = null;
  notify();

  const operations = await peekAll();
  if (operations.length === 0) {
    currentStatus.isSyncing = false;
    currentStatus.lastSyncResult = "success";
    currentStatus.lastSyncMessage = "No hay operaciones pendientes";
    notify();
    return;
  }

  currentStatus.lastSyncMessage = `Sincronizando ${operations.length} operación(es)...`;
  notify();

  let successCount = 0;
  let failCount = 0;

  const typeMap: Record<string, string> = {
    "cycle-create": "CREATE_CYCLE",
    "cycle-update": "UPDATE_CYCLE",
    "cycle-delete": "DELETE_CYCLE",
    "dailyLog-create": "CREATE_DAILY_LOG",
    "dailyLog-update": "UPDATE_DAILY_LOG",
    "dailyLog-delete": "DELETE_DAILY_LOG",
  };

  const syncOps = operations.map((op) => {
    const typeKey = `${op.entity}-${op.operation}`;
    return {
      client_id: `${op.entity}-${op.entityId}-${op.createdAt}`,
      type: typeMap[typeKey] || `${op.operation}_${op.entity}`.toUpperCase(),
      payload: op.payload as Record<string, unknown>,
      client_timestamp: op.createdAt,
    };
  });

  try {
    const result = await api.post<SyncResponse>("/sync", { operations: syncOps });

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const serverStatus = result.results?.[i]?.status;

      if (serverStatus === "applied") {
        await dequeue();
        if (op.entity === "cycle") {
          await markCycleSynced(op.entityId);
        } else {
          await markLogSynced(op.entityId);
        }
        successCount++;
      } else {
        failCount++;
      }
    }
  } catch {
    failCount = operations.length;
  }

  currentStatus.isSyncing = false;
  currentStatus.pendingCount = await queueLength();

  if (failCount === 0) {
    currentStatus.lastSyncResult = "success";
    currentStatus.lastSyncMessage = `Datos sincronizados ✓ (${successCount} operación(es))`;
  } else {
    currentStatus.lastSyncResult = "error";
    currentStatus.lastSyncMessage = `${successCount} sincronizadas, ${failCount} fallaron`;
  }

  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    processSyncQueue();
  });

  updatePendingCount();

  if (navigator.onLine) {
    processSyncQueue();
  }
}
