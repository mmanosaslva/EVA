import type { SymptomCatalog, DailyLog, DailySymptom } from "../lib/types";

const MOCK_SYMPTOMS: SymptomCatalog[] = [
  { id: 1, name: "Dolor abdominal", category: "fisica", common_phase: "menstruacion" },
  { id: 2, name: "Dolor de cabeza", category: "fisica", common_phase: "menstruacion" },
  { id: 3, name: "Fatiga", category: "fisica", common_phase: "menstruacion" },
  { id: 4, name: "Sensibilidad en senos", category: "fisica", common_phase: "lutea" },
  { id: 5, name: "Dolor lumbar", category: "fisica", common_phase: "menstruacion" },
  { id: 6, name: "Náuseas", category: "fisica", common_phase: "menstruacion" },
  { id: 7, name: "Mareos", category: "fisica", common_phase: "menstruacion" },
  { id: 8, name: "Insomnio", category: "fisica", common_phase: "lutea" },
  { id: 9, name: "Acné", category: "fisica", common_phase: "lutea" },
  { id: 10, name: "Calambres", category: "fisica", common_phase: "menstruacion" },
  { id: 11, name: "Dolor muscular", category: "fisica", common_phase: null },
  { id: 12, name: "Sofocos", category: "fisica", common_phase: null },
  { id: 13, name: "Escalofríos", category: "fisica", common_phase: null },
  { id: 14, name: "Dolor ovulatorio", category: "fisica", common_phase: "ovulacion" },
  { id: 15, name: "Sangrado abundante", category: "fisica", common_phase: "menstruacion" },
  { id: 16, name: "Hinchazón", category: "digestiva", common_phase: "lutea" },
  { id: 17, name: "Estreñimiento", category: "digestiva", common_phase: "lutea" },
  { id: 18, name: "Diarrea", category: "digestiva", common_phase: "menstruacion" },
  { id: 19, name: "Antojos", category: "digestiva", common_phase: "lutea" },
  { id: 20, name: "Náuseas digestivas", category: "digestiva", common_phase: null },
  { id: 21, name: "Irritabilidad", category: "emocional", common_phase: "lutea" },
  { id: 22, name: "Ansiedad", category: "emocional", common_phase: "lutea" },
  { id: 23, name: "Tristeza", category: "emocional", common_phase: "lutea" },
  { id: 24, name: "Cambios de humor", category: "emocional", common_phase: "lutea" },
  { id: 25, name: "Falta de concentración", category: "emocional", common_phase: "lutea" },
  { id: 26, name: "Apatía", category: "emocional", common_phase: null },
  { id: 27, name: "Euforia", category: "emocional", common_phase: null },
  { id: 28, name: "Libido aumentada", category: "emocional", common_phase: "ovulacion" },
  { id: 29, name: "Libido disminuida", category: "emocional", common_phase: null },
  { id: 30, name: "Sensibilidad emocional", category: "emocional", common_phase: "lutea" },
];

interface MockLogStore {
  [cycleId: string]: DailyLog[];
}

const MOCK_LOGS: MockLogStore = {};

export async function getSymptomsCatalog(): Promise<SymptomCatalog[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return MOCK_SYMPTOMS;
}

export async function getDailyLogsByCycle(cycleId: string): Promise<DailyLog[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return MOCK_LOGS[cycleId] ?? [];
}

export async function getDailyLogByDate(
  cycleId: string,
  date: string,
): Promise<DailyLog | null> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const logs = MOCK_LOGS[cycleId] ?? [];
  return logs.find((l) => l.date === date) ?? null;
}

export async function createDailyLog(data: {
  cycle_id: string;
  date: string;
  flow_level?: string;
  temperature?: number;
  notes?: string;
  symptoms: { symptom_id: number; intensity: number }[];
}): Promise<DailyLog> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const symptomDetails: DailySymptom[] = data.symptoms.map((s) => {
    const catalog = MOCK_SYMPTOMS.find((c) => c.id === s.symptom_id);
    return {
      symptom_id: s.symptom_id,
      name: catalog?.name ?? `Síntoma ${s.symptom_id}`,
      category: catalog?.category ?? "otra",
      intensity: s.intensity,
    };
  });

  const log: DailyLog = {
    id: `log-${Date.now()}`,
    date: data.date,
    flow_level: (data.flow_level as DailyLog["flow_level"]) ?? "none",
    temperature: data.temperature ?? null,
    notes: data.notes ?? null,
    symptoms: symptomDetails,
  };

  if (!MOCK_LOGS[data.cycle_id]) {
    MOCK_LOGS[data.cycle_id] = [];
  }
  MOCK_LOGS[data.cycle_id].push(log);
  MOCK_LOGS[data.cycle_id].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return log;
}

export async function updateDailyLog(
  logId: string,
  data: {
    date?: string;
    flow_level?: string;
    temperature?: number | null;
    notes?: string | null;
    symptoms?: { symptom_id: number; intensity: number }[];
  },
): Promise<DailyLog> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  for (const cycleLogs of Object.values(MOCK_LOGS)) {
    const idx = cycleLogs.findIndex((l) => l.id === logId);
    if (idx === -1) continue;

    const existing = cycleLogs[idx];

    if (data.symptoms) {
      const symptomDetails: DailySymptom[] = data.symptoms.map((s) => {
        const catalog = MOCK_SYMPTOMS.find((c) => c.id === s.symptom_id);
        return {
          symptom_id: s.symptom_id,
          name: catalog?.name ?? `Síntoma ${s.symptom_id}`,
          category: catalog?.category ?? "otra",
          intensity: s.intensity,
        };
      });
      existing.symptoms = symptomDetails;
    }

    if (data.date) existing.date = data.date;
    if (data.flow_level !== undefined)
      existing.flow_level = data.flow_level as DailyLog["flow_level"];
    if (data.temperature !== undefined) existing.temperature = data.temperature;
    if (data.notes !== undefined) existing.notes = data.notes;

    return { ...existing };
  }

  throw new Error("Daily log not found");
}
