import Dexie, { type EntityTable, type Table } from "dexie";

export type SyncStatus = "synced" | "pending" | "conflict";

export interface OfflineCycle {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string | null;
  duration_days: number | null;
  created_at: string;
  updated_at: string;
  _syncStatus: SyncStatus;
  _syncedAt: string | null;
}

export interface OfflineDailyLog {
  id: string;
  cycle_id: string;
  date: string;
  flow_level: string | null;
  temperature: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  _syncStatus: SyncStatus;
  _syncedAt: string | null;
}

export interface OfflineDailySymptom {
  log_id: string;
  symptom_id: number;
  intensity: number;
  _syncStatus: SyncStatus;
}

export interface OfflineSymptomCatalog {
  id: number;
  name: string;
  category: string;
  common_phase: string | null;
}

export interface SyncOperation {
  id?: number;
  entity: "cycle" | "dailyLog" | "dailySymptom";
  operation: "create" | "update" | "delete";
  entityId: string;
  payload: unknown;
  createdAt: string;
  retryCount: number;
}

const db = new Dexie("EVAOffline") as Dexie & {
  cycles: EntityTable<OfflineCycle, "id">;
  dailyLogs: EntityTable<OfflineDailyLog, "id">;
  dailySymptoms: Table<OfflineDailySymptom>;
  symptomsCatalog: EntityTable<OfflineSymptomCatalog, "id">;
  syncQueue: EntityTable<SyncOperation, "id">;
};

db.version(1).stores({
  cycles: "id, user_id, start_date, _syncStatus",
  dailyLogs: "id, cycle_id, date, _syncStatus",
  dailySymptoms: "[log_id+symptom_id], log_id, symptom_id",
  symptomsCatalog: "id, category",
  syncQueue: "++id, entity, operation, createdAt",
});

export type EVAOfflineDB = typeof db;
export default db;
