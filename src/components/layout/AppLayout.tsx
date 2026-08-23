import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const location = useLocation();

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Close the mobile drawer on route navigation. The previous pathname is
  // tracked in a ref so the state update only fires when the route *changes*
  // (not on the initial mount) — this keeps the effect free of synchronous
  // setState-in-effect violations.
  const previousPathnameRef = useRef(location.pathname);

  useEffect(() => {
    if (previousPathnameRef.current !== location.pathname) {
      previousPathnameRef.current = location.pathname;
      setIsMobileNavOpen(false);
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-app-bg text-primary">
      {/*
        Keyboard-only skip link: transparent and excluded from pointer events
        so it never affects the normal layout, then shown as a fixed chip when
        focused as the first tab stop.
      */}
      <a
        href="#main-content"
        className="pointer-events-none fixed left-4 top-4 z-50 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-inverted opacity-0 transition focus:pointer-events-auto focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
      >
        Skip to content
      </a>

      <Sidebar
        isMobileNavOpen={isMobileNavOpen}
        onCloseMobileNav={() => setIsMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setIsMobileNavOpen(true)} />

        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 overflow-auto p-4 md:p-6 focus:outline-none"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
