import { act, type JSX } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GRID_COLUMNS } from "../../domain/dashboardGrid";
import { autoArrangeVisibleWidgets } from "./services/dashboardLayoutService";
import ConfigurableDashboardPage from "./components/ConfigurableDashboardPage";
import { getDefaultDashboardLayout } from "./defaultLayout";
import { WIDGET_REGISTRY } from "./widgetRegistry";
import DashboardCustomizeButton from "./components/DashboardCustomizeButton";
import { DashboardCustomizationProvider } from "./services/dashboardCustomization";
import { useDashboardCustomization } from "./services/dashboardCustomizationContext";
import type { DashboardWidgetLayout } from "./defaultLayout";

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
let previousMatchMedia: PropertyDescriptor | undefined;

function currentVisibleLayout(): DashboardWidgetLayout[] {
  return Array.from(
    document.querySelectorAll<HTMLLIElement>(
      'ul[aria-label="Dashboard widgets"] > li',
    ),
  ).map((element) => {
    const card = element.querySelector<HTMLElement>("[data-widget-id]");
    if (!card) throw new Error("Dashboard widget card is missing");

    const [column, width] = element.style.gridColumn
      .split(" / span ")
      .map(Number);
    const [row, height] = element.style.gridRow.split(" / span ").map(Number);

    return {
      widgetId: card.dataset.widgetId as DashboardWidgetLayout["widgetId"],
      x: column - 1,
      y: row - 1,
      w: width,
      h: height,
      visible: true,
    };
  });
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

async function click(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.focus();
    element.click();
    await Promise.resolve();
  });
}

