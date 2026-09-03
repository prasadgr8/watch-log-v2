import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout() {
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

      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Header />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-auto p-6 focus:outline-none"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}