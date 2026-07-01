import type { DailyLog } from "../lib/types";

const MOCK_LOGS: Map<string, DailyLog[]> = new Map();

const MOCK_CYCLE_LOGS: DailyLog[] = [
  {
    id: "log-001",
    date: "2026-06-27",
    flow_level: "heavy",
    temperature: 36.5,
    notes: "Primer día, dolor intenso por la mañana",
    symptoms: [
      { symptom_id: 1, name: "Dolor abdominal", category: "fisica", intensity: 4 },
      { symptom_id: 3, name: "Fatiga", category: "fisica", intensity: 3 },
      { symptom_id: 6, name: "Irritabilidad", category: "emocional", intensity: 2 },
    ],
  },
  {
    id: "log-002",
    date: "2026-06-28",
    flow_level: "medium",
    temperature: 36.7,
    notes: null,
    symptoms: [
      { symptom_id: 1, name: "Dolor abdominal", category: "fisica", intensity: 3 },
      { symptom_id: 11, name: "Sensibilidad mamaria", category: "fisica", intensity: 2 },
    ],
  },
  {
    id: "log-003",
    date: "2026-06-29",
    flow_level: "light",
    temperature: 36.6,
    notes: "Mejorando",
    symptoms: [
      { symptom_id: 3, name: "Fatiga", category: "fisica", intensity: 2 },
    ],
  },
];

MOCK_LOGS.set("c3-5e7a-4b1d-9f3c-8a2e1d4b6f00", [...MOCK_CYCLE_LOGS]);

export async function getDailyLogsByCycle(
  cycleId: string,
): Promise<DailyLog[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return MOCK_LOGS.get(cycleId) ?? [];
}

export async function createDailyLog(data: {
  cycle_id: string;
  date: string;
  flow_level: string;
  temperature: number | null;
  notes: string | null;
  symptoms: Array<{ symptom_id: number; name: string; category: string; intensity: number }>;
}): Promise<DailyLog> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const newLog: DailyLog = {
    id: `log-${Date.now()}`,
    date: data.date,
    flow_level: data.flow_level as DailyLog["flow_level"],
    temperature: data.temperature,
    notes: data.notes,
    symptoms: data.symptoms,
  };

  const logs = MOCK_LOGS.get(data.cycle_id) ?? [];
  logs.push(newLog);
  MOCK_LOGS.set(data.cycle_id, logs);

  return newLog;
}

export async function updateDailyLog(
  logId: string,
  cycleId: string,
  data: {
    flow_level?: string;
    temperature?: number | null;
    notes?: string | null;
    symptoms?: Array<{ symptom_id: number; name: string; category: string; intensity: number }>;
  },
): Promise<DailyLog> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const logs = MOCK_LOGS.get(cycleId) ?? [];
  const idx = logs.findIndex((l) => l.id === logId);
  if (idx === -1) throw new Error("Daily log not found");

  logs[idx] = { ...logs[idx], ...data } as DailyLog;
  return logs[idx];
}
