import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/calendar": "Calendario de Ciclo",
  "/symptoms": "Síntomas",
  "/insights": "Asistente EVA",
  "/config": "Configuración",
  "/demo": "Demo",
};

export function TopAppBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentTitle = pageTitles[location.pathname] ?? "EVA";
  const displayName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "U";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="w-full top-0 sticky z-40 bg-surface border-b border-border-subtle">
      <div className="hidden md:flex justify-between items-center px-margin-desktop py-4 max-w-container-max mx-auto">
        <h2 className="text-headline-lg text-primary tracking-tight">{currentTitle}</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/config")}
            className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-sm font-bold hover:scale-105 active:scale-95 transition-all"
            aria-label="Perfil"
          >
            {initial}
          </button>
          <button
            className="material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-container active:scale-90 transition-all"
            aria-label="Notificaciones"
          >
            notifications
          </button>
          <button
            className="material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-container active:scale-90 transition-all"
            aria-label="Configuración"
            onClick={() => navigate("/config")}
          >
            settings
          </button>
        </div>
      </div>

      <div className="md:hidden flex justify-between items-center px-margin-mobile py-4">
        <span className="text-headline-md text-primary">EVA</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/config")}
            className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-sm font-bold hover:scale-105 active:scale-95 transition-all"
            aria-label="Perfil"
          >
            {initial}
          </button>
          <button
            className="material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-container active:scale-90 transition-all"
            aria-label="Notificaciones"
          >
            notifications
          </button>
        </div>
      </div>
    </header>
  );
}
