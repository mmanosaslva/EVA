import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useNavigate } from "react-router-dom";

interface PredictionWidgetProps {
  daysUntilNext: number;
  predictedDate: string;
  confidenceEarly: string;
  confidenceLate: string;
  fertileStart: string;
  fertileEnd: string;
  source: "heuristic" | "prophet";
  cycleVariability: number;
  hasCycles: boolean;
}

function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

function TooltipContent() {
  return (
    <span className="text-xs text-text-muted">
      La predicción se basa en el promedio de tus ciclos anteriores. Con 3 o
      más ciclos registrados se activa la predicción con IA personalizada para
      mayor precisión.
    </span>
  );
}

export function PredictionWidget({
  daysUntilNext,
  predictedDate,
  confidenceEarly,
  confidenceLate,
  fertileStart,
  fertileEnd,
  source,
  cycleVariability,
  hasCycles,
}: PredictionWidgetProps) {
  const navigate = useNavigate();

  if (!hasCycles) {
    return (
      <Card padding="md" className="bg-surface-alt">
        <div className="flex flex-col items-center text-center py-4">
          <span className="text-3xl mb-2">🔮</span>
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            Predicción del próximo período
          </h3>
          <p className="text-xs text-text-secondary mb-4 max-w-xs">
            Registrá al menos un ciclo para recibir una estimación de tu próximo
            período.
          </p>
          <Button onClick={() => navigate("/calendar")} className="text-sm">
            Ir al calendario
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md" className="bg-surface-alt">
      <div className="flex flex-col items-center text-center">
        <span className="text-lg mb-1" aria-hidden="true">
          🔮
        </span>

        <div className="mb-2">
          <span className="text-4xl font-bold text-eva-600 leading-tight">
            {daysUntilNext === 0 ? "Hoy" : daysUntilNext}
          </span>
          {daysUntilNext > 0 && (
            <p className="text-sm text-text-secondary mt-0.5">
              {daysUntilNext === 1
                ? "día para tu próximo período"
                : "días para tu próximo período"}
            </p>
          )}
        </div>

        <div className="w-full max-w-xs space-y-1.5 text-xs text-text-secondary mb-3">
          <div className="flex items-center justify-center gap-2">
            <span className="text-text-muted">📅</span>
            <span>
              Estimado: <strong className="text-text-primary">{formatDateFull(predictedDate)}</strong>
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-text-muted">🎯</span>
            <span>
              Entre el{" "}
              <strong className="text-text-primary">{formatDateShort(confidenceEarly)}</strong>
              {" "}y el{" "}
              <strong className="text-text-primary">{formatDateShort(confidenceLate)}</strong>
              {" "}(±{cycleVariability} días)
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-text-muted">🌸</span>
            <span>
              Ventana fértil estimada:{" "}
              <strong className="text-text-primary">{formatDateShort(fertileStart)}</strong>
              {" — "}
              <strong className="text-text-primary">{formatDateShort(fertileEnd)}</strong>
            </span>
          </div>
        </div>

        <div className="relative group">
          <Badge
            variant={source === "prophet" ? "folicular" : "default"}
            className="cursor-help"
          >
            {source === "prophet" ? "IA activada" : "Predicción básica"}
          </Badge>
          {source === "heuristic" && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md w-56">
                <TooltipContent />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
