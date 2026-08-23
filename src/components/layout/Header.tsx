import { Bell, Moon, Search, Sun } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useTheme } from "../../app/theme";

export default function Header() {
  const { resolvedTheme, setPreference } = useTheme();

  const isDark = resolvedTheme === "dark";

  const themeToggleLabel = isDark
    ? "Switch to light theme"
    : "Switch to dark theme";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Welcome Back 👋</h2>

        <p className="text-sm text-muted">Track your TV Shows & Movies</p>
      </div>

      <div className="flex items-center gap-4">
        <NavLink
          to="/search"
          aria-label="Search media"
          title="Search media"
          className={({ isActive }) =>
            isActive
              ? "text-accent"
              : "text-primary transition hover:text-accent"
          }
        >
          <Search />
        </NavLink>

        <Bell className="cursor-pointer hover:text-accent" />

        <button
          type="button"
          onClick={() => setPreference(isDark ? "light" : "dark")}
          aria-label={themeToggleLabel}
          title={themeToggleLabel}
          className="cursor-pointer hover:text-accent"
        >
          {isDark ? <Moon /> : <Sun />}
        </button>
      </div>
    </header>
  );
}
