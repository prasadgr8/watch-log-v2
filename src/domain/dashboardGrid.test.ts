import { describe, expect, it } from "vitest";

import {
  GRID_COLUMNS,
  computeLayoutPositions,
  offsetPosition,
  tryPackLayout,
  type DashboardGridItem,
} from "./dashboardGrid";

function widget(
  widgetId: string,
  x: number,
  y: number,
  w: number,
  h: number,
): DashboardGridItem {
  return { widgetId, x, y, w, h, visible: true };
}

function overlaps(layout: DashboardGridItem[]): boolean {
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

describe("dashboard grid packing", () => {
  it("resolves collisions deterministically and keeps every item in bounds", () => {
    const input = [
      widget("a", 0, 0, 6, 2),
      widget("b", 2, 1, 4, 2),
      widget("c", 0, 2, 12, 1),
      widget("d", 8, 0, 4, 1),
    ];

    const packed = computeLayoutPositions(input);

    expect(overlaps(packed)).toBe(false);
    expect(packed).toEqual(computeLayoutPositions(input));
    for (const item of packed) {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.x + item.w).toBeLessThanOrEqual(GRID_COLUMNS);
      expect(item.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps the actively repositioned widget at its requested cell", () => {
    const input = [
      widget("first", 0, 0, 4, 1),
      widget("active", 0, 0, 4, 1),
      widget("third", 4, 0, 4, 1),
    ];

    const packed = computeLayoutPositions(input, "active");

    expect(packed.find((item) => item.widgetId === "active")).toMatchObject({
      x: 0,
      y: 0,
    });
    expect(overlaps(packed)).toBe(false);
  });

  it("does not mutate input and preserves caller order and extra model fields", () => {
    const input = [
      { ...widget("a", 3, 1, 4, 2), marker: "preserved" },
      widget("b", 3, 1, 4, 2),
    ];
    const snapshot = structuredClone(input);

    const packed = computeLayoutPositions(input);

    expect(input).toEqual(snapshot);
    expect(packed.map((item) => item.widgetId)).toEqual(["a", "b"]);
    expect(packed[0]).toHaveProperty("marker", "preserved");
  });

  it("clamps origins without inventing or changing widget dimensions", () => {
    const packed = computeLayoutPositions([widget("a", -4, 99, 5, 3)]);

    expect(packed[0]).toMatchObject({ x: 0, y: 99, w: 5, h: 3 });
  });

  it("packs widgets below the former fixed row boundary", () => {
    const packed = computeLayoutPositions([
      widget("first", 0, 0, GRID_COLUMNS, 8),
      widget("second", 0, 0, GRID_COLUMNS, 8),
      widget("lower", 4, 13, 4, 2),
    ]);

    expect(packed.find((item) => item.widgetId === "second")?.y).toBe(8);
    expect(packed.find((item) => item.widgetId === "lower")?.y).toBeGreaterThan(8);
    expect(overlaps(packed)).toBe(false);
  });

  it("rejects invalid dimensions instead of silently normalizing spans", () => {
    for (const [w, h] of [
      [0, 1],
      [GRID_COLUMNS + 1, 1],
      [4, 0],
      [4.5, 1],
      [4, Number.POSITIVE_INFINITY],
    ]) {
      expect(() =>
        computeLayoutPositions([widget("invalid", 0, 0, w, h)]),
      ).toThrow(RangeError);
    }
  });

  it("always packs valid spans by extending the grid vertically", () => {
    const packed = tryPackLayout([
      widget("first", 0, 0, GRID_COLUMNS, 8),
      widget("second", 0, 0, GRID_COLUMNS, 8),
    ]);

    expect(packed.map((item) => item.y)).toEqual([0, 8]);
    expect(overlaps(packed)).toBe(false);
  });

  it("rejects duplicate identifiers and non-finite coordinates", () => {
    expect(() =>
      computeLayoutPositions([
        widget("same", 0, 0, 4, 1),
        widget("same", 4, 0, 4, 1),
      ]),
    ).toThrow(RangeError);
    expect(() =>
      computeLayoutPositions([widget("bad", Number.NaN, 0, 4, 1)]),
    ).toThrow(RangeError);
  });
});

describe("grid movement", () => {
  it("moves by cells while respecting horizontal bounds and nonnegative rows", () => {
    expect(offsetPosition({ x: 2, y: 3, w: 4, h: 2 }, 1, -1)).toEqual({
      x: 3,
      y: 2,
    });
    expect(offsetPosition({ x: 0, y: 0, w: 4, h: 2 }, -5, -5)).toEqual({
      x: 0,
      y: 0,
    });
    expect(offsetPosition({ x: 8, y: 9, w: 4, h: 2 }, 4, 5)).toEqual({
      x: 8,
      y: 14,
    });
  });
});
