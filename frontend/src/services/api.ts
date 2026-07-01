import { supabase } from "../lib/supabase";
import type {
  CycleCreate,
  CycleUpdate,
  CycleResponse,
  CycleListResponse,
  DailyLogCreate,
  DailyLogUpdate,
  DailyLogResponse,
  DailyLogListResponse,
  SymptomResponse,
} from "../lib/types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/* ───── Helpers ───── */

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

/* ───── Auth ───── */

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback: (session: unknown) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

/* ───── Cycles ───── */

export async function createCycle(data: CycleCreate) {
  return authFetch<CycleResponse>("/cycles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listCycles(params?: {
  limit?: number;
  offset?: number;
  from_date?: string;
}) {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  if (params?.from_date) query.set("from_date", params.from_date);
  const qs = query.toString();
  return authFetch<CycleListResponse>(`/cycles${qs ? `?${qs}` : ""}`);
}

export async function getCycle(cycleId: string) {
  return authFetch<CycleResponse>(`/cycles/${cycleId}`);
}

export async function updateCycle(cycleId: string, data: CycleUpdate) {
  return authFetch<CycleResponse>(`/cycles/${cycleId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCycle(cycleId: string) {
  return authFetch<void>(`/cycles/${cycleId}`, { method: "DELETE" });
}

/* ───── Symptoms Catalog ───── */

export async function listSymptoms() {
  return authFetch<SymptomResponse[]>("/symptoms");
}

export async function getSymptom(symptomId: number) {
  return authFetch<SymptomResponse>(`/symptoms/${symptomId}`);
}

/* ───── Daily Logs ───── */

export async function createDailyLog(data: DailyLogCreate) {
  return authFetch<DailyLogResponse>("/daily-logs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listDailyLogs(
  cycleId: string,
  params?: { limit?: number; offset?: number },
) {
  const query = new URLSearchParams({ cycle_id: cycleId });
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  return authFetch<DailyLogListResponse>(`/daily-logs?${query.toString()}`);
}

export async function getDailyLog(logId: string) {
  return authFetch<DailyLogResponse>(`/daily-logs/${logId}`);
}

export async function updateDailyLog(logId: string, data: DailyLogUpdate) {
  return authFetch<DailyLogResponse>(`/daily-logs/${logId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteDailyLog(logId: string) {
  return authFetch<void>(`/daily-logs/${logId}`, { method: "DELETE" });
}
