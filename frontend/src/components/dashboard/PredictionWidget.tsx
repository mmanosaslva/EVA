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
  modelMaeDays: number | null;
  cyclesUsedForTraining: number | null;
  totalCycles: number;
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

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.floor((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

function ConfidenceBar({
  early,
  late,
  predicted,
}: {
  early: string;
  late: string;
  predicted: string;
}) {
  const total = daysBetween(early, late) || 1;
  const predictedPct = Math.max(0, Math.min(100, (daysBetween(early, predicted) / total) * 100));

  return (
    <div className="w-full max-w-xs mt-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-muted w-14 text-right">
          {formatDateShort(early)}
        </span>
        <div className="relative flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="absolute inset-0 rounded-full bg-lavender-100"
          />
          <div
            className="absolute top-0 h-full rounded-full bg-lavender-400"
            style={{ left: `${predictedPct - 2}%`, width: "4%" }}
          />
        </div>
        <span className="text-[10px] text-text-muted w-14">
          {formatDateShort(late)}
        </span>
      </div>
      <p className="text-[10px] text-text-muted mt-0.5">
        Probable: {formatDateShort(predicted)}
      </p>
    </div>
  );
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
  modelMaeDays,
  cyclesUsedForTraining,
  totalCycles,
  hasCycles,
}: PredictionWidgetProps) {
  const navigate = useNavigate();

  if (!hasCycles) {
    return (
      <Card padding="md" className="bg-surface-alt">
        <div className="flex flex-col items-center text-center py-4">
          <span className="text-3xl mb-2" aria-hidden="true">🔮</span>
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

  const showMotivational = totalCycles > 0 && totalCycles < 3 && source === "heuristic";

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
            <span className="text-text-muted" aria-hidden="true">📅</span>
            <span>
              Estimado: <strong className="text-text-primary">{formatDateFull(predictedDate)}</strong>
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-text-muted" aria-hidden="true">🎯</span>
            <span>
              Entre el{" "}
              <strong className="text-text-primary">{formatDateShort(confidenceEarly)}</strong>
              {" "}y el{" "}
              <strong className="text-text-primary">{formatDateShort(confidenceLate)}</strong>
              {" "}(±{cycleVariability} días)
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-text-muted" aria-hidden="true">🌸</span>
            <span>
              Ventana fértil estimada:{" "}
              <strong className="text-text-primary">{formatDateShort(fertileStart)}</strong>
              {" — "}
              <strong className="text-text-primary">{formatDateShort(fertileEnd)}</strong>
            </span>
          </div>
        </div>

        <ConfidenceBar
          early={confidenceEarly}
          late={confidenceLate}
          predicted={predictedDate}
        />

        <div className="mt-3 space-y-2">
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

          {modelMaeDays !== null && cyclesUsedForTraining !== null && (
            <p className="text-[11px] text-text-muted">
              Precisión: ±{modelMaeDays} días en promedio · Entrenado con {cyclesUsedForTraining} ciclos
            </p>
          )}

          {showMotivational && (
            <p className="text-[11px] text-lavender-600 font-medium mt-1">
              La precisión con IA se activa al registrar 3 ciclos. Llevás {totalCycles} de 3.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
