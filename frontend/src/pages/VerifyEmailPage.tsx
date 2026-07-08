import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authClient } from "../services/authClient";
import { Card } from "../components/ui/Card";

type VerifyState =
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; message: string };

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerifyState>({ status: "loading" });

  useEffect(() => {
    const token = searchParams.get("token");
    let cancelled = false;

    async function verify() {
      if (!token) {
        if (!cancelled) setState({ status: "error", message: "Enlace inválido." });
        return;
      }
      try {
        await authClient.verify(token);
        if (!cancelled) setState({ status: "success" });
      } catch {
        if (!cancelled)
          setState({
            status: "error",
            message: "El enlace de verificación no es válido o ha expirado.",
          });
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card padding="lg" className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-headline-lg text-primary">EVA</h1>
          <p className="mt-1 text-body-sm text-text-muted">
            Verificación de correo electrónico
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          {state.status === "loading" && (
            <span className="flex items-center gap-2 text-body-md text-text-muted">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Verificando tu correo...
            </span>
          )}

          {state.status === "success" && (
            <p className="text-body-md text-success">
              ¡Tu correo ha sido verificado! Ya puedes iniciar sesión.
            </p>
          )}

          {state.status === "error" && (
            <p className="text-body-sm text-error" role="alert">
              {state.message}
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-body-sm text-text-muted">
          <Link
            to="/login"
            className="text-primary hover:text-primary-fixed-variant font-medium"
          >
            Ir al inicio de sesión
          </Link>
        </p>
      </Card>
    </div>
  );
}
