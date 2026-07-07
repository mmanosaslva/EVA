import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { authClient } from "../services/authClient";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function clearError() {
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await authClient.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
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
            Recupera tu contraseña
          </p>
        </div>

        {success ? (
          <div className="text-center">
            <p className="text-body-sm text-text-muted">
              Revisa tu correo. Te enviamos un enlace para restablecer tu
              contraseña.
            </p>
            <p className="mt-4 text-center text-body-sm text-text-muted">
              <Link
                to="/login"
                className="text-primary hover:text-primary-fixed-variant font-medium"
              >
                Volver al inicio de sesión
              </Link>
            </p>
          </div>
        ) : (
          <>
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

              {error && (
                <p className="text-body-sm text-error" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Enviando...
                  </span>
                ) : (
                  "Enviar instrucciones"
                )}
              </Button>
            </form>

            <p className="mt-4 text-center text-body-sm text-text-muted">
              <Link
                to="/login"
                className="text-primary hover:text-primary-fixed-variant font-medium"
              >
                Volver al inicio de sesión
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
