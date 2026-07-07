import { useState, useEffect, useCallback } from "react";
import { authClient, type AuthUser } from "../services/authClient";

interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  getToken: () => Promise<string | null>;
  updateProfile: (data: { full_name?: string }) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (authClient.isAuthenticated()) {
      authClient.me()
        .then(setUser)
        .catch(() => {
          setUser(null);
          authClient.logout();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const u = await authClient.login(email, password);
      setUser(u);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al iniciar sesión";
      setAuthError(msg);
      throw e;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      await authClient.register(email, password);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al registrarse";
      setAuthError(msg);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await authClient.logout();
    setUser(null);
  }, []);

  const clearError = useCallback(() => setAuthError(null), []);

  const getToken = useCallback(async () => authClient.getToken(), []);

  const updateProfile = useCallback(async (data: { full_name?: string }) => {
    const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
    const token = await authClient.getToken();
    if (!token) throw new Error("No hay sesión activa");
    const res = await fetch(`${API_BASE}/users/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("No se pudo actualizar el perfil");
    const updated = await authClient.me();
    setUser(updated);
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
    const token = await authClient.getToken();
    if (!token) throw new Error("No hay sesión activa");
    const res = await fetch(`${API_BASE}/users/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!res.ok) throw new Error("No se pudo actualizar la contraseña");
  }, []);

  const deleteAccount = useCallback(async () => {
    const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
    const token = await authClient.getToken();
    if (!token) throw new Error("No hay sesión activa");

    const response = await fetch(`${API_BASE}/auth/account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail ?? "No se pudo eliminar la cuenta");
    }
    await authClient.logout();
    setUser(null);
  }, []);

  return {
    user,
    isLoading,
    authError,
    login,
    register,
    logout,
    clearError,
    getToken,
    updateProfile,
    updatePassword,
    deleteAccount,
  };
}
