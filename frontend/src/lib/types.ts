/* ───── Ciclos ───── */

export interface CycleCreate {
  start_date: string;
  end_date?: string;
}

export interface CycleUpdate {
  start_date?: string;
  end_date?: string;
}

export interface CycleResponse {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string | null;
  duration_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface CycleListResponse {
  total: number;
  limit: number;
  offset: number;
  cycles: CycleResponse[];
}

/* ───── Síntomas ───── */

export interface SymptomResponse {
  id: number;
  name: string;
  category: string;
  common_phase: string | null;
}

/* ───── Daily Logs ───── */

export interface SymptomEntry {
  symptom_id: number;
  intensity: number;
}

export interface SymptomLogEntry extends SymptomEntry {
  name: string;
  category: string;
  common_phase: string | null;
}

export interface DailyLogCreate {
  cycle_id: string;
  date: string;
  flow_level?: "none" | "light" | "medium" | "heavy";
  temperature?: number;
  notes?: string;
  symptoms?: SymptomEntry[];
}

export interface DailyLogUpdate {
  date?: string;
  flow_level?: "none" | "light" | "medium" | "heavy";
  temperature?: number;
  notes?: string;
  symptoms?: SymptomEntry[];
}

export interface DailyLogResponse {
  id: string;
  cycle_id: string;
  date: string;
  flow_level: string | null;
  temperature: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  symptoms: SymptomLogEntry[];
}

export interface DailyLogListResponse {
  total: number;
  limit: number;
  offset: number;
  logs: DailyLogResponse[];
}

/* ───── Auth ───── */

export interface AuthSession {
  access_token: string;
  user: {
    id: string;
    email: string | undefined;
  };
}

/* ───── Phase / Calendar (Daniel S3) ───── */

export type CyclePhase = "menstruacion" | "folicular" | "ovulacion" | "lutea";

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

export interface SymptomCatalog {
  id: number;
  name: string;
  category: string;
  common_phase: string | null;
}

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

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  phase: CyclePhase | null;
  cycleId: string | null;
  dailyLog: DailyLog | null;
}
