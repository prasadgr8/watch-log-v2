import { describe, expect, it } from "vitest";

import { GRID_COLUMNS } from "../../../domain/dashboardGrid";
import {
  getDefaultDashboardLayout,
  type DashboardWidgetLayout,
} from "../defaultLayout";
import { WIDGET_REGISTRY } from "../widgetRegistry";
import { autoArrangeVisibleWidgets } from "./dashboardLayoutService";

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

describe("default dashboard layout", () => {
  it("is deterministic, registry-sized, and collision-free", () => {
    const first = getDefaultDashboardLayout().widgets;
    const second = getDefaultDashboardLayout().widgets;

    expect(second).toEqual(first);
    expect(hasOverlap(first)).toBe(false);
    expect(first.map(({ widgetId, x, y }) => [widgetId, x, y])).toEqual([
      ["continue-watching", 0, 0],
      ["upcoming-releases", 8, 0],
      ["recently-watched", 0, 2],
      ["watchlog-highlights", 4, 2],
      ["story-landscape", 8, 2],
      ["library-at-a-glance", 4, 3],
      ["top-stories", 0, 4],
      ["quick-actions", 6, 4],
    ]);

    for (const item of first) {
      const definition = WIDGET_REGISTRY[item.widgetId];
      expect({ w: item.w, h: item.h }).toEqual(definition.defaultSize);
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.x + item.w).toBeLessThanOrEqual(GRID_COLUMNS);
    }
  });
});

describe("auto arranging visible dashboard widgets", () => {
  it("preserves visible widgets and supported sizes while resolving collisions", () => {
    const layout: DashboardWidgetLayout[] = [
      {
        widgetId: "continue-watching",
        x: 0,
        y: 12,
        w: 8,
        h: 2,
        visible: true,
      },
      {
        widgetId: "upcoming-releases",
        x: 0,
        y: 12,
        w: 4,
        h: 2,
        visible: true,
      },
      {
        widgetId: "recently-watched",
        x: 0,
        y: 12,
        w: 4,
        h: 2,
        visible: true,
      },
      {
        widgetId: "quick-actions",
        x: 0,
        y: 12,
        w: 6,
        h: 2,
        visible: false,
      },
    ];
    const visibleInput = layout.filter((item) => item.visible);
    const visibleSnapshot = structuredClone(visibleInput);

    const arranged = autoArrangeVisibleWidgets(layout);
    const repeated = autoArrangeVisibleWidgets(layout);

    expect(arranged).toEqual(repeated);
    expect(arranged.map((item) => item.widgetId)).toEqual(
      visibleInput.map((item) => item.widgetId),
    );
    expect(layout.filter((item) => !item.visible)).toEqual([
      {
        widgetId: "quick-actions",
        x: 0,
        y: 12,
        w: 6,
        h: 2,
        visible: false,
      },
    ]);
    expect(visibleInput).toEqual(visibleSnapshot);
    expect(hasOverlap(arranged)).toBe(false);
    expect(Math.max(...arranged.map((item) => item.y + item.h))).toBe(4);

    for (const item of arranged) {
      expect({ w: item.w, h: item.h }).toEqual({
        w: visibleInput.find((entry) => entry.widgetId === item.widgetId)?.w,
        h: visibleInput.find((entry) => entry.widgetId === item.widgetId)?.h,
      });
      expect(
        WIDGET_REGISTRY[item.widgetId].supportedSizes.some(
          (size) => size.w === item.w && size.h === item.h,
        ),
      ).toBe(true);
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.x + item.w).toBeLessThanOrEqual(GRID_COLUMNS);
    }
  });

  it("uses role hints for compact layout and fills the leading role when hidden", () => {
    const defaults = getDefaultDashboardLayout().widgets;
    const withoutContinueWatching = defaults.filter(
      (item) => item.widgetId !== "continue-watching",
    );
    const arranged = autoArrangeVisibleWidgets(withoutContinueWatching);

    expect(arranged[0]).toMatchObject({
      widgetId: "upcoming-releases",
      x: 0,
      y: 0,
    });
    expect(hasOverlap(arranged)).toBe(false);
    for (const item of arranged) {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.x + item.w).toBeLessThanOrEqual(GRID_COLUMNS);
    }
  });

  it("rejects a visible widget size outside its registry contract", () => {
    const invalid = [
      {
        widgetId: "continue-watching" as const,
        x: 0,
        y: 0,
        w: 5,
        h: 2,
        visible: true,
      },
    ];

    expect(() => autoArrangeVisibleWidgets(invalid)).toThrow(RangeError);
  });
});
