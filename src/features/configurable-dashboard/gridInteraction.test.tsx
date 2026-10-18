import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { computeLayoutPositions } from "../../domain/dashboardGrid";
import ConfigurableDashboardGrid from "./components/ConfigurableDashboardGrid";
import { getDefaultDashboardLayout } from "./defaultLayout";
import type { DashboardWidgetLayout } from "./defaultLayout";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLElement | null = null;
let root: Root | null = null;
let currentLayout: DashboardWidgetLayout[] = [];

function GridHarness({
  initialLayout,
}: {
  initialLayout: DashboardWidgetLayout[];
}): React.JSX.Element {
  const [layout, setLayout] = useState(initialLayout);

  return (
    <MemoryRouter>
      <ConfigurableDashboardGrid
        layout={layout}
        onLayoutChange={(next) => {
          currentLayout = next;
          setLayout(next);
        }}
      />
    </MemoryRouter>
  );
}

function stubViewport(width: number): void {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("1024") ? width >= 1024 : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

async function mountGrid(
  initialLayout = computeLayoutPositions(
    getDefaultDashboardLayout().widgets,
  ),
): Promise<HTMLElement> {
  currentLayout = initialLayout;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(<GridHarness initialLayout={initialLayout} />);
  });

  return container;
}

async function unmountGrid(): Promise<void> {
  if (root) {
    const currentRoot = root;
    await act(async () => currentRoot.unmount());
  }

  container?.remove();
  root = null;
  container = null;
  currentLayout = [];
}

function getHandle(
  action: "move" | "resize",
  widgetId: string,
): HTMLButtonElement {
  const handle = document.querySelector<HTMLButtonElement>(
    `[data-action-${action}][data-widget-id="${widgetId}"]`,
  );
  if (!handle) throw new Error(`${action} handle missing for ${widgetId}`);
  return handle;
}

function itemOf(
  layout: DashboardWidgetLayout[],
  widgetId: string,
): DashboardWidgetLayout {
  const item = layout.find((entry) => entry.widgetId === widgetId);
  if (!item) throw new Error(`Widget ${widgetId} is missing from the layout`);
  return item;
}

function statusText(): string {
  return document.querySelector('[role="status"]')?.textContent ?? "";
}

function hasOverlap(layout: DashboardWidgetLayout[]): boolean {
  for (let left = 0; left < layout.length; left += 1) {
    for (let right = left + 1; right < layout.length; right += 1) {
      const a = layout[left];
      const b = layout[right];
      if (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
      ) {
        return true;
      }
    }
  }
  return false;
}

async function pressKey(handle: HTMLElement, key: string): Promise<void> {
  await act(async () => {
    handle.focus();
    handle.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  });
}

async function dispatchPointer(
  target: EventTarget,
  type: string,
  clientX = 0,
  clientY = 0,
): Promise<void> {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    button: { value: 0 },
    clientX: { value: clientX },
    clientY: { value: clientY },
  });

  await act(async () => {
    target.dispatchEvent(event);
  });
}

function gridItem(
  widgetId: DashboardWidgetLayout["widgetId"],
  x: number,
  y: number,
  w: number,
  h: number,
): DashboardWidgetLayout {
  return { widgetId, x, y, w, h, visible: true };
}

beforeEach(() => {
  currentLayout = [];
  stubViewport(1440);
});

afterEach(async () => {
  await unmountGrid();
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
  vi.restoreAllMocks();
});

