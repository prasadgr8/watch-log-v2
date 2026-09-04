import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const layoutDirectory = dirname(fileURLToPath(import.meta.url));

const headerSource = readFileSync(join(layoutDirectory, "Header.tsx"), "utf-8");

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
 * Source-level accessibility coverage for the application chrome (header,
 * sidebar, and layout), matching the libraryTheme and settingsResponsive test
 * conventions. These assertions pin the keyboard-visibility contract: shared
 * focus-visible rings on every interactive control, an announced offline
 * status region, a keyboard-only skip link, single self-describing landmarks,
 * and a decorative bell. Runtime focus behavior cannot be exercised in the
 * node test environment.
 */
describe("application chrome keyboard visibility", () => {
  it("gives sidebar navigation links a visible keyboard focus ring", () => {
    expect(sidebarSource).toContain(
      "rounded-lg px-3 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40",
    );
  });

  it("gives the sidebar brand link a visible keyboard focus ring", () => {
    const brandLink =
      sidebarSource.match(/<NavLink[\s\S]*?<\/NavLink>/)?.[0] ?? "";

    expect(brandLink).toContain("hover:scale-105");
    expect(brandLink).toContain(FOCUS_RING);
  });

  it("gives the header search link a visible keyboard focus ring in both states", () => {
    expect(headerSource).toContain(
      '"text-accent rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"',
    );
    expect(headerSource).toContain(
      '"text-primary transition hover:text-accent rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"',
    );
  });

  it("gives the header theme toggle a visible keyboard focus ring", () => {
    const themeToggle =
      headerSource
        .match(/<button[\s\S]*?<\/button>/g)
        ?.find((button) => button.includes("aria-label={themeToggleLabel}")) ??
      "";

    expect(themeToggle).toContain('type="button"');
    expect(themeToggle).toContain("aria-label={themeToggleLabel}");
    expect(themeToggle).toContain(FOCUS_RING);
  });

  it("preserves the hover styling mouse users rely on", () => {
    expect(headerSource).toContain("hover:text-accent");
    expect(sidebarSource).toContain("hover:scale-105");
    expect(sidebarSource).toContain("hover:bg-surface-hover");
  });
});

describe("header offline status announcement", () => {
  it("exposes the online/offline status as a polite live region", () => {
    expect(headerSource).toContain(
      '<p role="status" className="text-sm text-muted">',
    );
  });

  it("keeps the status wording unchanged", () => {
    expect(headerSource).toContain("Track your TV Shows & Movies");
    expect(headerSource).toContain("Offline — showing saved data");
  });
});

describe("skip to content navigation", () => {
  it("renders a keyboard-reachable skip link targeting the main content", () => {
    expect(appLayoutSource).toContain('href="#main-content"');
    expect(appLayoutSource).toContain("Skip to content");
  });

  it("keeps the skip link out of the layout until it receives focus", () => {
    expect(appLayoutSource).toContain("fixed left-4 top-4 z-50");
    expect(appLayoutSource).toContain("pointer-events-none");
    expect(appLayoutSource).toContain("opacity-0");
    expect(appLayoutSource).toContain(
      "focus:pointer-events-auto focus:opacity-100",
    );
    expect(appLayoutSource).toContain(FOCUS_RING);
  });

  it("targets a stable, focusable main content landmark", () => {
    expect(appLayoutSource).toContain('id="main-content"');
    expect(appLayoutSource).toContain("tabIndex={-1}");
  });
});

describe("layout landmark structure", () => {
  it("keeps one navigation landmark and one main landmark", () => {
    // A single self-describing <nav> and <main> are sufficient; per the
    // landmark guidance, redundant labels are intentionally not added.
    expect(sidebarSource.match(/<nav\b/g) ?? []).toHaveLength(1);
    expect(appLayoutSource.match(/<main\b/g) ?? []).toHaveLength(1);
  });
});

describe("header bell resolution", () => {
  it("keeps the non-functional bell out of the accessibility tree", () => {
    const bellElement = headerSource.match(/<Bell[\s\S]*?\/>/)?.[0] ?? "";

    expect(bellElement).toContain('aria-hidden="true"');
    expect(bellElement).not.toContain("cursor-pointer");
    expect(bellElement).not.toContain("hover:");
  });

  it("keeps every real interactive header button labelled and keyboard accessible", () => {
    const buttons = headerSource.match(/<button[\s\S]*?<\/button>/g) ?? [];

    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toContain('aria-label="Open navigation menu"');
    expect(buttons[1]).toContain("aria-label={themeToggleLabel}");

    for (const button of buttons) {
      expect(button).toContain('type="button"');
      expect(button).toContain(FOCUS_RING);
    }
  });
});
