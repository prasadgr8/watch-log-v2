import { act, type JSX } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import ConfigurableDashboardPage from "./components/ConfigurableDashboardPage";
import DashboardCustomizeButton from "./components/DashboardCustomizeButton";
import { DashboardCustomizationProvider } from "./services/dashboardCustomization";
import { useDashboardCustomization } from "./services/dashboardCustomizationContext";
import { getDefaultDashboardLayout } from "./defaultLayout";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function CustomizeTrigger(): JSX.Element {
  const { setIsCustomizing } = useDashboardCustomization();
  return <DashboardCustomizeButton onClick={() => setIsCustomizing(true)} />;
}

function TestPage(): JSX.Element {
  return (
    <MemoryRouter>
      <DashboardCustomizationProvider>
        <CustomizeTrigger />
        <ConfigurableDashboardPage />
      </DashboardCustomizationProvider>
    </MemoryRouter>
  );
}

let container: HTMLElement | null = null;
let root: Root | null = null;

beforeEach(async () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("1024"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<TestPage />);
  });
});

afterEach(async () => {
  if (root) {
    const currentRoot = root;
    await act(async () => currentRoot.unmount());
  }
  container?.remove();
  container = null;
  root = null;
});

async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.click());
}

function menuTrigger(title: string): HTMLButtonElement {
  const trigger = document.querySelector<HTMLButtonElement>(
    `button[aria-label="${title} widget menu"]`,
  );
  if (!trigger) throw new Error(`Menu trigger missing for ${title}`);
  return trigger;
}

function widgetMenu(title: string): HTMLElement | null {
  return document.querySelector(`[role="menu"][aria-label="${title} actions"]`);
}

