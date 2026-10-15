import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  CORE_WIDGET_IDS,
  WIDGET_REGISTRY,
  isConfigurableDashboardWidgetId,
} from "./widgetRegistry";
import {
  DASHBOARD_LAYOUT_VERSION,
  getDefaultDashboardLayout,
  getDefaultWidgetOrder,
} from "./defaultLayout";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const cardSource = readFileSync(
  join(featureDirectory, "components", "DashboardWidgetCard.tsx"),
  "utf-8",
);

const EXPECTED_WIDGETS = [
  { id: "continue-watching", title: "Continue Watching" },
  { id: "upcoming-releases", title: "Upcoming Releases" },
  { id: "recently-watched", title: "Recently Watched" },
  { id: "watchlog-highlights", title: "WatchLog Highlights" },
  { id: "story-landscape", title: "Your Story Landscape" },
  { id: "library-at-a-glance", title: "Your Library at a Glance" },
  { id: "top-stories", title: "Your Top Stories" },
  { id: "quick-actions", title: "Quick Actions" },
] as const;

describe("configurable dashboard widget registry", () => {
  it("registers exactly the 8 approved core widgets in order", () => {
    expect(CORE_WIDGET_IDS).toEqual(EXPECTED_WIDGETS.map((w) => w.id));
    expect(Object.keys(WIDGET_REGISTRY)).toEqual(
      EXPECTED_WIDGETS.map((w) => w.id),
    );
  });

  it("gives every widget an id, title, sizes, and responsive support", () => {
    for (const { id, title } of EXPECTED_WIDGETS) {
      const definition = WIDGET_REGISTRY[id];

      expect(definition.id).toBe(id);
      expect(definition.title).toBe(title);
      expect(definition.description.length).toBeGreaterThan(0);
      expect(definition.defaultSize.w).toBeGreaterThanOrEqual(
        definition.minSize.w,
      );
      expect(definition.defaultSize.w).toBeLessThanOrEqual(12);
      expect(definition.minSize.w).toBeGreaterThanOrEqual(1);
      expect(definition.supportedSizes.length).toBeGreaterThan(0);
    }
  });

  it("validates widget ids", () => {
    expect(isConfigurableDashboardWidgetId("continue-watching")).toBe(true);
    expect(isConfigurableDashboardWidgetId("quick-actions")).toBe(true);
    expect(isConfigurableDashboardWidgetId("not-a-widget")).toBe(false);
    expect(isConfigurableDashboardWidgetId(undefined)).toBe(false);
  });
});

describe("configurable dashboard default layout", () => {
  it("is versioned", () => {
    expect(DASHBOARD_LAYOUT_VERSION).toBe(1);
    expect(getDefaultDashboardLayout().version).toBe(1);
  });

  it("places all 8 widgets visibly with full position/size metadata", () => {
    const layout = getDefaultDashboardLayout();

    expect(layout.widgets).toHaveLength(8);

    const ids = layout.widgets.map((w) => w.widgetId);
    expect(ids).toEqual([...CORE_WIDGET_IDS]);

    for (const item of layout.widgets) {
      expect(item.visible).toBe(true);
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.w).toBeGreaterThanOrEqual(1);
      expect(item.w).toBeLessThanOrEqual(12);
      expect(item.h).toBeGreaterThanOrEqual(1);
    }
  });

  it("returns a fresh deterministic copy on every call", () => {
    const first = getDefaultDashboardLayout();
    const second = getDefaultDashboardLayout();

    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.widgets).not.toBe(first.widgets);
  });

  it("exposes the default widget order", () => {
    expect(getDefaultWidgetOrder()).toEqual([...CORE_WIDGET_IDS]);
  });
});

describe("configurable dashboard widget card scope", () => {
  it("renders placeholder shells without Step 2+ widget functionality", () => {
    expect(cardSource).not.toContain("progressPercentage");
    expect(cardSource).not.toContain("ProgressBar");
    expect(cardSource).not.toContain("IndexedDB");
    expect(cardSource).not.toContain("localStorage");
    expect(cardSource).not.toContain("onDrag");
    expect(cardSource).not.toContain("onDrop");
    expect(cardSource).not.toContain("onResize");
  });

  it("uses semantic theme tokens instead of hard-coded palette colors", () => {
    expect(cardSource).not.toMatch(/slate-/);
    expect(cardSource).not.toMatch(/text-white/);
    expect(cardSource).not.toMatch(/bg-blue-/);
    expect(cardSource).toContain("bg-surface");
    expect(cardSource).toContain("border-border");
    expect(cardSource).toContain("text-primary");
    expect(cardSource).toContain("text-muted");
  });

  it("exposes an accessible widget landmark", () => {
    expect(cardSource).toContain("aria-labelledby");
    expect(cardSource).toContain("data-widget-id");
  });
});
