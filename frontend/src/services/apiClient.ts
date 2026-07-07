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
  timeout?: number;
}

export async function apiClient<T = unknown>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { method = "GET", body, timeout = 30000 } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await getAuthHeaders()),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const config: RequestInit = { method, headers, signal: controller.signal };
  if (body) {
    config.body = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, config);
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        `La solicitud excedió el tiempo de espera (${timeout / 1000}s). Revisá tu conexión.`,
        { cause: err },
      );
    }
    throw new Error(
      `No se pudo conectar con el servidor (${API_BASE}). Verificá que el backend esté corriendo.`,
      { cause: err },
    );
  } finally {
    clearTimeout(timer);
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