describe("widget header and menu behavior", () => {
  it("places the six-dot handle first as the actual drag surface", async () => {
    const header = document
      .querySelector('[data-widget-id="continue-watching"]')
      ?.closest("article")
      ?.querySelector("header");
    expect(header).not.toBeNull();
    const first = header?.firstElementChild;
    expect(first?.tagName).toBe("BUTTON");
    expect(first?.getAttribute("data-action-move")).toBe("move");
    expect(first?.getAttribute("data-drag-handle")).toBe("true");
    expect(first?.getAttribute("aria-label")).toContain("Move Continue Watching");
    expect(header?.className).toContain("flex-nowrap");
    expect(header?.className).not.toContain("flex-wrap");
  });

  it("keeps the standard header order with no wrapping or clipping", () => {
    const card = document.querySelector('[data-widget-id="upcoming-releases"]');
    const header = card?.closest("article")?.querySelector("header");
    expect(header).not.toBeNull();
    const order = Array.from(header?.children ?? []).map((child) => {
      if (child.tagName === "BUTTON") return "drag";
      if (child.tagName === "DIV" && child.querySelector("h2")) return "title";
      if (child.tagName === "A") return "view-all";
      return child.tagName.toLowerCase();
    });
    expect(order[0]).toBe("drag");
    expect(order).toContain("title");
    const title = header?.querySelector("h2");
    expect(title?.className).toContain("truncate");
    const viewAll = header?.querySelector('a[aria-label^="View all"]');
    expect(viewAll?.className).toContain("whitespace-nowrap");
    expect(viewAll?.className).toContain("shrink-0");
    const menuTrigger = header?.querySelector('button[aria-haspopup="menu"]');
    expect(menuTrigger?.className).toContain("shrink-0");
    expect(menuTrigger?.className).toContain("h-8");
    expect(menuTrigger?.className).toContain("w-8");
    const titleBlock = header?.querySelector("div.min-w-0.flex-1");
    expect(titleBlock?.className).toContain("basis-0");
  });

  it("keeps header controls usable at narrow widths without overflow", () => {
    for (const widgetId of ["continue-watching", "upcoming-releases"]) {
      const header = document
        .querySelector(`[data-widget-id="${widgetId}"]`)
        ?.closest("article")
        ?.querySelector("header");
      expect(header).not.toBeNull();
      expect(header?.className).toContain("flex-nowrap");
      expect(header?.className).not.toContain("flex-wrap");
      const title = header?.querySelector("h2");
      expect(title?.className).toContain("truncate");
      expect(title?.className).toContain("min-w-0");
    }
  });

  it("keeps Highlights metric values grouped with their units", () => {
    const card = document
      .querySelector('[data-widget-id="watchlog-highlights"]')
      ?.closest("article");
    // Empty seed data in this harness renders the compact empty state; the
    // populated metric contract is asserted at the source level below so the
    // no-wrap hierarchy cannot regress.
    expect(card?.textContent).toContain("No viewing activity yet");
    expect(card?.querySelector("div.rounded-lg.border-dashed")).not.toBeNull();

    const featureDirectory = dirname(fileURLToPath(import.meta.url));
    const highlightsSource = readFileSync(
      join(featureDirectory, "components", "WatchLogHighlightsWidget.tsx"),
      "utf-8",
    );
    expect(highlightsSource).toContain("whitespace-nowrap");
    expect(highlightsSource).toContain("{value} {unit}");
    expect(highlightsSource).toContain("min-w-0");
    expect(highlightsSource).toContain("truncate");

    const gridSource = readFileSync(
      join(featureDirectory, "components", "ConfigurableDashboardGrid.tsx"),
      "utf-8",
    );
    expect(gridSource).toContain("minmax(${GRID_ROW_HEIGHT_PX}px, auto)");
    expect(gridSource).toContain("overflow-hidden");
    expect(gridSource).toContain("h-full min-h-0 min-w-0");
  });

  it("opens the menu, closes on Escape, and returns focus", async () => {
    const trigger = menuTrigger("Continue Watching");
    await click(trigger);
    expect(widgetMenu("Continue Watching")).not.toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await act(async () => {
      trigger.focus();
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(widgetMenu("Continue Watching")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes the menu on outside click", async () => {
    const trigger = menuTrigger("Your Top Stories");
    await click(trigger);
    expect(widgetMenu("Your Top Stories")).not.toBeNull();
    await act(async () => {
      document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(widgetMenu("Your Top Stories")).toBeNull();
  });

  it("hides a widget through Hide Widget", async () => {
    const trigger = menuTrigger("Quick Actions");
    await click(trigger);
    const hide = document.querySelector<HTMLButtonElement>(
      '[role="menu"] [role="menuitem"]',
    );
    if (!hide) throw new Error("Hide Widget menu item is missing");
    expect(hide.textContent).toBe("Hide Widget");
    await click(hide);
    expect(document.querySelector('[data-widget-id="quick-actions"]')).toBeNull();
  });

  it("restores the registry default size through Reset Size", async () => {
    const resize = document.querySelector<HTMLButtonElement>(
      '[data-action-resize][data-widget-id="continue-watching"]',
    );
    if (!resize) throw new Error("Continue Watching resize control is missing");
    await act(async () => {
      resize.focus();
      resize.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
    });
    expect(
      document
        .querySelector('[data-widget-id="continue-watching"]')
        ?.closest("li")?.style.gridColumn,
    ).toBe("1 / span 6");
    await click(menuTrigger("Continue Watching"));
    const items = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="menu"] [role="menuitem"]'),
    );
    expect(items.map((item) => item.textContent)).toEqual([
      "Hide Widget",
      "Reset Size",
    ]);
    const resetSize = items.find((item) => item.textContent === "Reset Size");
    if (!resetSize) throw new Error("Reset Size menu item is missing");
    await click(resetSize);
    expect(
      document
        .querySelector('[data-widget-id="continue-watching"]')
        ?.closest("li")?.style.gridColumn,
    ).toBe("1 / span 8");
  });

  it("keeps the default layout deterministic with approved placements", () => {
    const first = getDefaultDashboardLayout().widgets;
    const second = getDefaultDashboardLayout().widgets;
    expect(second).toEqual(first);
    expect(
      first.map(({ widgetId, x, y, w, h }) => [widgetId, x, y, w, h]),
    ).toEqual([
      ["continue-watching", 0, 0, 8, 2],
      ["upcoming-releases", 8, 0, 4, 2],
      ["recently-watched", 0, 2, 4, 2],
      ["watchlog-highlights", 4, 2, 4, 1],
      ["story-landscape", 8, 2, 4, 1],
      ["library-at-a-glance", 4, 3, 4, 1],
      ["top-stories", 0, 4, 6, 2],
      ["quick-actions", 6, 4, 6, 2],
    ]);
  });
});
