import db, { type OfflineCycle, type SyncStatus } from "./database";

export async function getAllCycles(): Promise<OfflineCycle[]> {
  return db.cycles.orderBy("start_date").reverse().toArray();
}

export async function getCycleById(id: string): Promise<OfflineCycle | undefined> {
  return db.cycles.get(id);
}

export async function saveCycle(
  data: Omit<OfflineCycle, "_syncStatus" | "_syncedAt">,
  syncStatus: SyncStatus = "pending",
): Promise<string> {
  const now = new Date().toISOString();
  await db.cycles.put({
    ...data,
    _syncStatus: syncStatus,
    _syncedAt: syncStatus === "synced" ? now : null,
  });
  return data.id;
}

export async function bulkSaveCycles(
  cycles: Omit<OfflineCycle, "_syncStatus" | "_syncedAt">[],
): Promise<void> {
  const now = new Date().toISOString();
  await db.cycles.bulkPut(
    cycles.map((c) => ({
      ...c,
      _syncStatus: "synced" as SyncStatus,
      _syncedAt: now,
    })),
  );
}

export async function updateCycleOffline(
  id: string,
  changes: Partial<Omit<OfflineCycle, "id" | "_syncStatus" | "_syncedAt">>,
): Promise<void> {
  await db.cycles.update(id, {
    ...changes,
    _syncStatus: "pending",
  });
}

export async function deleteCycleOffline(id: string): Promise<void> {
  await db.cycles.delete(id);
}

export async function getUnsyncedCycles(): Promise<OfflineCycle[]> {
  return db.cycles.where("_syncStatus").equals("pending").toArray();
}

export async function markCycleSynced(id: string): Promise<void> {
  await db.cycles.update(id, {
    _syncStatus: "synced",
    _syncedAt: new Date().toISOString(),
  });
}
