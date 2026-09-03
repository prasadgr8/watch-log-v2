import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Library,
  Film,
  BarChart3,
  Settings,
} from "lucide-react";

const menu = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Library", path: "/library", icon: Library },
  { name: "Movies", path: "/movies", icon: Film },
  { name: "Statistics", path: "/statistics", icon: BarChart3 },
  { name: "Settings", path: "/settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-border bg-surface p-5">
      <NavLink
        to="/"
        className="mb-8 block rounded-lg text-2xl font-bold text-primary transition-all duration-200 hover:scale-105 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
      >
        📺 Watch Log
      </NavLink>

      <nav className="space-y-2">
        {menu.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40 ${
                  isActive
                    ? "bg-accent text-inverted"
                    : "hover:bg-surface-hover"
                }`
              }
            >
              <Icon size={20} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
