import { describe, expect, it } from "vitest";

import type { WatchActivityEvent } from "./types";

import {
  enumeratePeriods,
  getLocalDayNumber,
  getPeriodEnd,
  getPeriodStart,
  groupEventsByPeriod,
  isWithinPeriod,
} from "./watchPeriods";

/*
 * Deterministic tests for the analytics date/period primitives.
 *
 * Every fixture is constructed from LOCAL calendar components (never from a
 * UTC ISO string), so these assertions describe the user's own calendar and
 * hold identically in every timezone. No database, clock, or network access
 * is involved: the current time is never read.
 */

/** Local-date fixture: `new Date(2026, monthIndex, day, hours)`. */
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

describe("getPeriodStart", () => {
  it("starts a day period at local midnight", () => {
    expect(getPeriodStart(localDate(2026, 6, 15, 23, 30), "day")).toEqual(
      localDate(2026, 6, 15),
    );
  });

  it("starts a month period on the first of the month", () => {
    expect(getPeriodStart(localDate(2026, 6, 15, 12), "month")).toEqual(
      localDate(2026, 6, 1),
    );
  });

  it("starts a year period on January 1st", () => {
    expect(getPeriodStart(localDate(2026, 6, 15), "year")).toEqual(
      localDate(2026, 0, 1),
    );
  });

  it("starts a week period on Monday for a mid-week date", () => {
    // 2026-07-15 is a Wednesday.
    expect(getPeriodStart(localDate(2026, 6, 15), "week")).toEqual(
      localDate(2026, 6, 13),
    );
  });

  it("leaves a Monday unchanged at the start of its ISO week", () => {
    expect(getPeriodStart(localDate(2026, 6, 13), "week")).toEqual(
      localDate(2026, 6, 13),
    );
  });

  it("moves a Sunday back to the preceding Monday", () => {
    // 2026-07-19 is a Sunday and belongs to the week starting 2026-07-13.
    expect(getPeriodStart(localDate(2026, 6, 19), "week")).toEqual(
      localDate(2026, 6, 13),
    );
  });

  it("places a month boundary in the week that owns its first day", () => {
    // 2026-08-01 is a Saturday, so its ISO week starts Monday 2026-07-27.
    expect(getPeriodStart(localDate(2026, 7, 1), "week")).toEqual(
      localDate(2026, 6, 27),
    );
  });

  it("normalizes across a year boundary for ISO weeks", () => {
    // 2027-01-01 is a Friday, so its ISO week starts Monday 2026-12-28,
    // which is in the previous calendar year.
    expect(getPeriodStart(localDate(2027, 0, 1), "week")).toEqual(
      localDate(2026, 11, 28),
    );
  });
});

