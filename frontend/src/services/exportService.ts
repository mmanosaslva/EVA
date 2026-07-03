import { supabase } from "../lib/supabaseClient";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function authFetch(path: string): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { headers });

  if (!response.ok) {
    const detail = response.headers.get("content-type")?.includes("application/json")
      ? (await response.json()).detail
      : `Error ${response.status}`;
    throw new Error(detail || `Error ${response.status}`);
  }

  return response;
}

export async function downloadCSV(): Promise<void> {
  const response = await authFetch("/export/csv");
  const blob = await response.blob();
  const today = new Date().toISOString().split("T")[0];
  downloadBlob(blob, `eva_datos_${today}.csv`);
}

export async function downloadPDF(cyclesBack: number): Promise<void> {
  const response = await authFetch(`/export/pdf?cycles_back=${cyclesBack}`);
  const blob = await response.blob();
  const today = new Date().toISOString().split("T")[0];
  downloadBlob(blob, `eva_informe_${today}.pdf`);
}
