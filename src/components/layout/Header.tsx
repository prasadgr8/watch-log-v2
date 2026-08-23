import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useOnlineStatus } from "../../app/useOnlineStatus";

import { useTheme } from "../../app/theme";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { resolvedTheme, setPreference } = useTheme();

  const isOnline = useOnlineStatus();

  const isDark = resolvedTheme === "dark";

  const themeToggleLabel = isDark
    ? "Switch to light theme"
    : "Switch to dark theme";

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-surface px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            className="shrink-0 cursor-pointer rounded-md p-1 text-primary transition hover:bg-surface-hover hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40 md:hidden"
          >
            <Menu />
          </button>
        )}

        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold text-primary">
            Welcome Back 👋
          </h2>

          <p role="status" className="text-sm text-muted">
            {isOnline
              ? "Track your TV Shows & Movies"
              : "Offline — showing saved data"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <NavLink
          to="/search"
          aria-label="Search media"
          title="Search media"
          className={({ isActive }) =>
            isActive
              ? "text-accent rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
              : "text-primary transition hover:text-accent rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
          }
        >
          <Search />
        </NavLink>

        {/*
          Decorative placeholder. Notifications do not exist yet, so the bell
          is hidden from assistive technology and no longer pretends to be an
          interactive control.
        */}
        <Bell aria-hidden="true" />

        <button
          type="button"
          onClick={() => setPreference(isDark ? "light" : "dark")}
          aria-label={themeToggleLabel}
          title={themeToggleLabel}
          className="cursor-pointer rounded-md hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
        >
          {isDark ? <Moon /> : <Sun />}
        </button>
      </div>
    </header>
  );
}
