import { useState } from "react";
import { downloadCSV, downloadPDF } from "../services/exportService";
import { DeleteAccountModal } from "../components/export/DeleteAccountModal";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

type CyclesBack = 3 | 6 | 12;

const CYCLES_OPTIONS: { value: CyclesBack; label: string }[] = [
  { value: 3, label: "Últimos 3" },
  { value: 6, label: "Últimos 6" },
  { value: 12, label: "Últimos 12" },
];

export default function ExportPage() {
  const [cyclesBack, setCyclesBack] = useState<CyclesBack>(6);
  const [downloading, setDownloading] = useState<"csv" | "pdf" | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleDownloadCsv = async () => {
    setDownloading("csv");
    try {
      await downloadCSV();
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading("pdf");
    try {
      await downloadPDF(cyclesBack);
    } finally {
      setDownloading(null);
    }
  };

  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    setDeleteSuccess(true);
  };

  if (deleteSuccess) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-5xl mb-4" aria-hidden="true">👋</p>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Cuenta eliminada
        </h2>
        <p className="text-sm text-text-secondary">
          Todos tus datos han sido eliminados. Gracias por usar EVA.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-headline-md mb-1">Configuración</h1>
      <p className="text-body-sm text-text-muted mb-6">
        Gestioná tus datos y privacidad
      </p>

      {/* Mis datos — CSV */}
      <Card padding="md" className="mb-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-xl shrink-0 mt-0.5 text-primary">
            download
          </span>
          <div className="flex-1">
            <h2 className="text-body-md font-semibold mb-1">Mis datos</h2>
            <p className="text-body-sm text-text-muted mb-3">
              Descargá toda tu información de ciclos y síntomas en formato CSV.
              Compatible con Excel y Google Sheets.
            </p>
            <Button
              variant="secondary"
              className="text-xs"
              onClick={handleDownloadCsv}
              disabled={downloading !== null}
            >
              {downloading === "csv" ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-secondary-fixed-dim border-t-secondary" />
                  Descargando...
                </span>
              ) : (
                "Descargar mis datos (CSV)"
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Informe médico — PDF */}
      <Card padding="md" className="mb-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-xl shrink-0 mt-0.5 text-secondary">
            description
          </span>
          <div className="flex-1">
            <h2 className="text-body-md font-semibold mb-1">Informe médico</h2>
            <p className="text-body-sm text-text-muted mb-3">
              Generá un PDF profesional con tu historial, síntomas frecuentes y
              predicciones para compartir con tu ginecóloga.
            </p>

            <div className="flex items-center gap-2 mb-3">
              {CYCLES_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCyclesBack(value)}
                  className={`rounded-lg border px-3 py-1 text-label-md font-medium transition-colors ${
                    cyclesBack === value
                      ? "border-primary-fixed-dim bg-primary-fixed/50 text-primary"
                      : "border-border text-text-muted hover:bg-surface-container-low"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <Button
              variant="secondary"
              className="text-xs"
              onClick={handleDownloadPdf}
              disabled={downloading !== null}
            >
              {downloading === "pdf" ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-secondary-fixed-dim border-t-secondary" />
                  Generando PDF...
                </span>
              ) : (
                "Generar informe (PDF)"
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Privacidad */}
      <Card padding="md" className="mb-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-xl shrink-0 mt-0.5 text-success-green">
            security
          </span>
          <div className="flex-1">
            <h2 className="text-body-md font-semibold mb-1">Privacidad</h2>
            <p className="text-body-sm text-text-muted leading-relaxed">
              EVA almacena tus datos de forma segura en servidores encriptados.
              No compartimos ni vendemos tu información a terceros. Tus datos
              son tuyos: podés descargarlos o eliminarlos cuando quieras. No
              usamos analytics invasivos ni rastreamos tu actividad fuera de la
              app.
            </p>
          </div>
        </div>
      </Card>

      {/* Zona de peligro */}
      <Card padding="md" className="border-error/20 bg-error-container/30">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-xl shrink-0 mt-0.5 text-error">
            warning
          </span>
          <div className="flex-1">
            <h2 className="text-body-md font-semibold text-error mb-1">
              Zona de peligro
            </h2>
            <p className="text-body-sm text-on-error-container/80 mb-3">
              Eliminar tu cuenta es una acción permanente. Se borrarán todos
              tus ciclos, registros de síntomas y datos asociados.
            </p>
            <Button
              variant="primary"
              className="text-label-md bg-error hover:bg-error/80"
              onClick={() => setShowDeleteModal(true)}
            >
              Eliminar mi cuenta
            </Button>
          </div>
        </div>
      </Card>

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
