import { useState } from "react";
import { Button } from "../ui/Button";

interface DeleteAccountModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteAccountModal({ onClose, onConfirm }: DeleteAccountModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmed, setConfirmed] = useState(false);

  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl border border-border-subtle">
          <span className="material-symbols-outlined text-4xl text-center block mb-3 text-warning-orange">
            warning
          </span>
          <h2 className="text-headline-sm text-center mb-2">
            ¿Eliminar tu cuenta?
          </h2>
          <p className="text-body-sm text-text-muted text-center mb-5">
            Esta acción es permanente. Se borrarán todos tus ciclos, síntomas y
            datos asociados. No se puede deshacer.
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1 bg-error hover:bg-error/80"
              onClick={() => setStep(2)}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl border border-border-subtle">
        <span className="material-symbols-outlined text-4xl text-center block mb-3 text-error">
          delete_forever
        </span>
        <h2 className="text-headline-sm text-center mb-2">
          Confirmación final
        </h2>
        <p className="text-body-sm text-text-muted text-center mb-5">
          Escribí <strong className="text-error">ELIMINAR</strong> para
          confirmar que querés borrar tu cuenta definitivamente.
        </p>
        <input
          type="text"
          placeholder="Escribí ELIMINAR"
          aria-label="Confirmar eliminación escribiendo ELIMINAR"
          className="w-full rounded-lg border border-border px-4 py-2.5 text-body-sm text-text-main placeholder:text-text-muted focus:border-error focus:outline-none focus:ring-2 focus:ring-error-container/50 mb-4"
          onChange={(e) => setConfirmed(e.target.value === "ELIMINAR")}
        />
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="flex-1 bg-error hover:bg-error/80 disabled:opacity-50"
            disabled={!confirmed}
            onClick={onConfirm}
          >
            Eliminar cuenta
          </Button>
        </div>
      </div>
    </div>
  );
}

export { DeleteAccountModal };
