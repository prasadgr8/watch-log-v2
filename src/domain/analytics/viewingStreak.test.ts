import { describe, expect, it } from "vitest";

import type { WatchActivityEvent } from "./types";

import { getCurrentStreak } from "./viewingStreak";

/*
 * Deterministic tests for the current viewing streak.
 *
 * Every fixture is built from LOCAL calendar components (never a UTC ISO
 * string), so these assertions describe the user's own calendar and hold in
 * every timezone. No database, clock, or network access is involved: the
 * streak is anchored to the latest viewing day in the supplied history, never
 * to "now", so the current time is never read.
 */

/** Local-date fixture: `new Date(2026, monthIndex, day, hours, minutes)`. */
function localDate(
  year: number,
  monthIndex: number,
  day: number,
  hours = 0,
  minutes = 0,
): Date {
  return new Date(year, monthIndex, day, hours, minutes, 0, 0);
}

function makeEvent(
  watchedAt: Date,
  overrides: Partial<WatchActivityEvent> = {},
): WatchActivityEvent {
  return {
    episodeId: 1,
    watchedAt,
    source: "manual",
    ...overrides,
  };
}

describe("getCurrentStreak", () => {
  it("counts a single viewing day as a streak of one", () => {
    expect(getCurrentStreak([makeEvent(localDate(2026, 6, 15))])).toBe(1);
  });

  it("counts a run of consecutive days", () => {
    const events = [
      makeEvent(localDate(2026, 6, 13)),
      makeEvent(localDate(2026, 6, 14)),
      makeEvent(localDate(2026, 6, 15)),
    ];

    expect(getCurrentStreak(events)).toBe(3);
  });

  it("breaks the streak across a gap and ends on the latest viewing day", () => {
    // Aug 1, 2, 3 active; Aug 4 empty; Aug 5, 6 active → current streak is 2.
    const events = [
      makeEvent(localDate(2026, 7, 1)),
      makeEvent(localDate(2026, 7, 2)),
      makeEvent(localDate(2026, 7, 3)),
      makeEvent(localDate(2026, 7, 5)),
      makeEvent(localDate(2026, 7, 6)),
    ];

    expect(getCurrentStreak(events)).toBe(2);
  });

  it("counts multiple events on one day as a single viewing day", () => {
    const events = [
      makeEvent(localDate(2026, 6, 15, 8)),
      makeEvent(localDate(2026, 6, 15, 13)),
      makeEvent(localDate(2026, 6, 15, 21)),
    ];

    expect(getCurrentStreak(events)).toBe(1);
  });

  it("does not let non-consecutive historical activity inflate the current streak", () => {
    // A long run early in the month, then a lone recent day two weeks later.
    const events = [
      makeEvent(localDate(2026, 6, 1)),
      makeEvent(localDate(2026, 6, 2)),
      makeEvent(localDate(2026, 6, 3)),
      makeEvent(localDate(2026, 6, 20)),
    ];

    expect(getCurrentStreak(events)).toBe(1);
  });

  it("keeps a late-evening event in its own local day, not the next UTC day", () => {
    const events = [
      makeEvent(localDate(2026, 6, 14, 23, 30)),
      makeEvent(localDate(2026, 6, 15, 0, 30)),
    ];

    // 23:30 and 00:30 are two distinct local days that are consecutive.
    expect(getCurrentStreak(events)).toBe(2);
  });

  it("returns zero for an empty history", () => {
    expect(getCurrentStreak([])).toBe(0);
  });

  it("is independent of the order events are supplied in and never mutates them", () => {
    const events = [
      makeEvent(localDate(2026, 6, 15)),
      makeEvent(localDate(2026, 6, 13)),
      makeEvent(localDate(2026, 6, 14)),
    ];
    const snapshot = structuredClone(events);

    const forward = getCurrentStreak(events);
    const reversed = getCurrentStreak([...events].reverse());

    expect(forward).toBe(3);
    expect(reversed).toBe(3);
    expect(events).toEqual(snapshot);
  });
});
