import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, authError, clearError, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function clearErrors() {
    setLocalError(null);
    clearError();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      setLocalError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setLocalError("Las contraseñas no coinciden");
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password);
      navigate("/calendar", { replace: true });
    } catch {
      // error is handled by useAuth
    } finally {
      setSubmitting(false);
    }
  }

  const displayError = localError || authError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt px-4">
      <Card padding="lg" className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-eva-600">EVA</h1>
          <p className="mt-1 text-sm text-text-muted">
            Crea tu cuenta gratuita
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearErrors();
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
              clearErrors();
            }}
            placeholder="Mínimo 6 caracteres"
            required
            autoComplete="new-password"
          />

          <Input
            label="Confirmar contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              clearErrors();
            }}
            placeholder="Repite tu contraseña"
            required
            autoComplete="new-password"
          />

          {displayError && (
            <p className="text-sm text-red-500" role="alert">
              {displayError}
            </p>
          )}

          <Button type="submit" disabled={submitting || isLoading}>
            {submitting || isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creando cuenta...
              </span>
            ) : (
              "Crear cuenta"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-eva-600 hover:text-eva-700 font-medium">
            Inicia sesión
          </Link>
        </p>
      </Card>
    </div>
  );
}
