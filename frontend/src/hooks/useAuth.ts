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
      const u = await authClient.register(email, password);
      setUser(u);
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

  return {
    user,
    isLoading,
    authError,
    login,
    register,
    logout,
    clearError,
    getToken,
  };
}
