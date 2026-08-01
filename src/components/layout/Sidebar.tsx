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
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-5">
      <NavLink
        to="/"
        className="mb-8 block text-2xl font-bold text-white transition-all duration-200 hover:scale-105 hover:text-blue-400"
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
                `flex items-center gap-3 rounded-lg px-3 py-2 transition ${
                  isActive ? "bg-blue-600 text-white" : "hover:bg-slate-800"
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
