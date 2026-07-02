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
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
          <p className="text-3xl text-center mb-3" aria-hidden="true">
            ⚠️
          </p>
          <h2 className="text-lg font-bold text-text-primary text-center mb-2">
            ¿Eliminar tu cuenta?
          </h2>
          <p className="text-sm text-text-secondary text-center mb-5">
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
              className="flex-1 bg-red-500 hover:bg-red-600 active:bg-red-700"
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
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-3xl text-center mb-3" aria-hidden="true">
          🗑️
        </p>
        <h2 className="text-lg font-bold text-text-primary text-center mb-2">
          Confirmación final
        </h2>
        <p className="text-sm text-text-secondary text-center mb-5">
          Escribí <strong className="text-red-600">ELIMINAR</strong> para
          confirmar que querés borrar tu cuenta definitivamente.
        </p>
        <input
          type="text"
          placeholder="Escribí ELIMINAR"
          className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-red-400/30 mb-4"
          onChange={(e) => setConfirmed(e.target.value === "ELIMINAR")}
        />
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50"
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
