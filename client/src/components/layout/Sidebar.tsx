import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/", label: "Dashboard", icon: "grid" },
  { to: "/contacts", label: "Contacts", icon: "users" },
  { to: "/workshops", label: "Workshops", icon: "calendar" },
];

export function Sidebar() {
  const { logout, email } = useAuth();

  return (
    <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-gold">Doctor AI</h1>
        <p className="text-xs text-zinc-500">CRM</p>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gold/10 text-gold"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500 truncate mb-2">{email}</p>
        <button
          onClick={() => logout()}
          className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
