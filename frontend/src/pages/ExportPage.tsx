import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { downloadCSV, downloadPDF } from "../services/exportService";
import { DeleteAccountModal } from "../components/export/DeleteAccountModal";
import { EditProfileModal } from "../components/export/EditProfileModal";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

type CyclesBack = 3 | 6 | 12;

const CYCLES_OPTIONS: { value: CyclesBack; label: string }[] = [
  { value: 3, label: "Últimos 3" },
  { value: 6, label: "Últimos 6" },
  { value: 12, label: "Últimos 12" },
];

export default function ExportPage() {
  const { user, updateProfile, updatePassword, deleteAccount } = useAuth();
  const [cyclesBack, setCyclesBack] = useState<CyclesBack>(6);
  const [downloading, setDownloading] = useState<"csv" | "pdf" | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [openSection, setOpenSection] = useState<"perfil" | "exportar" | "privacidad" | null>("perfil");

  const displayName = user?.email?.split("@")[0] ?? "Usuaria";
  const email = user?.email ?? "";

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

  const handleEditProfile = async (name: string) => {
    await updateProfile({ full_name: name });
    setShowEditModal(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setPasswordError(null);
    try {
      await updatePassword(newPassword);
      setNewPassword("");
      setPasswordSuccess(true);
      setShowPasswordForm(false);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
    }
  };

  const handleDeleteAccount = async () => {
    await deleteAccount();
    setShowDeleteModal(false);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* ─── Perfil ─── */}
      <section>
        <button
          onClick={() => setOpenSection(openSection === "perfil" ? null : "perfil")}
          className="w-full flex items-center justify-between py-3"
        >
          <span className="flex items-center gap-3 text-title-sm text-text-main">
            <span className="material-symbols-outlined text-xl">person</span>
            Perfil
          </span>
          <span className="material-symbols-outlined text-xl text-text-muted transition-transform">
            {openSection === "perfil" ? "expand_less" : "expand_more"}
          </span>
        </button>
        {openSection === "perfil" && (
        <Card padding="md">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-xl font-bold shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-body-md font-semibold text-text-main truncate">{displayName}</p>
              <p className="text-body-sm text-text-muted truncate">{email}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              className="text-body-sm justify-start"
              onClick={() => setShowEditModal(true)}
            >
              <span className="material-symbols-outlined text-lg mr-2">edit</span>
              Editar perfil
            </Button>

            {!showPasswordForm ? (
              <Button
                variant="secondary"
                className="text-body-sm justify-start"
                onClick={() => setShowPasswordForm(true)}
              >
                <span className="material-symbols-outlined text-lg mr-2">key</span>
                Cambiar contraseña
              </Button>
            ) : (
              <div className="rounded-xl border border-border-subtle bg-surface-container-low p-4 space-y-3">
                <p className="text-body-sm text-text-main font-medium">Nueva contraseña</p>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-body-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-fixed-dim/30"
                />
                {passwordError && (
                  <p className="text-xs text-error">{passwordError}</p>
                )}
                {passwordSuccess && (
                  <p className="text-xs text-success-green">Contraseña actualizada</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="text-label-md flex-1"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setNewPassword("");
                      setPasswordError(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    className="text-label-md flex-1"
                    onClick={handleChangePassword}
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            )}
          </div>

          <hr className="my-4 border-border-subtle" />

          <Button
            variant="ghost"
            className="text-body-sm text-error justify-start w-full hover:bg-error-container/20"
            onClick={() => setShowDeleteModal(true)}
          >
            <span className="material-symbols-outlined text-lg mr-2">delete_forever</span>
            Eliminar mi cuenta
          </Button>
        </Card>
        )}
      </section>

      {/* ─── Exportar documentos ─── */}
      <section>
        <button
          onClick={() => setOpenSection(openSection === "exportar" ? null : "exportar")}
          className="w-full flex items-center justify-between py-3"
        >
          <span className="flex items-center gap-3 text-title-sm text-text-main">
            <span className="material-symbols-outlined text-xl">download</span>
            Exportar documentos
          </span>
          <span className="material-symbols-outlined text-xl text-text-muted transition-transform">
            {openSection === "exportar" ? "expand_less" : "expand_more"}
          </span>
        </button>
        {openSection === "exportar" && (
        <div className="space-y-4">

        <Card padding="md" className="mb-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl shrink-0 mt-0.5 text-primary">
              download
            </span>
            <div className="flex-1">
              <h3 className="text-body-md font-semibold mb-1">Mis datos (CSV)</h3>
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

        <Card padding="md">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl shrink-0 mt-0.5 text-secondary">
              description
            </span>
            <div className="flex-1">
              <h3 className="text-body-md font-semibold mb-1">Informe médico (PDF)</h3>
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
        </div>
        )}
      </section>

      {/* ─── Privacidad ─── */}
      <section>
        <button
          onClick={() => setOpenSection(openSection === "privacidad" ? null : "privacidad")}
          className="w-full flex items-center justify-between py-3"
        >
          <span className="flex items-center gap-3 text-title-sm text-text-main">
            <span className="material-symbols-outlined text-xl">security</span>
            Privacidad
          </span>
          <span className="material-symbols-outlined text-xl text-text-muted transition-transform">
            {openSection === "privacidad" ? "expand_less" : "expand_more"}
          </span>
        </button>
        {openSection === "privacidad" && (
        <Card padding="md">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl shrink-0 mt-0.5 text-success-green">
              security
            </span>
            <div className="flex-1">
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
        )}
      </section>

      {showEditModal && (
        <EditProfileModal
          currentName={displayName}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditProfile}
        />
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </div>
  );
}
