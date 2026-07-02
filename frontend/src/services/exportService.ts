import { supabase } from "../lib/supabaseClient";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function fetchExport(path: string): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (data.session?.access_token) {
    headers["Authorization"] = `Bearer ${data.session.access_token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    throw new Error("Error al descargar los datos");
  }
  return res;
}

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

export async function downloadCSV(): Promise<void> {
  const res = await fetchExport("/export/csv");
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?(.+?)"?$/);
  const filename = match
    ? match[1]
    : `eva_datos_${new Date().toISOString().split("T")[0]}.csv`;

  downloadBlob(blob, filename);
}

export async function downloadPDF(cyclesBack: number): Promise<void> {
  const res = await fetchExport(`/export/pdf?cycles_back=${cyclesBack}`);
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?(.+?)"?$/);
  const filename = match
    ? match[1]
    : `eva_informe_${new Date().toISOString().split("T")[0]}.pdf`;

  downloadBlob(blob, filename);
}
