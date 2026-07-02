import { supabase } from "../lib/supabaseClient";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const REQUEST_TIMEOUT = 15000;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface RequestConfig {
  method: string;
  path: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
}

async function request<T>(config: RequestConfig): Promise<T> {
  const { method, path, body, params } = config;

  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await getAuthHeaders()),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json();

    if (!response.ok) {
      const message: string =
        typeof data?.detail === "string"
          ? data.detail
          : `Error ${response.status}: ${method} ${path}`;
      throw new Error(message);
    }

    return data as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Timeout de conexión (${REQUEST_TIMEOUT / 1000}s)`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T> {
    return request<T>({ method: "GET", path, params });
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>({ method: "POST", path, body });
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>({ method: "PUT", path, body });
  },

  delete<T = void>(path: string): Promise<T> {
    return request<T>({ method: "DELETE", path });
  },
};

export async function apiClient<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { method = "GET", body } = options;
  return request<T>({ method, path, body });
}
