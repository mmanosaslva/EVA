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