describe("configurable dashboard grid interactions", () => {
  it("renders separate accessible move and resize controls with instructions", async () => {
    await mountGrid();

    const move = getHandle("move", "continue-watching");
    const resize = getHandle("resize", "continue-watching");

    expect(
      document.querySelectorAll(
        'ul[aria-label="Dashboard widgets"] > li',
      ).length,
    ).toBe(8);
    expect(move.getAttribute("aria-label")).toMatch(
      /Move Continue Watching widget\. Current position: column 1, row 1/,
    );
    expect(resize.getAttribute("aria-label")).toMatch(
      /Resize Continue Watching widget\. Current size: 8 columns by 2 rows/,
    );
    expect(move.getAttribute("aria-describedby")).toBe(
      "dashboard-grid-instructions",
    );
    expect(resize.hasAttribute("aria-keyshortcuts")).toBe(true);
    expect(
      document.getElementById("dashboard-grid-instructions")?.textContent,
    ).toContain("Use arrow keys on a Move button");
  });

  it("moves one grid cell with focused arrow keys and preserves focus", async () => {
    const initialLayout = computeLayoutPositions(
      getDefaultDashboardLayout().widgets,
    );
    await mountGrid(initialLayout);
    const move = getHandle("move", "continue-watching");
    const initial = itemOf(initialLayout, "continue-watching");

    await pressKey(move, "ArrowRight");

    expect(itemOf(currentLayout, "continue-watching")).toMatchObject({
      x: initial.x + 1,
      y: initial.y,
    });
    expect(document.activeElement).toBe(move);
    expect(statusText()).toMatch(/Continue Watching moved to column 2, row 1/);

    await pressKey(move, "ArrowLeft");
    expect(itemOf(currentLayout, "continue-watching")).toMatchObject({
      x: initial.x,
      y: initial.y,
    });
    expect(document.activeElement).toBe(move);
  });

  it("allows keyboard movement beyond the former fixed row boundary", async () => {
    const initial = [gridItem("quick-actions", 6, 4, 6, 2)];
    await mountGrid(initial);
    const move = getHandle("move", "quick-actions");

    for (let index = 0; index < 16; index += 1) {
      await pressKey(move, "ArrowRight");
      await pressKey(move, "ArrowDown");
    }

    const result = itemOf(currentLayout, "quick-actions");
    expect(result).toMatchObject({ x: 6, y: 20, w: 6, h: 2 });
    expect(result.x + result.w).toBeLessThanOrEqual(12);
    expect(result.y).toBeGreaterThan(8);
    expect(result.y).toBeGreaterThanOrEqual(0);
  });

  it("resizes by supported registry steps without crossing the minimum", async () => {
    const initialLayout = computeLayoutPositions(
      getDefaultDashboardLayout().widgets,
    );
    await mountGrid(initialLayout);
    const resize = getHandle("resize", "continue-watching");

    await pressKey(resize, "ArrowLeft");
    expect(itemOf(currentLayout, "continue-watching")).toMatchObject({
      w: 6,
      h: 2,
    });
    expect(document.activeElement).toBe(resize);

    await pressKey(resize, "ArrowLeft");
    expect(itemOf(currentLayout, "continue-watching")).toMatchObject({
      w: 4,
      h: 1,
    });
    await pressKey(resize, "ArrowLeft");
    expect(itemOf(currentLayout, "continue-watching")).toMatchObject({
      w: 4,
      h: 1,
    });
    expect(statusText()).toMatch(/Continue Watching resized to 4 columns by 1 row/);
  });

  it("does not resize beyond a widget's available grid width", async () => {
    await mountGrid([gridItem("upcoming-releases", 8, 0, 4, 2)]);
    const resize = getHandle("resize", "upcoming-releases");

    await pressKey(resize, "ArrowRight");

    expect(itemOf(currentLayout, "upcoming-releases")).toMatchObject({
      x: 8,
      w: 4,
      h: 2,
    });
    expect(itemOf(currentLayout, "upcoming-releases").x + 4).toBe(12);
  });

  it("resizes by pointer-snapped grid steps", async () => {
    await mountGrid([gridItem("watchlog-highlights", 0, 0, 4, 1)]);
    const grid = document.querySelector("ul[aria-label='Dashboard widgets']");
    if (!(grid instanceof HTMLElement)) throw new Error("dashboard grid missing");
    vi.spyOn(grid, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 1200, 1000),
    );

    const resize = getHandle("resize", "watchlog-highlights");
    await dispatchPointer(resize, "pointerdown", 0, 0);
    expect(statusText()).toContain("Resizing WatchLog Highlights");
    await dispatchPointer(document, "pointermove", 100, 0);
    await dispatchPointer(document, "pointerup");

    expect(itemOf(currentLayout, "watchlog-highlights")).toMatchObject({
      w: 6,
      h: 1,
    });
    expect(statusText()).toMatch(
      /Finished resizing WatchLog Highlights to 6 columns by 1 row/,
    );
  });

  it("uses the dominant pointer axis for diagonal resize direction", async () => {
    await mountGrid([gridItem("watchlog-highlights", 0, 2, 4, 1)]);
    const grid = document.querySelector("ul[aria-label='Dashboard widgets']");
    if (!(grid instanceof HTMLElement)) throw new Error("dashboard grid missing");
    vi.spyOn(grid, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 1200, 1000),
    );

    const resize = getHandle("resize", "watchlog-highlights");
    await dispatchPointer(resize, "pointerdown", 0, 0);
    await dispatchPointer(document, "pointermove", 100, -152);
    await dispatchPointer(document, "pointerup");

    expect(itemOf(currentLayout, "watchlog-highlights")).toMatchObject({
      w: 6,
      h: 1,
    });

    await dispatchPointer(resize, "pointerdown", 0, 0);
    await dispatchPointer(document, "pointermove", -100, 152);
    await dispatchPointer(document, "pointerup");

    expect(itemOf(currentLayout, "watchlog-highlights")).toMatchObject({
      w: 4,
      h: 1,
    });
  });

  it("snaps pointer movement to grid cells and resolves collisions", async () => {
    const initialLayout = [
      gridItem("continue-watching", 0, 0, 8, 2),
      gridItem("upcoming-releases", 8, 0, 4, 2),
    ];
    await mountGrid(initialLayout);

    const grid = document.querySelector("ul[aria-label='Dashboard widgets']");
    if (!(grid instanceof HTMLElement)) throw new Error("dashboard grid missing");
    vi.spyOn(grid, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 1200, 1000),
    );

    const move = getHandle("move", "continue-watching");
    await dispatchPointer(move, "pointerdown", 0, 0);
    expect(statusText()).toContain("Moving Continue Watching");
    await dispatchPointer(document, "pointermove", 100, 0);
    await dispatchPointer(document, "pointerup");

    expect(itemOf(currentLayout, "continue-watching").x).toBe(1);
    expect(itemOf(currentLayout, "upcoming-releases")).not.toMatchObject({
      x: 8,
      y: 0,
    });
    expect(hasOverlap(currentLayout)).toBe(false);
    expect(statusText()).toMatch(/Finished moving Continue Watching at column 2, row 1/);
  });

  it("keeps a multi-cell drag destination while packing multiple crossed widgets", async () => {
    const initialLayout = [
      gridItem("continue-watching", 0, 0, 6, 2),
      gridItem("story-landscape", 6, 1, 4, 1),
      gridItem("library-at-a-glance", 6, 2, 4, 1),
    ];
    const initialSnapshot = structuredClone(initialLayout);
    const destination = { x: 4, y: 1, w: 6, h: 2 };

    expect(hasOverlap(initialLayout)).toBe(false);
    for (const widgetId of ["story-landscape", "library-at-a-glance"] as const) {
      const item = itemOf(initialLayout, widgetId);
      expect(
        destination.x < item.x + item.w &&
          destination.x + destination.w > item.x &&
          destination.y < item.y + item.h &&
          destination.y + destination.h > item.y,
      ).toBe(true);
    }

    const dragToDestination = async (): Promise<DashboardWidgetLayout[]> => {
      await mountGrid(initialLayout);
      const grid = document.querySelector(
        "ul[aria-label='Dashboard widgets']",
      );
      if (!(grid instanceof HTMLElement)) {
        throw new Error("dashboard grid missing");
      }
      vi.spyOn(grid, "getBoundingClientRect").mockReturnValue(
        new DOMRect(0, 0, 1200, 1000),
      );
      const style = window.getComputedStyle(grid);
      const gap = Number.parseFloat(style.columnGap) || 0;
      const columnPitch = (1200 - gap * 11) / 12 + gap;
      const rowPitch =
        (Number.parseFloat(style.gridAutoRows) || 128) +
        (Number.parseFloat(style.rowGap) || 0);

      await dispatchPointer(
        getHandle("move", "continue-watching"),
        "pointerdown",
        0,
        0,
      );
      await dispatchPointer(
        document,
        "pointermove",
        columnPitch * destination.x,
        rowPitch * destination.y,
      );
      await dispatchPointer(document, "pointerup");

      return currentLayout.map((item) => ({ ...item }));
    };

    const firstLayout = await dragToDestination();

    expect(itemOf(firstLayout, "continue-watching")).toMatchObject({
      x: 4,
      y: 1,
      w: 6,
      h: 2,
    });
    for (const widgetId of ["story-landscape", "library-at-a-glance"] as const) {
      const displaced = itemOf(firstLayout, widgetId);
      const original = itemOf(initialLayout, widgetId);
      expect({ x: displaced.x, y: displaced.y }).not.toEqual({
        x: original.x,
        y: original.y,
      });
    }
    expect(hasOverlap(firstLayout)).toBe(false);
    for (const item of firstLayout) {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.x + item.w).toBeLessThanOrEqual(12);
    }
    expect(initialLayout).toEqual(initialSnapshot);

    await unmountGrid();
    const repeatedLayout = await dragToDestination();
    expect(repeatedLayout).toEqual(firstLayout);
  });

  it("does not start a drag from links inside a widget", async () => {
    await mountGrid();
    const link = document.querySelector(
      '[data-widget-id="quick-actions"] a',
    ) as HTMLAnchorElement | null;
    if (!link) throw new Error("Quick Actions link missing");

    const before = currentLayout;
    await dispatchPointer(link, "pointerdown", 0, 0);
    await dispatchPointer(document, "pointermove", 400, 400);
    await dispatchPointer(document, "pointerup");
    await act(async () => link.click());

    expect(link.href).toContain("/library");
    expect(currentLayout).toBe(before);
  });

  it("packs colliding widgets after a resize without changing supported dimensions", async () => {
    const initial = [
      gridItem("watchlog-highlights", 4, 2, 4, 1),
      gridItem("story-landscape", 8, 2, 4, 1),
    ];
    await mountGrid(initial);
    const resize = getHandle("resize", "watchlog-highlights");

    await pressKey(resize, "ArrowRight");

    expect(itemOf(currentLayout, "watchlog-highlights")).toMatchObject({
      x: 4,
      y: 2,
      w: 6,
      h: 1,
    });
    expect(hasOverlap(currentLayout)).toBe(false);
    expect(itemOf(currentLayout, "story-landscape")).not.toMatchObject({
      x: 8,
      y: 2,
    });
  });

  it("cancels pointer interaction and restores the complete starting layout", async () => {
    const initialLayout = [
      gridItem("continue-watching", 0, 0, 8, 2),
      gridItem("upcoming-releases", 8, 0, 4, 2),
    ];
    await mountGrid(initialLayout);

    const grid = document.querySelector("ul[aria-label='Dashboard widgets']");
    if (!(grid instanceof HTMLElement)) throw new Error("dashboard grid missing");
    vi.spyOn(grid, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 1200, 1000),
    );

    await dispatchPointer(getHandle("move", "continue-watching"), "pointerdown");
    await dispatchPointer(document, "pointermove", 100, 0);
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(currentLayout).toEqual(initialLayout);
    expect(statusText()).toMatch(/Move canceled/);
  });

  it.each([390, 440, 768, 1440])(
    "keeps keyboard movement and resizing available at %i pixels",
    async (width) => {
      stubViewport(width);
      await mountGrid([gridItem("continue-watching", 0, 0, 8, 2)]);

      const move = getHandle("move", "continue-watching");
      const resize = getHandle("resize", "continue-watching");
      expect(move.tabIndex).toBe(0);
      expect(resize.tabIndex).toBe(0);

      await pressKey(move, "ArrowRight");
      expect(itemOf(currentLayout, "continue-watching")).toMatchObject({
        x: 1,
        y: 0,
        w: 8,
        h: 2,
      });
      expect(document.activeElement).toBe(move);
      expect(statusText()).toContain("moved to column 2, row 1");

      await pressKey(resize, "ArrowLeft");
      expect(itemOf(currentLayout, "continue-watching")).toMatchObject({
        x: 1,
        y: 0,
        w: 6,
        h: 2,
      });
      expect(document.activeElement).toBe(resize);
      expect(statusText()).toContain("resized to 6 columns by 2 rows");

      if (width < 1024) {
        const className = document
          .querySelector('[data-widget-id="continue-watching"]')
          ?.closest("li")?.className;
        expect(className).toContain("col-span-1");
        if (width >= 768) expect(className).toContain("md:col-span-3");

        const beforePointer = currentLayout;
        await dispatchPointer(move, "pointerdown", 0, 0);
        await dispatchPointer(document, "pointermove", 400, 400);
        await dispatchPointer(document, "pointerup");
        expect(currentLayout).toBe(beforePointer);
      } else {
        expect(
          document.querySelector('[data-widget-id="continue-watching"]')
            ?.closest("li")?.style.gridColumn,
        ).toBe("2 / span 6");
      }
    },
  );

  it("keeps responsive flow behavior on tablet and mobile widths", async () => {
    stubViewport(768);
    await mountGrid();

    expect(
      document.querySelector('[data-widget-id="continue-watching"]')
        ?.closest("li")
        ?.className,
    ).toContain("md:col-span-6");
    expect(
      document.querySelector("ul[aria-label='Dashboard widgets']")?.getAttribute("style"),
    ).toBeNull();
  });

  it("returns to the default placement when the grid is remounted", async () => {
    const initialLayout = computeLayoutPositions(
      getDefaultDashboardLayout().widgets,
    );
    await mountGrid(initialLayout);
    await pressKey(getHandle("move", "continue-watching"), "ArrowRight");
    expect(itemOf(currentLayout, "continue-watching").x).toBe(1);

    await unmountGrid();
    await mountGrid(
      computeLayoutPositions(getDefaultDashboardLayout().widgets),
    );

    expect(currentLayout).toEqual(initialLayout);
  });
});
