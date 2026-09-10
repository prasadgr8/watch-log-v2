import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const layoutDirectory = dirname(fileURLToPath(import.meta.url));

const sidebarSource = readFileSync(
  join(layoutDirectory, "Sidebar.tsx"),
  "utf-8",
);

const appLayoutSource = readFileSync(
  join(layoutDirectory, "AppLayout.tsx"),
  "utf-8",
);

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40";

/*
 * Source-level coverage for the desktop sidebar collapse (Alpha 24.2),
 * matching the mobileNavigation and layoutAccessibility test conventions.
 * These assertions pin the behavioral contract: both sidebar states keep
 * every navigation entry and its active-route semantics, collapsed items stay
 * accessible by name and tooltip, the toggle is a desktop-only labelled
 * button, and the flex shell reflows the content column without any
 * JavaScript width logic.
 */
describe("desktop sidebar collapse", () => {
  it("keeps every existing navigation entry and route", () => {
    const entries = [
      ["Dashboard", "/"],
      ["Library", "/library"],
      ["Collections", "/collections"],
      ["Movies", "/movies"],
      ["Statistics", "/statistics"],
      ["Settings", "/settings"],
    ];

    for (const [name, path] of entries) {
      expect(sidebarSource).toContain(`{ name: "${name}", path: "${path}"`);
    }
  });

  it("keeps NavLink active-route semantics", () => {
    expect(sidebarSource).toContain("NavLink");
    expect(sidebarSource).toContain("isActive");
    expect(sidebarSource).toContain("bg-accent text-inverted");
  });

  it("keeps the expanded icon-and-label presentation", () => {
    expect(sidebarSource).toContain("gap-3");
    expect(sidebarSource).toContain("w-64");
  });

  it("renders a narrow icon rail in the collapsed state", () => {
    expect(sidebarSource).toContain("w-16");
    expect(sidebarSource).toContain("justify-center");
  });

  it("keeps labels accessible when visually hidden in the collapsed state", () => {
    expect(sidebarSource).toContain("sr-only");
  });

  it("provides a title tooltip for icon-only navigation items", () => {
    expect(sidebarSource).toContain(
      "title={isCollapsed ? item.name : undefined}",
    );
  });

  it("lets the flex shell reflow the content column without width calculations", () => {
    expect(appLayoutSource).toContain("min-w-0");
    expect(appLayoutSource).toContain("flex-1");
    expect(appLayoutSource).not.toContain("window.innerWidth");
    expect(appLayoutSource).not.toContain('addEventListener("resize"');
  });
});

describe("desktop collapse toggle", () => {
  const toggleButton =
    sidebarSource
      .match(/<button[\s\S]*?<\/button>/g)
      ?.find((button) => button.includes("Expand sidebar")) ?? "";

  it("renders a single desktop-only toggle button", () => {
    expect(toggleButton).not.toBe("");
    expect(toggleButton).toContain('type="button"');
  });

  it("keeps the toggle out of the mobile drawer", () => {
    // The toggle wrapper is hidden below the desktop breakpoint, so the
    // mobile drawer DOM stays identical to the pre-collapse version.
    const toggleWrapper =
      sidebarSource.match(/<div className="mt-auto[\s\S]*?<\/div>/)?.[0] ?? "";

    expect(toggleWrapper).not.toBe("");
    expect(toggleWrapper).toContain("hidden");
    expect(toggleWrapper).toContain("md:block");
  });

  it("labels the toggle for the action it performs", () => {
    expect(toggleButton).toContain(
      'aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}',
    );
    expect(toggleButton).toContain(
      'title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}',
    );
  });

  it("exposes the expanded state through aria-expanded", () => {
    expect(toggleButton).toContain("aria-expanded={!isCollapsed}");
  });

  it("gives the toggle a visible keyboard focus ring", () => {
    expect(toggleButton).toContain(FOCUS_RING);
  });
});

describe("sidebar collapse state ownership", () => {
  it("owns the collapse state in AppLayout through the preference hook", () => {
    expect(appLayoutSource).toContain("useSidebarCollapsed");
    expect(appLayoutSource).toContain("isCollapsed");
  });

  it("passes only the props the Sidebar needs", () => {
    expect(appLayoutSource).toContain("isCollapsed={isCollapsed}");
    expect(appLayoutSource).toContain("onToggleCollapsed=");
  });

  it("keeps the mobile navigation state untouched", () => {
    expect(appLayoutSource).toContain("isMobileNavOpen");
    expect(appLayoutSource).toContain("setIsMobileNavOpen");
  });
});

describe("mobile regression safety", () => {
  it("keeps the mobile drawer expanded and independent of the collapse state", () => {
    expect(sidebarSource).toContain(
      "fixed inset-y-0 left-0 z-50 block w-64 border-r border-border bg-surface p-5 md:hidden",
    );

    const mobileDrawerBranch =
      sidebarSource.match(/isMobileNavOpen\s*\?[\s\S]*?:/)?.[0] ?? "";

    expect(mobileDrawerBranch).not.toContain("isCollapsed");
  });

  it("keeps the mobile close control, backdrop, and Escape handling", () => {
    expect(sidebarSource).toContain('aria-label="Close navigation menu"');
    expect(sidebarSource).toContain("onClick={onCloseMobileNav}");
    expect(sidebarSource).toContain('event.key === "Escape"');
  });
});

describe("sidebar collapse persistence contract", () => {
  it("uses the settings store and never localStorage or sessionStorage", () => {
    expect(appLayoutSource).not.toContain("localStorage");
    expect(appLayoutSource).not.toContain("sessionStorage");
    expect(sidebarSource).not.toContain("localStorage");
    expect(sidebarSource).not.toContain("sessionStorage");
  });
});
