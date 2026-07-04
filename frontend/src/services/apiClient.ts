import { supabase } from "../lib/supabaseClient";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface ApiClientOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

export async function apiClient<T = unknown>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { method = "GET", body } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await getAuthHeaders()),
  };

  const config: RequestInit = { method, headers };
  if (body) {
    config.body = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, config);
  } catch {
    throw new Error(
      `No se pudo conectar con el servidor (${API_BASE}). Verificá que el backend esté corriendo.`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let data: Record<string, unknown>;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Respuesta inesperada del servidor (${response.status}). Intentá de nuevo.`,
    );
  }

  if (!response.ok) {
    const message = data.detail || `Error del servidor (${response.status})`;
    throw new Error(typeof message === "string" ? message : `Error ${response.status}`);
  }

  return data as T;
}
