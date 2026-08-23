import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Film,
  LayoutDashboard,
  Library,
  Settings,
  X,
} from "lucide-react";

interface SidebarProps {
  isMobileNavOpen: boolean;
  onCloseMobileNav: () => void;
}

const menu = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Library", path: "/library", icon: Library },
  { name: "Movies", path: "/movies", icon: Film },
  { name: "Statistics", path: "/statistics", icon: BarChart3 },
  { name: "Settings", path: "/settings", icon: Settings },
];

/*
 * Application navigation sidebar.
 *
 * On desktop (md and up) the sidebar is a static column in the flex shell,
 * exactly as before. On smaller screens it becomes a fixed drawer that opens
 * above a backdrop; while closed the sidebar and backdrop are not rendered,
 * which removes them from layout, the tab order, and the accessibility tree
 * until the drawer is opened.
 */
export default function Sidebar({
  isMobileNavOpen,
  onCloseMobileNav,
}: SidebarProps) {
  useEffect(() => {
    if (!isMobileNavOpen) {
      return undefined;
    }

    function handleDocumentKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onCloseMobileNav();
      }
    }

    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [isMobileNavOpen, onCloseMobileNav]);

  return (
    <>
      {isMobileNavOpen && (
        <div
          aria-hidden="true"
          onClick={onCloseMobileNav}
          className="fixed inset-0 z-40 bg-app-bg/80 md:hidden"
        ></div>
      )}

      <aside
        aria-label="Primary navigation"
        className={
          isMobileNavOpen
            ? "fixed inset-y-0 left-0 z-50 block w-64 border-r border-border bg-surface p-5 md:hidden"
            : "hidden w-64 border-r border-border bg-surface p-5 md:block"
        }
      >
        <div className="mb-8 flex items-center justify-between">
          <NavLink
            to="/"
            className="block rounded-lg text-2xl font-bold text-primary transition-all duration-200 hover:scale-105 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
          >
            📺 Watch Log
          </NavLink>

          {isMobileNavOpen && (
            <button
              type="button"
              onClick={onCloseMobileNav}
              aria-label="Close navigation menu"
              className="cursor-pointer rounded-md p-1 text-muted transition hover:bg-surface-hover hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40 md:hidden"
            >
              <X size={20} />
            </button>
          )}
        </div>

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
    </>
  );
}
