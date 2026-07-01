export type CyclePhase = "menstruacion" | "folicular" | "ovulacion" | "lutea";

/* ───── Ciclos ───── */

export interface Cycle {
  id: string;
  start_date: string;
  end_date: string | null;
  duration_days: number;
  created_at: string;
}

export interface CyclesResponse {
  total: number;
  limit: number;
  offset: number;
  cycles: Cycle[];
}

/* ───── Catálogo de síntomas ───── */

export interface SymptomCatalog {
  id: number;
  name: string;
  category: string;
  common_phase: string | null;
}

/* ───── Registro diario ───── */

export interface DailySymptom {
  symptom_id: number;
  name: string;
  category: string;
  intensity: number;
}

export interface DailyLog {
  id: string;
  date: string;
  flow_level: "none" | "light" | "medium" | "heavy";
  temperature: number | null;
  notes: string | null;
  symptoms: DailySymptom[];
}

/* ───── Calendario ───── */

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  phase: CyclePhase | null;
  cycleId: string | null;
  dailyLog: DailyLog | null;
}
