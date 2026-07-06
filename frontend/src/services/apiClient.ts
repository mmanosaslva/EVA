import { authClient } from "./authClient";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface ApiClientOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

export async function apiClient<T = unknown>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { method = "GET", body } = options;
  const config: RequestInit = { method, headers: { "Content-Type": "application/json" } };

  if (body) {
    config.body = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await authClient.fetchWithAuth(`${API_BASE}${path}`, config);
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
