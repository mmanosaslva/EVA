import db, {
  type OfflineDailyLog,
  type OfflineDailySymptom,
  type OfflineSymptomCatalog,
  type SyncStatus,
} from "./database";

/* ───── Daily Logs ───── */

export async function getLogsByCycle(
  cycleId: string,
): Promise<OfflineDailyLog[]> {
  return db.dailyLogs
    .where("cycle_id")
    .equals(cycleId)
    .sortBy("date");
}

export async function getLogById(
  id: string,
): Promise<OfflineDailyLog | undefined> {
  return db.dailyLogs.get(id);
}

export async function saveLog(
  data: Omit<OfflineDailyLog, "_syncStatus" | "_syncedAt">,
  syncStatus: SyncStatus = "pending",
): Promise<string> {
  const now = new Date().toISOString();
  await db.dailyLogs.put({
    ...data,
    _syncStatus: syncStatus,
    _syncedAt: syncStatus === "synced" ? now : null,
  });
  return data.id;
}

export async function bulkSaveLogs(
  logs: Omit<OfflineDailyLog, "_syncStatus" | "_syncedAt">[],
): Promise<void> {
  const now = new Date().toISOString();
  await db.dailyLogs.bulkPut(
    logs.map((l) => ({
      ...l,
      _syncStatus: "synced" as SyncStatus,
      _syncedAt: now,
    })),
  );
}

export async function updateLogOffline(
  id: string,
  changes: Partial<Omit<OfflineDailyLog, "id" | "_syncStatus" | "_syncedAt">>,
): Promise<void> {
  await db.dailyLogs.update(id, {
    ...changes,
    _syncStatus: "pending",
  });
}

export async function deleteLogOffline(id: string): Promise<void> {
  await db.dailyLogs.delete(id);
}

/* ───── Daily Symptoms ───── */

export async function getSymptomsByLog(
  logId: string,
): Promise<OfflineDailySymptom[]> {
  return db.dailySymptoms.where("log_id").equals(logId).toArray();
}

export async function saveSymptoms(
  symptoms: Omit<OfflineDailySymptom, "_syncStatus">[],
): Promise<void> {
  await db.dailySymptoms.bulkPut(
    symptoms.map((s) => ({ ...s, _syncStatus: "pending" as SyncStatus })),
  );
}

export async function deleteSymptomsByLog(logId: string): Promise<void> {
  await db.dailySymptoms.where("log_id").equals(logId).delete();
}

/* ───── Symptoms Catalog ───── */

export async function getSymptomsCatalog(): Promise<OfflineSymptomCatalog[]> {
  return db.symptomsCatalog.toArray();
}

export async function bulkSaveCatalog(
  symptoms: OfflineSymptomCatalog[],
): Promise<void> {
  await db.symptomsCatalog.bulkPut(symptoms);
}

/* ───── Unsynced helpers ───── */

export async function getUnsyncedLogs(): Promise<OfflineDailyLog[]> {
  return db.dailyLogs.where("_syncStatus").equals("pending").toArray();
}

export async function markLogSynced(id: string): Promise<void> {
  await db.dailyLogs.update(id, {
    _syncStatus: "synced",
    _syncedAt: new Date().toISOString(),
  });
}
