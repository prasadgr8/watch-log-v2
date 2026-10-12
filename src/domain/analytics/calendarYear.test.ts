import { describe, expect, it } from "vitest";

import { buildTrailingYearDayActivity } from "./calendarYear";
import { getLocalDayNumber } from "./watchPeriods";
import type { WatchActivityEvent } from "./types";

/*
 * Deterministic tests for the trailing-twelve-month daily activity series.
 *
 * Every fixture is built from LOCAL calendar components (never a UTC ISO
 * string), so these assertions describe the user own calendar and hold in
 * every timezone. The window is the twelve calendar months ENDING on the
 * month that contains the supplied `now` (the "Last 12 months" period), NOT
 * the twelve months ending at the last event -- so `now` is always injected
 * and no clock is read here.
 */

/** Local-date fixture: `new Date(year, monthIndex, day, hours, minutes)`. */
function localDate(
  year: number,
  monthIndex: number,
  day: number,
  hours = 0,
  minutes = 0,
): Date {
  return new Date(year, monthIndex, day, hours, minutes, 0, 0);
}

function makeEvent(watchedAt: Date): WatchActivityEvent {
  return { episodeId: 1, watchedAt, source: "manual" };
}

function assertGapFreeAscending(
  days: readonly { periodStart: Date }[],
): void {
  for (let index = 1; index < days.length; index += 1) {
    expect(days[index].periodStart.getTime()).toBeGreaterThan(
      days[index - 1].periodStart.getTime(),
    );
  }
}

describe("buildTrailingYearDayActivity", () => {
  it("spans exactly the twelve months ending on the month of now", () => {
    // now = Oct 11 2026 -> window Nov 1 2025 .. Nov 1 2026 (exclusive).
    const now = localDate(2026, 9, 11);

    const result = buildTrailingYearDayActivity([], now);

    expect(result.windowStart).toEqual(localDate(2025, 10, 1));
    expect(result.windowEnd).toEqual(localDate(2026, 10, 1));
    expect(result.days).toHaveLength(365);
    assertGapFreeAscending(result.days);
  });

  it("anchors the window to now, not to the last watch event", () => {
    // now is Oct 2026 but the only event is Apr 2026: the window still ends
    // on the month of now (Oct 2026), covering Nov 2025 .. Nov 2026.
    const now = localDate(2026, 9, 11);
    const result = buildTrailingYearDayActivity([
      makeEvent(localDate(2026, 3, 20)),
    ], now);

    expect(result.windowEnd).toEqual(localDate(2026, 10, 1));
    expect(result.windowStart).toEqual(localDate(2025, 10, 1));
    expect(result.days).toHaveLength(365);
  });

  it("handles a leap February reference year correctly", () => {
    // now = Feb 29 2024 (leap day) -> window Mar 1 2023 .. Mar 1 2024.
    const now = localDate(2024, 1, 29);

    const result = buildTrailingYearDayActivity([], now);

    expect(result.windowStart).toEqual(localDate(2023, 2, 1));
    expect(result.windowEnd).toEqual(localDate(2024, 2, 1));
    // Mar 2023 .. Mar 2024 includes Feb 29 2024 -> 366 days.
    expect(result.days).toHaveLength(366);
    assertGapFreeAscending(result.days);
  });

  it("returns a full zero-filled window for an empty history", () => {
    const result = buildTrailingYearDayActivity([], localDate(2026, 9, 11));

    expect(result.days).toHaveLength(365);
    expect(result.days.every((day) => day.eventCount === 0)).toBe(true);
  });

  it("zero-fills days when no events fall inside the period", () => {
    // Event is before the window (Nov 2024, now = Oct 2026).
    const result = buildTrailingYearDayActivity(
      [makeEvent(localDate(2024, 10, 5))],
      localDate(2026, 9, 11),
    );

    expect(result.days).toHaveLength(365);
    expect(result.days.every((day) => day.eventCount === 0)).toBe(true);
  });

  it("includes an event exactly on the start boundary and excludes one past the end", () => {
    const now = localDate(2026, 9, 11);
    // windowStart = Nov 1 2025 (inclusive); windowEnd = Nov 1 2026 (exclusive).
    const result = buildTrailingYearDayActivity(
      [
        makeEvent(localDate(2025, 10, 1, 0, 0)),
        makeEvent(localDate(2026, 10, 1, 0, 0)),
      ],
      now,
    );

    const byDay = new Map(
      result.days.map((day) => [
        getLocalDayNumber(day.periodStart),
        day.eventCount,
      ]),
    );

    expect(byDay.get(getLocalDayNumber(localDate(2025, 10, 1)))).toBe(1);
    expect(byDay.get(getLocalDayNumber(localDate(2026, 10, 1)))).toBeUndefined();
  });

  it("overlays per-day counts and zero-fills interior days without events", () => {
    const result = buildTrailingYearDayActivity(
      [
        makeEvent(localDate(2026, 6, 20, 9)),
        makeEvent(localDate(2026, 6, 20, 21)),
        makeEvent(localDate(2026, 6, 22, 12)),
      ],
      localDate(2026, 9, 11),
    );

    const byDay = new Map(
      result.days.map((day) => [
        getLocalDayNumber(day.periodStart),
        day.eventCount,
      ]),
    );

    expect(byDay.get(getLocalDayNumber(localDate(2026, 6, 20)))).toBe(2);
    expect(byDay.get(getLocalDayNumber(localDate(2026, 6, 21)))).toBe(0);
    expect(byDay.get(getLocalDayNumber(localDate(2026, 6, 22)))).toBe(1);
  });

  it("is deterministic, order-independent, and never mutates the input", () => {
    const now = localDate(2026, 9, 11);
    const events = [
      makeEvent(localDate(2026, 6, 20)),
      makeEvent(localDate(2026, 3, 2)),
      makeEvent(localDate(2026, 6, 21)),
    ];
    const snapshot = structuredClone(events);

    const forward = buildTrailingYearDayActivity(events, now);
    const reversed = buildTrailingYearDayActivity([...events].reverse(), now);

    expect(reversed).toEqual(forward);
    expect(events).toEqual(snapshot);
  });
});
