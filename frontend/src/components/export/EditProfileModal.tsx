import { useState } from "react";
import { Button } from "../ui/Button";

interface EditProfileModalProps {
  currentName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

function EditProfileModal({ currentName, onClose, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl border border-border-subtle">
        <h2 className="text-headline-sm mb-4">Editar perfil</h2>

        <div className="mb-4">
          <label htmlFor="profile-name" className="text-sm font-medium text-text-main block mb-1.5">
            Nombre
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className="w-full rounded-xl border border-border px-4 py-3 text-body-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-fixed-dim/30"
            disabled={loading}
          />
          {error && (
            <p className="text-xs text-error mt-1.5">{error}</p>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { EditProfileModal };
