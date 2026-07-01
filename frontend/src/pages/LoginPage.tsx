import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, authError, clearError, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/calendar", { replace: true });
    } catch {
      // error is handled by useAuth
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt px-4">
      <Card padding="lg" className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-eva-600">EVA</h1>
          <p className="mt-1 text-sm text-text-muted">
            Inicia sesión para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError();
            }}
            placeholder="tu@email.com"
            required
            autoComplete="email"
          />

          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError();
            }}
            placeholder="Tu contraseña"
            required
            autoComplete="current-password"
          />

          {authError && (
            <p className="text-sm text-red-500" role="alert">
              {authError}
            </p>
          )}

          <Button type="submit" disabled={submitting || isLoading}>
            {submitting || isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Ingresando...
              </span>
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="text-eva-600 hover:text-eva-700 font-medium">
            Regístrate
          </Link>
        </p>
      </Card>
    </div>
  );
}