describe("getPeriodEnd", () => {
  it("ends a day period at the next local midnight", () => {
    expect(getPeriodEnd(localDate(2026, 6, 15, 23, 30), "day")).toEqual(
      localDate(2026, 6, 16),
    );
  });

  it("ends a month period on the first of the next month", () => {
    expect(getPeriodEnd(localDate(2026, 6, 15), "month")).toEqual(
      localDate(2026, 7, 1),
    );
  });

  it("ends a December month period on January 1st of the next year", () => {
    expect(getPeriodEnd(localDate(2026, 11, 20), "month")).toEqual(
      localDate(2027, 0, 1),
    );
  });

  it("ends a February period on March 1st in a leap year", () => {
    expect(getPeriodEnd(localDate(2028, 1, 10), "month")).toEqual(
      localDate(2028, 2, 1),
    );
  });

  it("ends a year period on January 1st of the next year", () => {
    expect(getPeriodEnd(localDate(2026, 6, 15), "year")).toEqual(
      localDate(2027, 0, 1),
    );
  });

  it("ends a week period exactly seven days after its Monday start", () => {
    const start = getPeriodStart(localDate(2026, 6, 15), "week");

    expect(getPeriodEnd(localDate(2026, 6, 15), "week")).toEqual(
      localDate(2026, 6, 20),
    );
    expect(getPeriodEnd(localDate(2026, 6, 15), "week").getTime()).toBe(
      start.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
  });

  it("ends a week period seven days on across a month boundary", () => {
    // 2026-07-29 is a Wednesday, so its week starts Monday 2026-07-27 and
    // ends (exclusive) on Monday 2026-08-03.
    expect(getPeriodEnd(localDate(2026, 6, 29), "week")).toEqual(
      localDate(2026, 7, 3),
    );
  });

  it("always produces an end strictly after the start", () => {
    const sampleDates = [
      localDate(2026, 0, 1),
      localDate(2026, 1, 28),
      localDate(2028, 1, 29),
      localDate(2026, 11, 31),
      localDate(2027, 0, 1),
    ];
    const periods = ["day", "week", "month", "year"] as const;

    for (const period of periods) {
      for (const date of sampleDates) {
        expect(getPeriodEnd(date, period).getTime()).toBeGreaterThan(
          getPeriodStart(date, period).getTime(),
        );
      }
    }
  });
});

describe("isWithinPeriod", () => {
  it("includes the start boundary and excludes the end boundary", () => {
    const start = localDate(2026, 6, 15);
    const end = localDate(2026, 6, 16);

    expect(isWithinPeriod(start, start, end)).toBe(true);
    expect(isWithinPeriod(localDate(2026, 6, 15, 23, 59), start, end)).toBe(
      true,
    );
    expect(isWithinPeriod(end, start, end)).toBe(false);
  });

  it("excludes instants before the start boundary", () => {
    const start = localDate(2026, 6, 15);
    const end = localDate(2026, 6, 16);

    expect(isWithinPeriod(localDate(2026, 6, 14, 23, 59), start, end)).toBe(
      false,
    );
  });

  it("agrees with getPeriodStart and getPeriodEnd for every granularity", () => {
    const date = localDate(2026, 6, 15, 18, 45);

    for (const period of ["day", "week", "month", "year"] as const) {
      const start = getPeriodStart(date, period);
      const end = getPeriodEnd(date, period);

      expect(isWithinPeriod(date, start, end)).toBe(true);
      expect(isWithinPeriod(start, start, end)).toBe(true);
      expect(isWithinPeriod(end, start, end)).toBe(false);
    }
  });
});

describe("groupEventsByPeriod", () => {
  it("groups events by local day", () => {
    const timeline = groupEventsByPeriod(
      [
        makeEvent(localDate(2026, 6, 15, 9)),
        makeEvent(localDate(2026, 6, 15, 21)),
        makeEvent(localDate(2026, 6, 16, 10)),
      ],
      "day",
    );

    expect(timeline.period).toBe("day");
    expect(timeline.buckets).toHaveLength(2);
    expect(timeline.buckets[0]?.periodStart).toEqual(localDate(2026, 6, 15));
    expect(timeline.buckets[0]?.eventCount).toBe(2);
    expect(timeline.buckets[1]?.periodStart).toEqual(localDate(2026, 6, 16));
    expect(timeline.buckets[1]?.eventCount).toBe(1);
  });

  it("keeps a late-evening event in its own local day, not the UTC day", () => {
    const timeline = groupEventsByPeriod(
      [makeEvent(localDate(2026, 6, 15, 23, 30))],
      "day",
    );

    expect(timeline.buckets[0]?.periodStart).toEqual(localDate(2026, 6, 15));
  });

  it("groups events by month across a year boundary", () => {
    const timeline = groupEventsByPeriod(
      [
        makeEvent(localDate(2026, 11, 20)),
        makeEvent(localDate(2026, 11, 31)),
        makeEvent(localDate(2027, 0, 2)),
      ],
      "month",
    );

    expect(timeline.buckets).toHaveLength(2);
    expect(timeline.buckets[0]?.periodStart).toEqual(localDate(2026, 11, 1));
    expect(timeline.buckets[0]?.eventCount).toBe(2);
    expect(timeline.buckets[1]?.periodStart).toEqual(localDate(2027, 0, 1));
  });

  it("groups events by ISO week", () => {
    const timeline = groupEventsByPeriod(
      [
        makeEvent(localDate(2026, 6, 13)), // Monday
        makeEvent(localDate(2026, 6, 19)), // Sunday, same week
        makeEvent(localDate(2026, 6, 20)), // next Monday
      ],
      "week",
    );

    expect(timeline.buckets).toHaveLength(2);
    expect(timeline.buckets[0]?.periodStart).toEqual(localDate(2026, 6, 13));
    expect(timeline.buckets[0]?.eventCount).toBe(2);
    expect(timeline.buckets[1]?.periodStart).toEqual(localDate(2026, 6, 20));
  });

  it("groups events by year", () => {
    const timeline = groupEventsByPeriod(
      [
        makeEvent(localDate(2025, 11, 31)),
        makeEvent(localDate(2026, 0, 1)),
        makeEvent(localDate(2026, 5, 15)),
      ],
      "year",
    );

    expect(timeline.buckets).toHaveLength(2);
    expect(timeline.buckets[0]?.periodStart).toEqual(localDate(2025, 0, 1));
    expect(timeline.buckets[0]?.eventCount).toBe(1);
    expect(timeline.buckets[1]?.periodStart).toEqual(localDate(2026, 0, 1));
    expect(timeline.buckets[1]?.eventCount).toBe(2);
  });

  it("counts distinct episodes separately from total events", () => {
    const timeline = groupEventsByPeriod(
      [
        makeEvent(localDate(2026, 6, 15, 9), { episodeId: 1 }),
        makeEvent(localDate(2026, 6, 15, 12), { episodeId: 1 }),
        makeEvent(localDate(2026, 6, 15, 20), { episodeId: 2 }),
      ],
      "day",
    );

    expect(timeline.buckets[0]?.eventCount).toBe(3);
    expect(timeline.buckets[0]?.distinctEpisodeCount).toBe(2);
    expect(timeline.totalEventCount).toBe(3);
    expect(timeline.totalDistinctEpisodeCount).toBe(2);
  });

  it("returns an empty timeline for no events", () => {
    const timeline = groupEventsByPeriod([], "day");

    expect(timeline.buckets).toEqual([]);
    expect(timeline.totalEventCount).toBe(0);
    expect(timeline.totalDistinctEpisodeCount).toBe(0);
    expect(timeline.firstWatchedAt).toBeUndefined();
    expect(timeline.lastWatchedAt).toBeUndefined();
  });

  it("returns buckets ascending by period start regardless of input order", () => {
    const timeline = groupEventsByPeriod(
      [
        makeEvent(localDate(2026, 6, 17)),
        makeEvent(localDate(2026, 6, 15)),
        makeEvent(localDate(2026, 6, 16)),
      ],
      "day",
    );

    expect(
      timeline.buckets.map((bucket) => bucket.periodStart.getDate()),
    ).toEqual([15, 16, 17]);
  });

  it("reports the earliest and latest watched instants", () => {
    const timeline = groupEventsByPeriod(
      [
        makeEvent(localDate(2026, 6, 17), { episodeId: 5 }),
        makeEvent(localDate(2026, 6, 15), { episodeId: 3 }),
        makeEvent(localDate(2026, 6, 16), { episodeId: 4 }),
      ],
      "day",
    );

    expect(timeline.firstWatchedAt).toEqual(localDate(2026, 6, 15));
    expect(timeline.lastWatchedAt).toEqual(localDate(2026, 6, 17));
  });

  it("is deterministic for events sharing a watched timestamp", () => {
    const sharedTimestamp = localDate(2026, 6, 15, 20);
    const events = [
      makeEvent(sharedTimestamp, { episodeId: 3 }),
      makeEvent(sharedTimestamp, { episodeId: 1 }),
      makeEvent(sharedTimestamp, { episodeId: 2 }),
    ];

    const first = groupEventsByPeriod(events, "day");
    const second = groupEventsByPeriod([...events].reverse(), "day");

    expect(first.buckets).toEqual(second.buckets);
    expect(first.buckets[0]?.eventCount).toBe(3);
    expect(first.buckets[0]?.distinctEpisodeCount).toBe(3);
  });

  it("does not mutate the input array or its events", () => {
    const events = [
      makeEvent(localDate(2026, 6, 16)),
      makeEvent(localDate(2026, 6, 15)),
    ];
    const originalOrder = [...events];

    groupEventsByPeriod(events, "day");

    expect(events).toEqual(originalOrder);
    expect(events[0]?.watchedAt).toEqual(localDate(2026, 6, 16));
  });

  it("produces contiguous, non-overlapping bucket boundaries", () => {
    const timeline = groupEventsByPeriod(
      [
        makeEvent(localDate(2026, 6, 15)),
        makeEvent(localDate(2026, 6, 16)),
        makeEvent(localDate(2026, 6, 17)),
      ],
      "day",
    );

    for (let index = 0; index < timeline.buckets.length - 1; index += 1) {
      const current = timeline.buckets[index];
      const next = timeline.buckets[index + 1];

      expect(current?.periodEnd.getTime()).toBe(next?.periodStart.getTime());
    }
  });
});

describe("enumeratePeriods", () => {
  it("enumerates every day in a range including both endpoints", () => {
    const periods = enumeratePeriods(
      localDate(2026, 6, 15),
      localDate(2026, 6, 18),
      "day",
    );

    expect(periods).toHaveLength(3);
    expect(periods.map((period) => period.periodStart.getDate())).toEqual([
      15, 16, 17,
    ]);
    expect(periods.at(-1)?.periodEnd).toEqual(localDate(2026, 6, 18));
  });

  it("starts from the period containing the range start", () => {
    const periods = enumeratePeriods(
      localDate(2026, 6, 17, 23), // Wednesday
      localDate(2026, 6, 20),
      "day",
    );

    expect(periods).toHaveLength(3);
    expect(periods[0]?.periodStart).toEqual(localDate(2026, 6, 17));
  });

  it("returns empty buckets with zero counts", () => {
    const periods = enumeratePeriods(
      localDate(2026, 6, 15),
      localDate(2026, 6, 16),
      "day",
    );

    expect(periods).toHaveLength(1);
    expect(periods[0]).toMatchObject({
      period: "day",
      eventCount: 0,
      distinctEpisodeCount: 0,
    });
  });

  it("enumerates months across a year boundary", () => {
    // 2026-11-05 through 2027-02-10 spans four whole months: Nov, Dec, Jan,
    // Feb (each month period starts before `to`, so Feb is included).
    const periods = enumeratePeriods(
      localDate(2026, 10, 5),
      localDate(2027, 1, 10),
      "month",
    );

    expect(periods).toHaveLength(4);
    expect(periods.map((period) => period.periodStart.getMonth())).toEqual([
      10, 11, 0, 1,
    ]);
    expect(periods.at(-1)?.periodEnd).toEqual(localDate(2027, 2, 1));
  });

  it("enumerates contiguous ISO weeks", () => {
    const periods = enumeratePeriods(
      localDate(2026, 6, 13),
      localDate(2026, 6, 27),
      "week",
    );

    expect(periods).toHaveLength(2);
    expect(periods[0]?.periodEnd).toEqual(periods[1]?.periodStart);
  });

  it("enumerates a single year period", () => {
    const periods = enumeratePeriods(
      localDate(2026, 0, 1),
      localDate(2026, 11, 31),
      "year",
    );

    expect(periods).toHaveLength(1);
    expect(periods[0]?.periodStart).toEqual(localDate(2026, 0, 1));
    expect(periods[0]?.periodEnd).toEqual(localDate(2027, 0, 1));
  });

  it("returns no buckets for an empty or inverted range", () => {
    expect(
      enumeratePeriods(localDate(2026, 6, 15), localDate(2026, 6, 15), "day"),
    ).toEqual([]);
    expect(
      enumeratePeriods(localDate(2026, 6, 15), localDate(2026, 6, 14), "day"),
    ).toEqual([]);
  });
});

describe("getLocalDayNumber", () => {
  it("numbers the Unix epoch day as 0", () => {
    expect(getLocalDayNumber(localDate(1970, 0, 1))).toBe(0);
  });

  it("advances by one per calendar day across month and leap boundaries", () => {
    expect(getLocalDayNumber(localDate(2026, 0, 1))).toBe(
      getLocalDayNumber(localDate(2025, 11, 31)) + 1,
    );
    expect(getLocalDayNumber(localDate(2028, 2, 1))).toBe(
      getLocalDayNumber(localDate(2028, 1, 29)) + 1,
    );
  });

  it("returns the same day number for every instant within a local day", () => {
    const morning = getLocalDayNumber(localDate(2026, 6, 15, 0, 1));
    const evening = getLocalDayNumber(localDate(2026, 6, 15, 23, 59));

    expect(morning).toBe(evening);
  });

  it("agrees with elapsed calendar days", () => {
    const start = getLocalDayNumber(localDate(2026, 6, 15));
    const end = getLocalDayNumber(localDate(2026, 6, 22));

    expect(end - start).toBe(7);
  });
});
