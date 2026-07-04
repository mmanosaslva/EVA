import { NavLink } from "react-router-dom";

const mobileNavItems = [
  { to: "/dashboard", icon: "calendar_today", label: "Hoy" },
  { to: "/calendar", icon: "cycle", label: "Ciclo" },
  { to: "/insights", icon: "monitoring", label: "Tendencias" },
  { to: "/export", icon: "person", label: "Perfil" },
] as const;

export function BottomNavBar() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-margin-mobile pb-4 pt-2 bg-surface shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-50 rounded-t-xl border-t border-border-subtle">
      {mobileNavItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/dashboard"}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center transition-all px-4 py-1 ${
              isActive
                ? "bg-primary-container text-on-primary-container rounded-full scale-95"
                : "text-on-surface-variant"
            }`
          }
        >
          <span className="material-symbols-outlined">{item.icon}</span>
          <span className="text-label-md mt-0.5">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
