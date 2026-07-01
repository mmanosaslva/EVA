import db, { type SyncOperation } from "./database";

export async function enqueue(op: Omit<SyncOperation, "id">): Promise<void> {
  await db.syncQueue.add(op);
}

export async function dequeue(): Promise<SyncOperation | undefined> {
  const next = await db.syncQueue.orderBy("createdAt").first();
  if (next) await db.syncQueue.delete(next.id!);
  return next;
}

export async function peekAll(): Promise<SyncOperation[]> {
  return db.syncQueue.orderBy("createdAt").toArray();
}

export async function queueLength(): Promise<number> {
  return db.syncQueue.count();
}

export async function clearQueue(): Promise<void> {
  await db.syncQueue.clear();
}
