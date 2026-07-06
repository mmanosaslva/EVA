const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface AuthUser {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
}

interface LoginResponse {
  access_token: string;
  token_type: "bearer";
}

class AuthClient {
  async login(email: string, password: string): Promise<AuthUser> {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(`${API_BASE}/auth/jwt/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });
    if (!res.ok) throw new Error(await this._errorMessage(res));

    const { access_token } = (await res.json()) as LoginResponse;
    this._saveToken(access_token);
    return this.me();
  }

  async register(email: string, password: string): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, is_active: true, is_superuser: false, is_verified: false }),
    });
    if (!res.ok) throw new Error(await this._errorMessage(res));
    return this.login(email, password);
  }

  async logout(): Promise<void> {
    this._clearToken();
  }

  async me(): Promise<AuthUser> {
    const token = this._getToken();
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Sesión expirada");
    return res.json();
  }

  async getToken(): Promise<string | null> {
    return this._getToken();
  }

  isAuthenticated(): boolean {
    return this._getToken() !== null;
  }

  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this._getToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.status === 401) {
      this._clearToken();
      window.location.href = "/login";
      throw new Error("Sesión expirada");
    }

    return res;
  }

  private _saveToken(token: string) {
    localStorage.setItem("eva_access_token", token);
  }

  private _getToken(): string | null {
    return localStorage.getItem("eva_access_token");
  }

  private _clearToken() {
    localStorage.removeItem("eva_access_token");
  }

  private async _errorMessage(res: Response): Promise<string> {
    try {
      const body = await res.json();
      return body.detail || `Error ${res.status}`;
    } catch {
      return `Error del servidor (${res.status})`;
    }
  }
}

export const authClient = new AuthClient();
