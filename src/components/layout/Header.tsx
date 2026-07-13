import { Bell, Moon, Search } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Welcome Back 👋</h2>

        <p className="text-sm text-slate-400">Track your TV Shows & Movies</p>
      </div>

      <div className="flex items-center gap-4">
        <NavLink
          to="/search"
          aria-label="Search media"
          title="Search media"
          className={({ isActive }) =>
            isActive
              ? "text-blue-400"
              : "text-white transition hover:text-blue-400"
          }
        >
          <Search />
        </NavLink>

        <Bell className="cursor-pointer hover:text-blue-400" />

        <Moon className="cursor-pointer hover:text-blue-400" />
      </div>
    </header>
  );
}
