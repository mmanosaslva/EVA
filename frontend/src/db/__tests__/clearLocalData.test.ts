import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { clears } = vi.hoisted(() => ({ clears: [vi.fn(), vi.fn()] }));

vi.mock("../database", () => ({
  default: { tables: clears.map((clear) => ({ clear })) },
}));
vi.mock("../../services/cycleService", () => ({ invalidateCycleCache: vi.fn() }));
vi.mock("../../services/symptomService", () => ({ invalidateSymptomCaches: vi.fn() }));

import { clearLocalData } from "../clearLocalData";
import { invalidateCycleCache } from "../../services/cycleService";
import { invalidateSymptomCaches } from "../../services/symptomService";

describe("clearLocalData", () => {
  const deleted: string[] = [];

  beforeEach(() => {
    clears.forEach((c) => c.mockReset());
    deleted.length = 0;
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue(["eva-api", "workbox-precache-v2", "supabase-api"]),
      delete: vi.fn(async (name: string) => {
        deleted.push(name);
        return true;
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("vacía todas las tablas de IndexedDB y los cachés en memoria", async () => {
    await clearLocalData();
    clears.forEach((c) => expect(c).toHaveBeenCalledOnce());
    expect(invalidateCycleCache).toHaveBeenCalled();
    expect(invalidateSymptomCaches).toHaveBeenCalled();
  });

  it("borra solo las cachés de API, no el precache de la app", async () => {
    await clearLocalData();
    expect(deleted.sort()).toEqual(["eva-api", "supabase-api"]);
  });

  it("no falla si IndexedDB no está disponible", async () => {
    clears[0].mockRejectedValue(new Error("IndexedDB bloqueado"));
    await expect(clearLocalData()).resolves.toBeUndefined();
  });
});
