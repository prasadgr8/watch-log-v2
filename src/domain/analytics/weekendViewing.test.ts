import { describe, expect, it } from "vitest";

import type { WatchActivityEvent } from "./types";
import { calculateWeekendViewing } from "./weekendViewing";

function eventAt(weekday: number, hour: number): WatchActivityEvent {
  // 2026-07-06 is a Monday. Offset days to reach the desired ISO weekday
  // (1=Mon ... 7=Sun), then set the hour.
  const base = new Date(2026, 6, 6, 0, 0, 0, 0); // Monday 2026-07-06
  const offsetDays = weekday - 1;
  base.setDate(base.getDate() + offsetDays);
  base.setHours(hour, 0, 0, 0);
  return {
    episodeId: null,
    mediaId: 1,
    mediaType: "movie",
    source: "manual",
    watchedAt: base,
  };
}

describe("calculateWeekendViewing", () => {
  it("returns isAvailable false for empty input", () => {
    const result = calculateWeekendViewing([]);

    expect(result.isAvailable).toBe(false);
    expect(result.totalEvents).toBe(0);
    expect(result.weekendEvents).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it("counts Saturday and Sunday as weekend events", () => {
    const result = calculateWeekendViewing([
      eventAt(6, 20), // Saturday
      eventAt(7, 21), // Sunday
      eventAt(1, 20), // Monday
    ]);

    expect(result.isAvailable).toBe(true);
    expect(result.totalEvents).toBe(3);
    expect(result.weekendEvents).toBe(2);
    expect(result.percentage).toBe(67);
  });

  it("excludes weekdays from the weekend count", () => {
    const result = calculateWeekendViewing([
      eventAt(1, 20), // Monday
      eventAt(2, 20), // Tuesday
      eventAt(3, 20), // Wednesday
      eventAt(4, 20), // Thursday
      eventAt(5, 20), // Friday
    ]);

    expect(result.weekendEvents).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it("returns 100% when all events are on weekend days", () => {
    const result = calculateWeekendViewing([
      eventAt(6, 10),
      eventAt(7, 22),
    ]);

    expect(result.weekendEvents).toBe(2);
    expect(result.percentage).toBe(100);
  });

  it("returns 0% when no events are on weekend days", () => {
    const result = calculateWeekendViewing([
      eventAt(1, 10),
      eventAt(3, 14),
      eventAt(5, 19),
    ]);

    expect(result.weekendEvents).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it("rounds to the nearest whole percent", () => {
    // 1 weekend out of 3 events = 33.33% → 33%
    const result = calculateWeekendViewing([
      eventAt(6, 20), // Saturday
      eventAt(1, 20), // Monday
      eventAt(2, 20), // Tuesday
    ]);

    expect(result.percentage).toBe(33);

    // 2 weekend out of 3 events = 66.67% → 67%
    const result2 = calculateWeekendViewing([
      eventAt(6, 20),
      eventAt(7, 20),
      eventAt(1, 20),
    ]);

    expect(result2.percentage).toBe(67);
  });
});