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
    if (!res.ok) {
      const msg = await this._errorMessage(res);
      if (msg === "LOGIN_USER_NOT_VERIFIED") {
        throw new Error("Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.");
      }
      if (msg === "LOGIN_BAD_CREDENTIALS") {
        throw new Error("Email o contraseña incorrectos.");
      }
      throw new Error("Error al iniciar sesión. Inténtalo de nuevo.");
    }

    const { access_token } = (await res.json()) as LoginResponse;
    this._saveToken(access_token);
    return this.me();
  }

  async register(email: string, password: string): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, is_active: true, is_superuser: false, is_verified: false }),
    });
    if (!res.ok) {
      const msg = await this._errorMessage(res);
      if (msg === "REGISTER_USER_ALREADY_EXISTS") {
        throw new Error("Ya existe una cuenta con este email.");
      }
      if (msg === "REGISTER_INVALID_PASSWORD") {
        throw new Error("La contraseña no cumple con los requisitos mínimos.");
      }
      throw new Error("No se pudo completar el registro. Inténtalo de nuevo.");
    }
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

  async forgotPassword(email: string): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error(await this._errorMessage(res));
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    if (!res.ok) throw new Error(await this._errorMessage(res));
  }

  async requestVerification(email: string): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/request-verify-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error(await this._errorMessage(res));
  }

  async verify(token: string): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) throw new Error(await this._errorMessage(res));
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
      if (Array.isArray(body.detail)) {
        return body.detail.map((d: { msg?: string }) => d.msg || "").join(". ") || `Error ${res.status}`;
      }
      return body.detail || `Error ${res.status}`;
    } catch {
      return `Error del servidor (${res.status})`;
    }
  }
}

export const authClient = new AuthClient();