async function flushTransientRadioReset(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function pressKey(element: HTMLElement, key: string): Promise<void> {
  await act(async () => {
    element.focus();
    element.dispatchEvent(
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
  await act(async () => target.dispatchEvent(event));
}

function getButton(name: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll("button")).find(
    (element) => element.getAttribute("aria-label") === name,
  );
  if (!button) throw new Error(`Button ${name} is missing`);
  return button;
}

function getLayoutAction(value: "auto-arrange" | "reset-layout"): HTMLInputElement {
  const radio = document.querySelector<HTMLInputElement>(
    `input[name="dashboard-layout-action"][value="${value}"]`,
  );
  if (!radio) throw new Error(`Layout action ${value} is missing`);
  return radio;
}

function expectValidLayout(layout: DashboardWidgetLayout[]): void {
  expect(hasOverlap(layout)).toBe(false);
  for (const item of layout) {
    expect(item.x).toBeGreaterThanOrEqual(0);
    expect(item.x + item.w).toBeLessThanOrEqual(GRID_COLUMNS);
    expect(item.y).toBeGreaterThanOrEqual(0);
  }
}

beforeEach(async () => {
  previousMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (media: string) => ({
      matches: media.includes("1024"),
      media,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
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

  if (previousMatchMedia) {
    Object.defineProperty(window, "matchMedia", previousMatchMedia);
  } else {
    delete (window as unknown as { matchMedia?: unknown }).matchMedia;
  }
  vi.restoreAllMocks();
});

describe("configurable dashboard layout actions", () => {
  it("auto-arranges visible widgets without changing sizes or visibility", async () => {
    const defaults = getDefaultDashboardLayout().widgets;
    const resize = document.querySelector<HTMLButtonElement>(
      '[data-action-resize][data-widget-id="continue-watching"]',
    );
    if (!resize) throw new Error("Continue Watching resize control is missing");
    await pressKey(resize, "ArrowLeft");
    const move = document.querySelector<HTMLButtonElement>(
      '[data-action-move][data-widget-id="continue-watching"]',
    );
    if (!move) throw new Error("Continue Watching move control is missing");
    await pressKey(move, "ArrowRight");

    await click(getButton("Customize Dashboard"));
    const upcomingCheckbox = document.getElementById(
      "widget-visibility-upcoming-releases",
    );
    if (!(upcomingCheckbox instanceof HTMLInputElement)) {
      throw new Error("Upcoming Releases visibility control is missing");
    }
    await click(upcomingCheckbox);
    const done = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Done",
    );
    if (!(done instanceof HTMLButtonElement)) {
      throw new Error("Customization Done button is missing");
    }
    await click(done);

    await click(getButton("Customize Dashboard"));
    const beforeArrange = currentVisibleLayout();
    const beforeSizes = new Map(
      beforeArrange.map((item) => [item.widgetId, { w: item.w, h: item.h }]),
    );
    expect(
      beforeArrange.some((item) => item.widgetId === "upcoming-releases"),
    ).toBe(false);
    expect(
      beforeArrange.find((item) => item.widgetId === "continue-watching"),
    ).toMatchObject({ w: 6, h: 2 });

    const autoArrange = getLayoutAction("auto-arrange");
    await click(autoArrange);
    await flushTransientRadioReset();

    const arranged = currentVisibleLayout();
    expect(arranged.map((item) => item.widgetId)).toEqual(
      beforeArrange.map((item) => item.widgetId),
    );
    expect(arranged).toHaveLength(defaults.length - 1);
    expectValidLayout(arranged);
    expect(autoArrange.checked).toBe(true);
    for (const item of arranged) {
      expect({ w: item.w, h: item.h }).toEqual(beforeSizes.get(item.widgetId));
      expect(
        WIDGET_REGISTRY[item.widgetId].supportedSizes.some(
          (size) => size.w === item.w && size.h === item.h,
        ),
      ).toBe(true);
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.x + item.w).toBeLessThanOrEqual(GRID_COLUMNS);
    }
    const statusMessages = document.querySelectorAll(
      'section[aria-label="Dashboard widgets"] > p[role="status"]',
    );
    expect(statusMessages[statusMessages.length - 1]?.textContent).toContain(
      "Visible dashboard widgets auto-arranged.",
    );

    await click(autoArrange);
    await flushTransientRadioReset();
    expect(currentVisibleLayout()).toEqual(arranged);
    expect(autoArrange.checked).toBe(true);
  });

  it("resets widget positions and sizes to default without changing visibility", async () => {
    const defaults = getDefaultDashboardLayout().widgets;
    const resize = document.querySelector<HTMLButtonElement>(
      '[data-action-resize][data-widget-id="continue-watching"]',
    );
    if (!resize) throw new Error("Continue Watching resize control is missing");
    await pressKey(resize, "ArrowLeft");

    const customPosition = document.querySelector<HTMLButtonElement>(
      '[data-action-move][data-widget-id="continue-watching"]',
    );
    if (!customPosition) throw new Error("Continue Watching move control is missing");
    await pressKey(customPosition, "ArrowDown");

    await click(getButton("Customize Dashboard"));
    const upcomingCheckbox = document.getElementById(
      "widget-visibility-upcoming-releases",
    );
    if (!(upcomingCheckbox instanceof HTMLInputElement)) {
      throw new Error("Upcoming Releases visibility control is missing");
    }
    await click(upcomingCheckbox);
    const resetLayout = getLayoutAction("reset-layout");
    const autoArrange = getLayoutAction("auto-arrange");
    expect(resetLayout.getAttribute("name")).toBe("dashboard-layout-action");
    expect(autoArrange.getAttribute("name")).toBe("dashboard-layout-action");
    await click(resetLayout);
    await flushTransientRadioReset();

    const reset = currentVisibleLayout();
    expect(reset).toHaveLength(defaults.length - 1);
    for (const item of reset) {
      const expected = defaults.find(
        (entry) => entry.widgetId === item.widgetId,
      );
      expect(expected).toBeDefined();
      expect(item).toMatchObject({
        x: expected?.x,
        y: expected?.y,
        w: expected?.w,
        h: expected?.h,
      });
    }
    expect(reset.some((item) => item.widgetId === "upcoming-releases")).toBe(
      false,
    );
    expectValidLayout(reset);
    expect(resetLayout.checked).toBe(true);
    const statusMessages = document.querySelectorAll(
      'section[aria-label="Dashboard widgets"] > p[role="status"]',
    );
    expect(statusMessages[statusMessages.length - 1]?.textContent).toContain(
      "Dashboard widget layout reset to default.",
    );

    await click(resetLayout);
    await flushTransientRadioReset();
    expect(currentVisibleLayout()).toEqual(reset);
  });

  it("keeps repeated Reset and Auto Arrange actions deterministic", async () => {
    const defaults = getDefaultDashboardLayout().widgets;
    await click(getButton("Customize Dashboard"));

    const reset = getLayoutAction("reset-layout");
    const arrange = getLayoutAction("auto-arrange");
    await click(reset);
    await flushTransientRadioReset();
    const resetOnce = currentVisibleLayout();
    await click(reset);
    await flushTransientRadioReset();
    expect(currentVisibleLayout()).toEqual(resetOnce);

    await click(arrange);
    await flushTransientRadioReset();
    const arrangeOnce = currentVisibleLayout();
    await click(arrange);
    await flushTransientRadioReset();
    expect(currentVisibleLayout()).toEqual(arrangeOnce);
    expectValidLayout(arrangeOnce);

    await click(reset);
    await flushTransientRadioReset();
    await click(arrange);
    await flushTransientRadioReset();
    await click(reset);
    await flushTransientRadioReset();
    expect(currentVisibleLayout()).toEqual(defaults);
    expectValidLayout(currentVisibleLayout());
  });

  it("rearranges a pointer-dragged layout using design-aware packing", async () => {
    const grid = document.querySelector<HTMLUListElement>(
      'ul[aria-label="Dashboard widgets"]',
    );
    if (!grid) throw new Error("Dashboard grid is missing");
    vi.spyOn(grid, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 1200, 1000),
    );

    const move = document.querySelector<HTMLButtonElement>(
      '[data-action-move][data-widget-id="continue-watching"]',
    );
    if (!move) throw new Error("Continue Watching move control is missing");
    await dispatchPointer(move, "pointerdown", 0, 0);
    await dispatchPointer(document, "pointermove", 100, 0);
    await dispatchPointer(document, "pointerup");
    expect(currentVisibleLayout().find((item) => item.widgetId === "continue-watching")?.x)
      .toBeGreaterThan(0);

    await click(getButton("Customize Dashboard"));
    await click(getLayoutAction("auto-arrange"));
    await flushTransientRadioReset();
    const arranged = currentVisibleLayout();
    expectValidLayout(arranged);
    expect(arranged).toEqual(
      autoArrangeVisibleWidgets(getDefaultDashboardLayout().widgets),
    );
  });

  it("activates layout radio actions from the keyboard and keeps selection", async () => {
    await click(getButton("Customize Dashboard"));
    const arrange = getLayoutAction("auto-arrange");
    const reset = getLayoutAction("reset-layout");

    await pressKey(arrange, "Enter");
    await flushTransientRadioReset();
    expect(arrange.checked).toBe(true);
    expect(reset.checked).toBe(false);
    expectValidLayout(currentVisibleLayout());

    await pressKey(arrange, " ");
    await flushTransientRadioReset();
    expect(arrange.checked).toBe(true);

    await pressKey(reset, "Enter");
    await flushTransientRadioReset();
    expect(reset.checked).toBe(true);
    expect(arrange.checked).toBe(false);
    expect(currentVisibleLayout()).toEqual(
      getDefaultDashboardLayout().widgets,
    );
  });
});