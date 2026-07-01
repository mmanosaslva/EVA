import { useState, useEffect, useCallback } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

const DISMISS_KEY = "eva-install-dismissed";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const SHOW_DELAY = 120000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function getIsDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < THIRTY_DAYS;
  } catch {
    return false;
  }
}

function setDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // localStorage no disponible
  }
}

function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ("standalone" in navigator && (navigator as Record<string, unknown>).standalone) return true;
  return false;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOSDevice] = useState(() => isIOS());
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissedLocal] = useState(() => getIsDismissed());

  const standalone = isRunningStandalone();

  useEffect(() => {
    if (standalone || dismissed) return;

    if (isIOSDevice) {
      const timer = setTimeout(() => setShowBanner(true), SHOW_DELAY);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const timer = setTimeout(() => setShowBanner(true), SHOW_DELAY);
      return () => clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed, isIOSDevice, standalone]);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed();
    setDismissedLocal(true);
    setShowBanner(false);
  }, []);

  if (!showBanner) return null;

  if (isIOSDevice) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-40">
        <Card padding="md" className="border-eva-200 bg-eva-50/95 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0 mt-0.5" aria-hidden="true">
              📲
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-eva-700">
                Instalá EVA en tu iPhone
              </p>
              <p className="text-xs text-eva-600/80 mt-1">
                Tocá el botón{" "}
                <strong>Compartir</strong>{" "}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="inline-block align-middle mx-0.5"
                  aria-label="compartir"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>{" "}
                en Safari y seleccioná{" "}
                <strong>&quot;Agregar a pantalla de inicio&quot;</strong>.
              </p>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs text-eva-500 underline mt-2 hover:text-eva-700"
              >
                No, gracias
              </button>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-eva-400 hover:text-eva-600 transition-colors shrink-0"
              aria-label="Cerrar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40">
      <Card padding="md" className="border-eva-200 bg-eva-50/95 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-xl shrink-0" aria-hidden="true">
            📲
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-eva-700">
              Instalá EVA en tu dispositivo
            </p>
            <p className="text-xs text-eva-600/80 mt-0.5">
              Accedé a tu ciclo sin conexión, como una app nativa.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              className="text-xs px-3 py-1.5"
              onClick={handleInstall}
            >
              Instalar
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-eva-400 hover:text-eva-600 transition-colors"
              aria-label="Cerrar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
