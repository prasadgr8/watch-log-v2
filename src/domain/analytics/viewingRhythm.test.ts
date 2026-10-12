import { describe, expect, it } from "vitest";

import type { WatchActivityEvent } from "./types";

import {
  bucketEventsByDayOfWeek,
  bucketEventsByHourOfDay,
} from "./viewingRhythm";

/*
 * Deterministic tests for the viewing-rhythm analytics (hour-of-day and
 * day-of-week bucketing).
 *
 * Every fixture is built from LOCAL calendar components (never a UTC ISO
 * string), so these assertions describe the user own calendar and hold in
 * every timezone. No database, clock, or network access is involved.
 *
 * The reference week is Mon 2026-06-15 .. Sun 2026-06-21, which is exactly ISO
 * weekdays 1..7, so the weekday assertions are fixed regardless of timezone.
 * Both functions return a gap-free, ascending, fixed-length axis, so the tests
 * assert the whole structure rather than only the populated buckets.
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

function makeEvent(watchedAt: Date): WatchActivityEvent {
  return { episodeId: 1, watchedAt, source: "manual" };
}

describe("bucketEventsByHourOfDay", () => {
  it("returns 24 zero buckets for an empty history", () => {
    const buckets = bucketEventsByHourOfDay([]);

    expect(buckets).toHaveLength(24);
    expect(buckets.every((bucket) => bucket.eventCount === 0)).toBe(true);
    expect(buckets.map((bucket) => bucket.hour)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
      20, 21, 22, 23,
    ]);
  });

  it("counts events into their representative local hours", () => {
    const events = [
      makeEvent(localDate(2026, 5, 15, 9)),
      makeEvent(localDate(2026, 5, 15, 14)),
      makeEvent(localDate(2026, 5, 15, 14)),
      makeEvent(localDate(2026, 5, 15, 21)),
    ];

    const buckets = bucketEventsByHourOfDay(events);

    expect(buckets[9].eventCount).toBe(1);
    expect(buckets[14].eventCount).toBe(2);
    expect(buckets[21].eventCount).toBe(1);
  });

  it("handles the boundary hours 0 and 23", () => {
    const events = [
      makeEvent(localDate(2026, 5, 15, 0)),
      makeEvent(localDate(2026, 5, 15, 23)),
      makeEvent(localDate(2026, 5, 16, 0)),
    ];

    const buckets = bucketEventsByHourOfDay(events);

    expect(buckets[0].eventCount).toBe(2);
    expect(buckets[23].eventCount).toBe(1);
  });

  it("buckets mixed TV and movie events identically by instant", () => {
    // mediaType is irrelevant to hour bucketing; only watchedAt matters.
    const tv: WatchActivityEvent = {
      mediaId: 100,
      mediaType: "tv",
      episodeId: 1,
      watchedAt: localDate(2026, 5, 15, 20),
      source: "manual",
    };
    const movie: WatchActivityEvent = {
      mediaId: 200,
      mediaType: "movie",
      episodeId: null,
      watchedAt: localDate(2026, 5, 15, 20),
      source: "manual",
    };

    const buckets = bucketEventsByHourOfDay([tv, movie]);

    expect(buckets[20].eventCount).toBe(2);
  });

  it("is deterministic and order-independent and never mutates", () => {
    const events = [
      makeEvent(localDate(2026, 5, 15, 7)),
      makeEvent(localDate(2026, 5, 16, 7)),
      makeEvent(localDate(2026, 5, 17, 19)),
    ];
    const snapshot = structuredClone(events);

    const forward = bucketEventsByHourOfDay(events);
    const reversed = bucketEventsByHourOfDay([...events].reverse());

    expect(reversed).toEqual(forward);
    expect(events).toEqual(snapshot);
  });
});

describe("bucketEventsByDayOfWeek", () => {
  it("returns 7 zero buckets (Mon..Sun) for an empty history", () => {
    const buckets = bucketEventsByDayOfWeek([]);

    expect(buckets).toHaveLength(7);
    expect(buckets.every((bucket) => bucket.eventCount === 0)).toBe(true);
    expect(buckets.map((bucket) => bucket.isoWeekday)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("counts one event per representative weekday across a Mon..Sun week", () => {
    // 2026-06-15 is Monday (ISO 1) .. 2026-06-21 is Sunday (ISO 7).
    const events = [
      makeEvent(localDate(2026, 5, 15)), // Monday
      makeEvent(localDate(2026, 5, 16)), // Tuesday
      makeEvent(localDate(2026, 5, 17)), // Wednesday
      makeEvent(localDate(2026, 5, 18)), // Thursday
      makeEvent(localDate(2026, 5, 19)), // Friday
      makeEvent(localDate(2026, 5, 20)), // Saturday
      makeEvent(localDate(2026, 5, 21)), // Sunday
    ];

    const buckets = bucketEventsByDayOfWeek(events);

    expect(buckets.map((bucket) => bucket.eventCount)).toEqual([
      1, 1, 1, 1, 1, 1, 1,
    ]);
  });

  it("accumulates multiple events on the same weekday", () => {
    // Two Mondays and one Wednesday.
    const events = [
      makeEvent(localDate(2026, 5, 15)), // Monday
      makeEvent(localDate(2026, 5, 22)), // next Monday
      makeEvent(localDate(2026, 5, 17)), // Wednesday
    ];

    const buckets = bucketEventsByDayOfWeek(events);

    expect(buckets[0].eventCount).toBe(2); // Monday
    expect(buckets[2].eventCount).toBe(1); // Wednesday
  });

  it("buckets mixed TV and movie events identically by local day", () => {
    const tv: WatchActivityEvent = {
      mediaId: 100,
      mediaType: "tv",
      episodeId: 1,
      watchedAt: localDate(2026, 5, 20, 10), // Saturday
      source: "manual",
    };
    const movie: WatchActivityEvent = {
      mediaId: 200,
      mediaType: "movie",
      episodeId: null,
      watchedAt: localDate(2026, 5, 20, 22), // Saturday
      source: "manual",
    };

    const buckets = bucketEventsByDayOfWeek([tv, movie]);

    expect(buckets[5].eventCount).toBe(2); // Saturday = ISO 6 -> index 5
  });

  it("keeps a late-evening event in its own local day, not the next UTC day", () => {
    // 23:30 Sunday stays Sunday locally even where UTC would roll to Monday.
    const events = [makeEvent(localDate(2026, 5, 21, 23, 30))]; // Sunday 23:30

    const buckets = bucketEventsByDayOfWeek(events);

    expect(buckets[6].eventCount).toBe(1); // Sunday = ISO 7 -> index 6
  });

  it("is deterministic and order-independent and never mutates", () => {
    const events = [
      makeEvent(localDate(2026, 5, 15)), // Monday
      makeEvent(localDate(2026, 5, 20)), // Saturday
      makeEvent(localDate(2026, 5, 20)), // Saturday
    ];
    const snapshot = structuredClone(events);

    const forward = bucketEventsByDayOfWeek(events);
    const reversed = bucketEventsByDayOfWeek([...events].reverse());

    expect(reversed).toEqual(forward);
    expect(events).toEqual(snapshot);
  });
});