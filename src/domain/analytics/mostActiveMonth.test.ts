import { describe, expect, it } from "vitest";

import type { WatchActivityEvent } from "./types";
import { buildMostActiveMonth } from "./mostActiveMonth";

function eventAt(year: number, month: number, day: number, hour: number): WatchActivityEvent {
  return {
    episodeId: null,
    mediaId: 1,
    mediaType: "movie",
    source: "manual",
    watchedAt: new Date(year, month - 1, day, hour, 0, 0),
  };
}

describe("buildMostActiveMonth", () => {
  it("returns isAvailable false for no events", () => {
    const result = buildMostActiveMonth([], new Date(2026, 9, 15));

    expect(result.isAvailable).toBe(false);
    expect(result.label).toBe("No activity");
    expect(result.eventCount).toBe(0);
    expect(result.isTie).toBe(false);
  });

  it("selects the month with the most recorded events", () => {
    const result = buildMostActiveMonth(
      [
        eventAt(2025, 11, 8, 10),
        eventAt(2025, 11, 9, 14),
        eventAt(2025, 12, 1, 20),
      ],
      new Date(2026, 9, 15),
    );

    expect(result.isAvailable).toBe(true);
    expect(result.label).toBe("Nov 2025");
    expect(result.eventCount).toBe(2);
  });

  it("respects the trailing 12-month window boundary", () => {
    // Events in October 2025 (outside the window ending November 2026)
    // should not count when now is October 2026.
    const result = buildMostActiveMonth(
      [
        eventAt(2025, 10, 15, 10), // outside trailing 12 months
        eventAt(2026, 3, 15, 10),  // inside
        eventAt(2026, 3, 16, 10),  // inside
      ],
      new Date(2026, 9, 15),
    );

    expect(result.label).toBe("Mar 2026");
    expect(result.eventCount).toBe(2);
  });

  it("returns Multiple months on a deterministic tie", () => {
    const result = buildMostActiveMonth(
      [
        eventAt(2025, 11, 5, 10),
        eventAt(2025, 11, 6, 10),
        eventAt(2025, 12, 5, 10),
        eventAt(2025, 12, 6, 10),
      ],
      new Date(2026, 9, 15),
    );

    expect(result.isAvailable).toBe(true);
    expect(result.isTie).toBe(true);
    expect(result.label).toBe("Multiple months");
    expect(result.eventCount).toBe(2);
  });

  it("handles events around the window boundary", () => {
    // now = October 2026, window covers Nov 2025 through Oct 2026.
    // An event on Oct 31, 2026 is inside; Nov 1, 2026 is outside.
    const result = buildMostActiveMonth(
      [
        eventAt(2026, 10, 31, 23), // inside (October 2026)
        eventAt(2026, 11, 1, 0),   // outside (November 2026)
      ],
      new Date(2026, 9, 15),
    );

    expect(result.label).toBe("Oct 2026");
    expect(result.eventCount).toBe(1);
  });
});