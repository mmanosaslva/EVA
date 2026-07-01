import type { Cycle, CyclesResponse } from "../lib/types";
import { saveCycle, enqueue } from "../db";

const MOCK_CYCLES: Cycle[] = [
  {
    id: "c3-5e7a-4b1d-9f3c-8a2e1d4b6f00",
    start_date: "2026-06-27",
    end_date: null,
    duration_days: 4,
    created_at: "2026-06-27T08:00:00Z",
  },
  {
    id: "c2-4d6b-3c2e-8f1a-7b9d0c5e3a11",
    start_date: "2026-05-29",
    end_date: "2026-06-02",
    duration_days: 5,
    created_at: "2026-05-29T09:00:00Z",
  },
  {
    id: "c1-3a5c-2b1d-7e9f-6d8c0b4a2e22",
    start_date: "2026-04-30",
    end_date: "2026-05-04",
    duration_days: 5,
    created_at: "2026-04-30T07:30:00Z",
  },
  {
    id: "c0-2b4a-1c0d-6e8f-5c7b0a3d1e33",
    start_date: "2026-03-31",
    end_date: "2026-04-04",
    duration_days: 5,
    created_at: "2026-03-31T08:00:00Z",
  },
];

export async function getCycles(): Promise<CyclesResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    total: MOCK_CYCLES.length,
    limit: 20,
    offset: 0,
    cycles: MOCK_CYCLES,
  };
}

export async function createCycle(data: {
  start_date: string;
  end_date?: string;
}): Promise<Cycle> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const newCycle: Cycle = {
    id: `c-${Date.now()}`,
    start_date: data.start_date,
    end_date: data.end_date ?? null,
    duration_days: data.end_date
      ? Math.floor(
          (new Date(data.end_date).getTime() -
            new Date(data.start_date).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 0,
    created_at: new Date().toISOString(),
  };

  MOCK_CYCLES.unshift(newCycle);

  try {
    await saveCycle(
      {
        id: newCycle.id,
        user_id: "offline-user",
        start_date: newCycle.start_date,
        end_date: newCycle.end_date,
        duration_days: newCycle.duration_days,
        created_at: newCycle.created_at,
        updated_at: newCycle.created_at,
      },
      "pending",
    );

    await enqueue({
      entity: "cycle",
      operation: "create",
      entityId: newCycle.id,
      payload: data,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });
  } catch {
    // IndexedDB no disponible, continuar sin persistencia
  }

  return newCycle;
}

export async function updateCycle(
  id: string,
  data: { start_date?: string; end_date?: string },
): Promise<Cycle> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const idx = MOCK_CYCLES.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Cycle not found");

  MOCK_CYCLES[idx] = {
    ...MOCK_CYCLES[idx],
    ...data,
    duration_days: data.end_date
      ? Math.floor(
          (new Date(data.end_date).getTime() -
            new Date(MOCK_CYCLES[idx].start_date).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : MOCK_CYCLES[idx].duration_days,
  };

  try {
    await saveCycle(
      {
        id: MOCK_CYCLES[idx].id,
        user_id: "offline-user",
        start_date: MOCK_CYCLES[idx].start_date,
        end_date: MOCK_CYCLES[idx].end_date,
        duration_days: MOCK_CYCLES[idx].duration_days,
        created_at: MOCK_CYCLES[idx].created_at,
        updated_at: new Date().toISOString(),
      },
      "pending",
    );

    await enqueue({
      entity: "cycle",
      operation: "update",
      entityId: id,
      payload: data,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });
  } catch {
    // IndexedDB no disponible
  }

  return MOCK_CYCLES[idx];
}
