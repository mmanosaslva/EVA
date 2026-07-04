import { NavLink, useLocation } from "react-router-dom";

interface TopBarTab {
  to: string;
  label: string;
}

const desktopTabs: TopBarTab[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/calendar", label: "Calendario" },
  { to: "/insights", label: "Insights" },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/calendar": "Calendario de Ciclo",
  "/symptoms": "Síntomas",
  "/insights": "Insights",
  "/export": "Privacidad",
  "/demo": "Demo",
};

export function TopAppBar() {
  const location = useLocation();
  const currentTitle = pageTitles[location.pathname] ?? "EVA";

  return (
    <header className="w-full top-0 sticky z-40 bg-surface border-b border-border-subtle">
      <div className="hidden md:flex justify-between items-center px-margin-desktop py-4 max-w-container-max mx-auto">
        <h2 className="text-headline-lg text-primary tracking-tight">{currentTitle}</h2>
        <div className="flex items-center gap-8">
          <nav className="flex gap-6">
            {desktopTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === "/dashboard"}
                className={({ isActive }) =>
                  `pb-1 transition-colors text-label-md ${
                    isActive
                      ? "text-primary border-b-2 border-primary font-bold"
                      : "text-text-muted hover:text-primary"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button
              className="material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-container active:scale-90 transition-all"
              aria-label="Notificaciones"
            >
              notifications
            </button>
            <button
              className="material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-container active:scale-90 transition-all"
              aria-label="Configuración"
              onClick={() => (window.location.href = "/export")}
            >
              settings
            </button>
          </div>
        </div>
      </div>

      <div className="md:hidden flex justify-between items-center px-margin-mobile py-4">
        <span className="text-headline-md text-primary">EVA</span>
        <button
          className="material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-container active:scale-90 transition-all"
          aria-label="Notificaciones"
        >
          notifications
        </button>
      </div>
    </header>
  );
}
