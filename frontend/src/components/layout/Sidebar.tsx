import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const navItems = [
  { to: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { to: "/calendar", icon: "history", label: "Calendario" },
  { to: "/symptoms", icon: "vital_signs", label: "Síntomas" },
  { to: "/insights", icon: "chat", label: "Asistente EVA" },
] as const;

export function Sidebar() {
  const { user, logout } = useAuth();

  const displayName = user?.email?.split("@")[0] ?? "Usuaria";

  return (
    <aside className="hidden lg:flex flex-col py-6 h-full w-64 fixed left-0 top-0 bg-surface border-r border-border-subtle z-50">
      <div className="px-6 mb-10">
        <h1 className="text-headline-sm text-primary">EVA Health</h1>
        <p className="text-label-md text-text-muted mt-1">Tus datos están cifrados</p>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? "bg-secondary-container text-on-secondary-container shadow-[0_0_15px_rgba(175,22,101,0.1)]"
                  : "text-on-surface-variant hover:bg-surface-variant"
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-body-md">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 mt-auto">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-border-subtle">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-sm font-bold shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-label-md font-bold text-text-main truncate">{displayName}</p>
            <p className="text-label-md text-text-muted">Plan Básico</p>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-variant hover:text-error transition-colors shrink-0"
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
