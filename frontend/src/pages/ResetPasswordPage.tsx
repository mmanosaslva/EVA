import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authClient } from "../services/authClient";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <Card padding="lg" className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="text-headline-lg text-primary">EVA</h1>
            <p className="mt-1 text-body-sm text-text-muted">
              Restablecer contraseña
            </p>
          </div>

          <p className="text-body-sm text-error" role="alert">
            Enlace inválido o expirado.
          </p>

          <p className="mt-4 text-center text-body-sm text-text-muted">
            <Link to="/login" className="text-primary hover:text-primary-fixed-variant font-medium">
              Volver al inicio de sesión
            </Link>
          </p>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setSubmitting(true);
    try {
      await authClient.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al restablecer la contraseña");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card padding="lg" className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-headline-lg text-primary">EVA</h1>
          <p className="mt-1 text-body-sm text-text-muted">
            Restablece tu contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nueva contraseña"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
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
              setError(null);
            }}
            placeholder="Repite tu contraseña"
            required
            autoComplete="new-password"
          />

          {error && (
            <p className="text-body-sm text-error" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="text-body-sm text-success" role="status">
              Contraseña actualizada. Redirigiendo...
            </p>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Cambiando...
              </span>
            ) : (
              "Cambiar contraseña"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-body-sm text-text-muted">
          <Link to="/login" className="text-primary hover:text-primary-fixed-variant font-medium">
            Volver al inicio de sesión
          </Link>
        </p>
      </Card>
    </div>
  );
}
