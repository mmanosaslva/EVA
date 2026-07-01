import { useState, useEffect } from "react";

interface OfflineIndicatorProps {
  isOnline: boolean;
  wasOffline: boolean;
}

export function OfflineIndicator({
  isOnline,
  wasOffline,
}: OfflineIndicatorProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => setDismissed(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (isOnline && !wasOffline) return null;
  if (isOnline && dismissed) return null;

  if (!isOnline) {
    return (
      <div
        role="alert"
        className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center"
      >
        <p className="text-xs font-medium text-amber-700 flex items-center justify-center gap-1.5">
          <span aria-hidden="true">📡</span>
          Sin conexión a internet — tus datos se guardan localmente
        </p>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border-b border-green-200 px-4 py-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-green-700 flex items-center gap-1.5">
          <span aria-hidden="true">✅</span>
          Conexión restablecida — sincronizando datos
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-green-500 hover:text-green-700 transition-colors"
          aria-label="Cerrar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
