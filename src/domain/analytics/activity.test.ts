import { describe, expect, it } from "vitest";

import type { WatchActivityEvent } from "./types";

import {
  countEventsBySource,
  getActiveViewingDays,
  getEventsPerActiveDay,
  getFirstWatchedAt,
  getLastWatchedAt,
  getMostActivePeriod,
  getWatchActivityTimeline,
  summarizeWatchActivity,
} from "./activity";

/*
 * Deterministic tests for the pure watch-activity aggregations.
 *
 * Every fixture is built from LOCAL calendar components (never a UTC ISO
 * string), so these assertions describe the user's own calendar and hold in
 * every timezone. No database, clock, or network access is involved: the
 * current time is never read.
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

describe("getActiveViewingDays", () => {
  it("counts one day for a single event", () => {
    expect(getActiveViewingDays([makeEvent(localDate(2026, 6, 15))])).toBe(1);
  });

  it("counts distinct days across multiple events", () => {
    expect(
      getActiveViewingDays([
        makeEvent(localDate(2026, 6, 15, 9)),
        makeEvent(localDate(2026, 6, 15, 21)),
        makeEvent(localDate(2026, 6, 16, 10)),
        makeEvent(localDate(2026, 6, 18, 8)),
      ]),
    ).toBe(3);
  });

  it("counts events hours apart on one local day as a single active day", () => {
    expect(
      getActiveViewingDays([
        makeEvent(localDate(2026, 6, 15, 0, 1)),
        makeEvent(localDate(2026, 6, 15, 23, 59)),
      ]),
    ).toBe(1);
  });

  it("counts an event at 23:30 and one after midnight as two active days", () => {
    expect(
      getActiveViewingDays([
        makeEvent(localDate(2026, 6, 15, 23, 30)),
        makeEvent(localDate(2026, 6, 16, 0, 30)),
      ]),
    ).toBe(2);
  });

  it("keeps a late-evening event in its own local day, not the UTC day", () => {
    expect(
      getActiveViewingDays([makeEvent(localDate(2026, 6, 15, 23, 30))]),
    ).toBe(1);
  });

  it("separates days across a DST transition without merging or splitting", () => {
    // 2026-03-08 (US) and 2026-03-29 (EU) are typical spring-forward dates;
    // the fixture must hold in any timezone, DST or not.
    expect(
      getActiveViewingDays([
        makeEvent(localDate(2026, 2, 8, 0, 30)),
        makeEvent(localDate(2026, 2, 8, 23, 30)),
        makeEvent(localDate(2026, 2, 29, 1, 30)),
      ]),
    ).toBe(2);
  });

  it("returns zero for no events", () => {
    expect(getActiveViewingDays([])).toBe(0);
  });

  it("does not mutate the input array", () => {
    const events = [
      makeEvent(localDate(2026, 6, 16)),
      makeEvent(localDate(2026, 6, 15)),
    ];
    const originalOrder = [...events];

    getActiveViewingDays(events);

    expect(events).toEqual(originalOrder);
  });
});

describe("getEventsPerActiveDay", () => {
  it("returns null when there are no events", () => {
    expect(getEventsPerActiveDay([])).toBeNull();
  });

  it("returns 1 for a single event on a single day", () => {
    expect(getEventsPerActiveDay([makeEvent(localDate(2026, 6, 15))])).toBe(1);
  });

  it("returns the unrounded mean over active days", () => {
    expect(
      getEventsPerActiveDay([
        makeEvent(localDate(2026, 6, 15)),
        makeEvent(localDate(2026, 6, 15)),
        makeEvent(localDate(2026, 6, 15)),
        makeEvent(localDate(2026, 6, 16)),
      ]),
    ).toBe(2);
  });

  it("returns an unrounded fractional mean", () => {
    expect(
      getEventsPerActiveDay([
        makeEvent(localDate(2026, 6, 15)),
        makeEvent(localDate(2026, 6, 15)),
        makeEvent(localDate(2026, 6, 16)),
        makeEvent(localDate(2026, 6, 17)),
      ]),
    ).toBe(4 / 3);
  });

  it("counts an active day once regardless of events on it", () => {
    expect(
      getEventsPerActiveDay([
        makeEvent(localDate(2026, 6, 15, 1)),
        makeEvent(localDate(2026, 6, 15, 12)),
        makeEvent(localDate(2026, 6, 15, 23)),
      ]),
    ).toBe(3);
  });
});

describe("countEventsBySource", () => {
  it("returns both sources at zero for no events", () => {
    expect(countEventsBySource([])).toEqual({ manual: 0, import: 0 });
  });

  it("groups manual and import events", () => {
    expect(
      countEventsBySource([
        makeEvent(localDate(2026, 6, 15), { source: "manual" }),
        makeEvent(localDate(2026, 6, 16), { source: "import" }),
        makeEvent(localDate(2026, 6, 17), { source: "import" }),
      ]),
    ).toEqual({ manual: 1, import: 2 });
  });

  it("always reports both keys even when only one source exists", () => {
    expect(
      countEventsBySource([
        makeEvent(localDate(2026, 6, 15), { source: "import" }),
      ]),
    ).toEqual({ manual: 0, import: 1 });
  });

  it("totals the input length across both sources", () => {
    const events = Array.from({ length: 5 }, (_unused, index) =>
      makeEvent(localDate(2026, 6, 15 + (index % 2)), {
        source: index % 2 === 0 ? "manual" : "import",
      }),
    );

    const counts = countEventsBySource(events);

    expect(counts.manual + counts.import).toBe(events.length);
  });
  describe("getFirstWatchedAt", () => {
    it("returns undefined for no events", () => {
      expect(getFirstWatchedAt([])).toBeUndefined();
    });

    it("returns the single event date for one event", () => {
      expect(getFirstWatchedAt([makeEvent(localDate(2018, 2, 12))])).toEqual(
        localDate(2018, 2, 12),
      );
    });

    it("returns the earliest date regardless of input order", () => {
      const events = [
        makeEvent(localDate(2026, 6, 17)),
        makeEvent(localDate(2018, 2, 12)),
        makeEvent(localDate(2025, 5, 20)),
      ];

      expect(getFirstWatchedAt(events)).toEqual(localDate(2018, 2, 12));
      expect(getFirstWatchedAt([...events].reverse())).toEqual(
        localDate(2018, 2, 12),
      );
    });
  });

  describe("getLastWatchedAt", () => {
    it("returns undefined for no events", () => {
      expect(getLastWatchedAt([])).toBeUndefined();
    });

    it("returns the single event date for one event", () => {
      expect(getLastWatchedAt([makeEvent(localDate(2026, 6, 15))])).toEqual(
        localDate(2026, 6, 15),
      );
    });

    it("returns the latest date regardless of input order", () => {
      const events = [
        makeEvent(localDate(2026, 6, 15)),
        makeEvent(localDate(2025, 5, 20)),
        makeEvent(localDate(2026, 6, 17)),
      ];

      expect(getLastWatchedAt(events)).toEqual(localDate(2026, 6, 17));
      expect(getLastWatchedAt([...events].reverse())).toEqual(
        localDate(2026, 6, 17),
      );
    });

    it("orders by instant, not by local calendar day", () => {
      expect(
        getLastWatchedAt([
          makeEvent(localDate(2026, 6, 15, 23, 59)),
          makeEvent(localDate(2026, 6, 16, 0, 1)),
        ]),
      ).toEqual(localDate(2026, 6, 16, 0, 1));
    });
  });

  describe("getMostActivePeriod", () => {
    it("returns undefined for no events", () => {
      expect(getMostActivePeriod([], "day")).toBeUndefined();
    });

    it("returns the only period for a single event", () => {
      expect(
        getMostActivePeriod([makeEvent(localDate(2026, 6, 15))], "day"),
      ).toEqual({
        period: "day",
        periodStart: localDate(2026, 6, 15),
        periodEnd: localDate(2026, 6, 16),
        eventCount: 1,
      });
    });

    it("picks the period with the most events", () => {
      const mostActive = getMostActivePeriod(
        [
          makeEvent(localDate(2026, 6, 15, 9)),
          makeEvent(localDate(2026, 6, 15, 21)),
          makeEvent(localDate(2026, 6, 20)),
        ],
        "day",
      );

      expect(mostActive?.periodStart).toEqual(localDate(2026, 6, 15));
      expect(mostActive?.eventCount).toBe(2);
    });

    it("breaks ties toward the earliest period deterministically", () => {
      const events = [
        makeEvent(localDate(2026, 6, 17)),
        makeEvent(localDate(2026, 6, 15)),
        makeEvent(localDate(2026, 6, 16)),
      ];

      expect(getMostActivePeriod(events, "day")?.periodStart).toEqual(
        localDate(2026, 6, 15),
      );
      expect(
        getMostActivePeriod([...events].reverse(), "day")?.periodStart,
      ).toEqual(localDate(2026, 6, 15));
    });

    it("aggregates monthly buckets across a year boundary", () => {
      const mostActive = getMostActivePeriod(
        [
          makeEvent(localDate(2026, 11, 20)),
          makeEvent(localDate(2026, 11, 31)),
          makeEvent(localDate(2027, 0, 2)),
        ],
        "month",
      );

      expect(mostActive?.periodStart).toEqual(localDate(2026, 11, 1));
      expect(mostActive?.periodEnd).toEqual(localDate(2027, 0, 1));
      expect(mostActive?.eventCount).toBe(2);
    });

    it("uses ISO Monday weeks for the week granularity", () => {
      const mostActive = getMostActivePeriod(
        [
          makeEvent(localDate(2026, 6, 13)),
          makeEvent(localDate(2026, 6, 19)),
          makeEvent(localDate(2026, 6, 20)),
        ],
        "week",
      );

      expect(mostActive?.periodStart).toEqual(localDate(2026, 6, 13));
      expect(mostActive?.periodEnd).toEqual(localDate(2026, 6, 20));
      expect(mostActive?.eventCount).toBe(2);
    });
  });

  describe("getWatchActivityTimeline", () => {
    it("returns an empty timeline for no events", () => {
      expect(getWatchActivityTimeline([], "day")).toMatchObject({
        buckets: [],
        totalEventCount: 0,
      });
    });

    it("groups events into per-period counts", () => {
      const timeline = getWatchActivityTimeline(
        [
          makeEvent(localDate(2026, 6, 15, 9)),
          makeEvent(localDate(2026, 6, 15, 21)),
          makeEvent(localDate(2026, 6, 16, 10)),
        ],
        "day",
      );

      expect(timeline.buckets).toHaveLength(2);
      expect(timeline.buckets[0]?.eventCount).toBe(2);
      expect(timeline.buckets[0]?.distinctEpisodeCount).toBe(1);
      expect(timeline.totalEventCount).toBe(3);
    });

    it("counts re-watched episodes separately from distinct episodes", () => {
      const timeline = getWatchActivityTimeline(
        [
          makeEvent(localDate(2026, 6, 15), { episodeId: 1 }),
          makeEvent(localDate(2026, 6, 15), { episodeId: 1 }),
          makeEvent(localDate(2026, 6, 15), { episodeId: 2 }),
        ],
        "day",
      );

      expect(timeline.totalEventCount).toBe(3);
      expect(timeline.totalDistinctEpisodeCount).toBe(2);
    });
  });
  describe("summarizeWatchActivity", () => {
    it("returns a defined empty summary for no events", () => {
      expect(summarizeWatchActivity([], "day")).toEqual({
        period: "day",
        totalEventCount: 0,
        totalDistinctEpisodeCount: 0,
        activeDayCount: 0,
        eventsPerActiveDay: null,
        sourceEventCounts: { manual: 0, import: 0 },
      });
    });

    it("omits the optional history fields when there are no events", () => {
      const summary = summarizeWatchActivity([], "month");

      expect(summary.firstWatchedAt).toBeUndefined();
      expect(summary.lastWatchedAt).toBeUndefined();
      expect(summary.mostActivePeriod).toBeUndefined();
      expect("firstWatchedAt" in summary).toBe(false);
    });

    it("summarizes a single event", () => {
      expect(
        summarizeWatchActivity([makeEvent(localDate(2026, 6, 15))], "day"),
      ).toEqual({
        period: "day",
        totalEventCount: 1,
        totalDistinctEpisodeCount: 1,
        activeDayCount: 1,
        eventsPerActiveDay: 1,
        sourceEventCounts: { manual: 1, import: 0 },
        firstWatchedAt: localDate(2026, 6, 15),
        lastWatchedAt: localDate(2026, 6, 15),
        mostActivePeriod: {
          period: "day",
          periodStart: localDate(2026, 6, 15),
          periodEnd: localDate(2026, 6, 16),
          eventCount: 1,
        },
      });
    });

    it("aggregates totals, active days, sources, and extremes together", () => {
      const summary = summarizeWatchActivity(
        [
          makeEvent(localDate(2018, 2, 12, 18, 30), {
            episodeId: 1,
            source: "import",
          }),
          makeEvent(localDate(2026, 6, 15, 9), { episodeId: 2 }),
          makeEvent(localDate(2026, 6, 15, 21), { episodeId: 3 }),
          makeEvent(localDate(2026, 6, 16, 10), { episodeId: 2 }),
        ],
        "day",
      );

      expect(summary.period).toBe("day");
      expect(summary.totalEventCount).toBe(4);
      expect(summary.totalDistinctEpisodeCount).toBe(3);
      expect(summary.activeDayCount).toBe(3);
      expect(summary.eventsPerActiveDay).toBe(4 / 3);
      expect(summary.sourceEventCounts).toEqual({ manual: 3, import: 1 });
      expect(summary.firstWatchedAt).toEqual(localDate(2018, 2, 12, 18, 30));
      expect(summary.lastWatchedAt).toEqual(localDate(2026, 6, 16, 10));
      expect(summary.mostActivePeriod?.periodStart).toEqual(
        localDate(2026, 6, 15),
      );
      expect(summary.mostActivePeriod?.eventCount).toBe(2);
    });

    it("keeps active days independent of the chosen granularity", () => {
      const events = [
        makeEvent(localDate(2026, 6, 15)),
        makeEvent(localDate(2026, 6, 16)),
        makeEvent(localDate(2026, 6, 20)),
      ];

      // Three calendar days, but a single month (all in July 2026) and two ISO
      // weeks (the week of 07-13, then the week of 07-20).
      expect(summarizeWatchActivity(events, "day").activeDayCount).toBe(3);
      expect(summarizeWatchActivity(events, "month").activeDayCount).toBe(3);
      expect(summarizeWatchActivity(events, "month").totalEventCount).toBe(3);
      expect(
        summarizeWatchActivity(events, "month").mostActivePeriod?.eventCount,
      ).toBe(3);
      expect(
        summarizeWatchActivity(events, "week").mostActivePeriod?.periodStart,
      ).toEqual(localDate(2026, 6, 13));
      expect(
        summarizeWatchActivity(events, "week").mostActivePeriod?.eventCount,
      ).toBe(2);
    });

    it("is deterministic for permuted input order", () => {
      const events = [
        makeEvent(localDate(2026, 6, 17), { episodeId: 5 }),
        makeEvent(localDate(2026, 6, 15), { episodeId: 3 }),
        makeEvent(localDate(2026, 6, 15), { episodeId: 4 }),
        makeEvent(localDate(2026, 6, 16), { episodeId: 3 }),
      ];

      for (const period of ["day", "week", "month", "year"] as const) {
        const forward = summarizeWatchActivity(events, period);
        const reversed = summarizeWatchActivity([...events].reverse(), period);

        expect(reversed).toEqual(forward);
      }
    });

    it("is deterministic for events sharing a watched timestamp", () => {
      const sharedTimestamp = localDate(2026, 6, 15, 20);
      const events = [
        makeEvent(sharedTimestamp, { id: 3, episodeId: 1 }),
        makeEvent(sharedTimestamp, { id: 1, episodeId: 1 }),
        makeEvent(sharedTimestamp, { id: 2, episodeId: 1 }),
      ];

      expect(summarizeWatchActivity(events, "day")).toEqual(
        summarizeWatchActivity([...events].reverse(), "day"),
      );
    });

    it("reports first and last watched from history, not the most recent bucket", () => {
      const summary = summarizeWatchActivity(
        [
          makeEvent(localDate(2026, 6, 15)),
          makeEvent(localDate(2026, 6, 15)),
          makeEvent(localDate(2026, 6, 16)),
        ],
        "day",
      );

      expect(summary.firstWatchedAt).toEqual(localDate(2026, 6, 15));
      expect(summary.lastWatchedAt).toEqual(localDate(2026, 6, 16));
      expect(summary.mostActivePeriod?.periodStart).toEqual(
        localDate(2026, 6, 15),
      );
    });

    it("does not mutate the input array or its events", () => {
      const events = [
        makeEvent(localDate(2026, 6, 16)),
        makeEvent(localDate(2026, 6, 15)),
      ];
      const originalOrder = [...events];

      summarizeWatchActivity(events, "day");

      expect(events).toEqual(originalOrder);
      expect(events[0]?.watchedAt).toEqual(localDate(2026, 6, 16));
    });

    it("stays consistent with local-calendar day grouping at a DST boundary", () => {
      const summary = summarizeWatchActivity(
        [
          makeEvent(localDate(2026, 2, 8, 1, 30)),
          makeEvent(localDate(2026, 2, 8, 2, 30)),
          makeEvent(localDate(2026, 2, 29, 23, 30)),
        ],
        "day",
      );

      expect(summary.totalEventCount).toBe(3);
      expect(summary.activeDayCount).toBe(2);
      expect(summary.eventsPerActiveDay).toBe(3 / 2);
      expect(summary.mostActivePeriod?.periodStart).toEqual(
        localDate(2026, 2, 8),
      );
    });
  });
});
