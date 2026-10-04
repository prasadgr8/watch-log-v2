import { describe, expect, it } from "vitest";

import type { WatchActivityEvent } from "./types";

import { buildWatchActivityTrends } from "./trends";

/*
 * Deterministic tests for the pure recorded-activity trend derivations.
 *
 * Every fixture is built from LOCAL calendar components (never a UTC ISO
 * string), so these assertions describe the user's own calendar and hold in
 * every timezone. No database, clock, or network access is involved: the current
 * time is never read.
 *
 * These trends describe RECORDED activity only. Nothing here asserts lifetime
 * viewing, complete history, or watching continuity, because `WatchHistory`
 * supports no such claim.
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

/**
 * Builds `count` events inside each supplied month (month index 0 = January),
 * so a window's per-period recorded activity is easy to control.
 */
function eventsInMonths(
  countsByMonthIndex: readonly number[],
  year = 2026,
): WatchActivityEvent[] {
  const events: WatchActivityEvent[] = [];
  let episodeId = 0;

  countsByMonthIndex.forEach((count, monthIndex) => {
    for (let occurrence = 0; occurrence < count; occurrence += 1) {
      episodeId += 1;
      events.push(
        makeEvent(localDate(year, monthIndex, 1 + occurrence), { episodeId }),
      );
    }
  });

  return events;
}

/** One event per day for `dayCount` days starting at the given local date. */
function dailyEvents(dayCount: number, startDay = 1): WatchActivityEvent[] {
  const events: WatchActivityEvent[] = [];

  for (let day = 0; day < dayCount; day += 1) {
    events.push(
      makeEvent(new Date(2026, 0, startDay + day, 12, 0), {
        episodeId: day + 1,
      }),
    );
  }

  return events;
}
describe("buildWatchActivityTrends period-over-period change", () => {
  it("reports no predecessor for an empty history", () => {
    expect(buildWatchActivityTrends([], "month").periodOverPeriod).toEqual({
      hasPredecessor: false,
      previousEventCount: null,
      currentEventCount: 0,
      absoluteChange: null,
      percentageChange: null,
    });
  });

  it("reports no predecessor when a single period is in the window", () => {
    const change = buildWatchActivityTrends(
      eventsInMonths([3]),
      "month",
    ).periodOverPeriod;

    expect(change.hasPredecessor).toBe(false);
    expect(change.previousEventCount).toBeNull();
    expect(change.absoluteChange).toBeNull();
    expect(change.percentageChange).toBeNull();
    expect(change.currentEventCount).toBe(3);
  });

  it("compares the final two periods for an increase", () => {
    expect(
      buildWatchActivityTrends(eventsInMonths([2, 5]), "month")
        .periodOverPeriod,
    ).toEqual({
      hasPredecessor: true,
      previousEventCount: 2,
      currentEventCount: 5,
      absoluteChange: 3,
      percentageChange: 1.5,
    });
  });

  it("compares the final two periods for a decrease", () => {
    const change = buildWatchActivityTrends(
      eventsInMonths([5, 2]),
      "month",
    ).periodOverPeriod;

    expect(change.previousEventCount).toBe(5);
    expect(change.currentEventCount).toBe(2);
    expect(change.absoluteChange).toBe(-3);
    expect(change.percentageChange).toBeCloseTo(-0.6, 10);
  });

  it("closes the window at the last recorded event, never on an empty period", () => {
    // The natural window runs from the first recorded event's period through the
    // last recorded event's period, so BOTH endpoints hold at least one event.
    // A trailing empty period is therefore never part of the window and can
    // never become `currentEventCount`.
    const trends = buildWatchActivityTrends(eventsInMonths([4, 0]), "month");

    expect(trends.totalPeriodCount).toBe(1);
    expect(trends.periodOverPeriod.hasPredecessor).toBe(false);
    expect(trends.periodOverPeriod.currentEventCount).toBe(4);
  });

  it("leaves the percentage undefined when the previous period recorded nothing", () => {
    // January and March are active; February is an interior gap that becomes the
    // predecessor of the final (March) period.
    const change = buildWatchActivityTrends(
      eventsInMonths([2, 0, 3]),
      "month",
    ).periodOverPeriod;

    expect(change.hasPredecessor).toBe(true);
    expect(change.previousEventCount).toBe(0);
    expect(change.currentEventCount).toBe(3);
    expect(change.absoluteChange).toBe(3);
    expect(change.percentageChange).toBeNull();
  });

  it("cannot compare two empty periods, since the window always has active endpoints", () => {
    // Both endpoints of the natural window hold recorded events, so no fixture
    // can produce two consecutive empty periods as the final pair.
    const change = buildWatchActivityTrends(
      eventsInMonths([2, 0, 0, 0]),
      "month",
    ).periodOverPeriod;

    expect(change.hasPredecessor).toBe(false);
    expect(change.currentEventCount).toBeGreaterThan(0);
  });

  it("returns exact unrounded ratios rather than display rounding", () => {
    const change = buildWatchActivityTrends(
      eventsInMonths([3, 2]),
      "month",
    ).periodOverPeriod;

    expect(change.absoluteChange).toBe(-1);
    expect(change.percentageChange).toBe(-1 / 3);

    const doubling = buildWatchActivityTrends(
      eventsInMonths([2, 4]),
      "month",
    ).periodOverPeriod;

    expect(doubling.percentageChange).toBe(1);
  });

  it("never produces NaN or Infinity for any predecessor case", () => {
    const cases = [
      [1, 1],
      [1, 5],
      [5, 1],
      [4, 0],
      [0, 4],
      [0, 0, 3, 0],
      [3, 3, 3],
    ];

    for (const counts of cases) {
      const change = buildWatchActivityTrends(
        eventsInMonths(counts),
        "month",
      ).periodOverPeriod;

      if (change.percentageChange !== null) {
        expect(Number.isNaN(change.percentageChange)).toBe(false);
        expect(Number.isFinite(change.percentageChange)).toBe(true);
      }

      expect(Number.isFinite(change.currentEventCount)).toBe(true);
    }
  });
});

describe("buildWatchActivityTrends active and inactive distribution", () => {
  it("reports an empty distribution and fabricates no period for empty history", () => {
    const trends = buildWatchActivityTrends([], "day");

    expect(trends.period).toBe("day");
    expect(trends.totalPeriodCount).toBe(0);
    expect(trends.activePeriodCount).toBe(0);
    expect(trends.inactivePeriodCount).toBe(0);
  });

  it("counts every period as active when each holds recorded activity", () => {
    const trends = buildWatchActivityTrends(
      eventsInMonths([1, 2, 1]),
      "month",
    );

    expect(trends.totalPeriodCount).toBe(3);
    expect(trends.activePeriodCount).toBe(3);
    expect(trends.inactivePeriodCount).toBe(0);
  });

  it("counts interior inactive periods inside a multi-period window", () => {
    // January and April are active; February and March hold none.
    const trends = buildWatchActivityTrends(
      eventsInMonths([1, 0, 0, 1]),
      "month",
    );

    expect(trends.totalPeriodCount).toBe(4);
    expect(trends.activePeriodCount).toBe(2);
    expect(trends.inactivePeriodCount).toBe(2);
  });

  it("opens the window at the first recorded event, adding no leading period", () => {
    // February holds the only events, so January is never part of the window.
    const trends = buildWatchActivityTrends(
      eventsInMonths([0, 2]),
      "month",
    );

    expect(trends.totalPeriodCount).toBe(1);
    expect(trends.activePeriodCount).toBe(1);
    expect(trends.inactivePeriodCount).toBe(0);
  });

  it("closes the window at the last recorded event, adding no trailing period", () => {
    // February and March hold events; the window ends at March, not later.
    const trends = buildWatchActivityTrends(
      eventsInMonths([0, 2, 3]),
      "month",
    );

    expect(trends.totalPeriodCount).toBe(2);
    expect(trends.activePeriodCount).toBe(2);
    expect(trends.inactivePeriodCount).toBe(0);
  });

  it("counts mixed active and inactive periods on a gap-free axis", () => {
    const trends = buildWatchActivityTrends(
      eventsInMonths([2, 0, 1]),
      "month",
    );

    expect(trends.totalPeriodCount).toBe(3);
    expect(trends.activePeriodCount).toBe(2);
    expect(trends.inactivePeriodCount).toBe(1);
  });

  it("keeps active and inactive counts summing to the total in every case", () => {
    const cases = [[1], [1, 1], [3, 0, 0, 0], [0, 0, 4], [2, 0, 2]];

    for (const counts of cases) {
      const trends = buildWatchActivityTrends(
        eventsInMonths(counts),
        "month",
      );

      expect(trends.activePeriodCount + trends.inactivePeriodCount).toBe(
        trends.totalPeriodCount,
      );
    }
  });
});

describe("buildWatchActivityTrends consecutive periods with recorded activity", () => {
  it("reports zero runs for empty history", () => {
    const trends = buildWatchActivityTrends([], "month");

    expect(trends.longestConsecutiveActivePeriods).toBe(0);
    expect(trends.latestConsecutiveActivePeriods).toBe(0);
  });

  it("reports a run of one for a single active period", () => {
    const trends = buildWatchActivityTrends(eventsInMonths([1]), "month");

    expect(trends.longestConsecutiveActivePeriods).toBe(1);
    expect(trends.latestConsecutiveActivePeriods).toBe(1);
  });

  it("counts a fully active window as one continuous run", () => {
    const trends = buildWatchActivityTrends(
      eventsInMonths([1, 1, 1, 1]),
      "month",
    );

    expect(trends.totalPeriodCount).toBe(4);
    expect(trends.longestConsecutiveActivePeriods).toBe(4);
    expect(trends.latestConsecutiveActivePeriods).toBe(4);
  });

  it("always ends the latest run at the final recorded period", () => {
    // The window ends at the last recorded event, so the final period is active
    // and the latest run is always at least one.
    const trends = buildWatchActivityTrends(
      [makeEvent(localDate(2026, 0, 5))],
      "month",
    );

    expect(trends.totalPeriodCount).toBe(1);
    expect(trends.latestConsecutiveActivePeriods).toBe(1);
    expect(trends.longestConsecutiveActivePeriods).toBe(1);
  });

  it("breaks a run across a single internal gap", () => {
    const trends = buildWatchActivityTrends(
      eventsInMonths([1, 1, 0, 1]),
      "month",
    );

    expect(trends.longestConsecutiveActivePeriods).toBe(2);
    expect(trends.latestConsecutiveActivePeriods).toBe(1);
  });

  it("breaks runs across multiple gaps", () => {
    const trends = buildWatchActivityTrends(
      eventsInMonths([1, 0, 1, 0, 1, 1]),
      "month",
    );

    expect(trends.longestConsecutiveActivePeriods).toBe(2);
    expect(trends.latestConsecutiveActivePeriods).toBe(2);
  });

  it("restarts the latest run after a trailing interior gap", () => {
    // February is a gap, so the run restarts at March.
    const trends = buildWatchActivityTrends(
      eventsInMonths([1, 1, 0, 1, 1]),
      "month",
    );

    expect(trends.longestConsecutiveActivePeriods).toBe(2);
    expect(trends.latestConsecutiveActivePeriods).toBe(2);
  });

  it("distinguishes the longest run from the latest run", () => {
    const trends = buildWatchActivityTrends(
      eventsInMonths([1, 1, 1, 0, 1, 1]),
      "month",
    );

    expect(trends.longestConsecutiveActivePeriods).toBe(3);
    expect(trends.latestConsecutiveActivePeriods).toBe(2);
  });

  it("measures day granularity runs across a gap-free daily window", () => {
    const events = [
      makeEvent(localDate(2026, 0, 1), { episodeId: 1 }),
      makeEvent(localDate(2026, 0, 2), { episodeId: 2 }),
      makeEvent(localDate(2026, 0, 3), { episodeId: 3 }),
      makeEvent(localDate(2026, 0, 6), { episodeId: 4 }),
    ];
    const trends = buildWatchActivityTrends(events, "day");

    expect(trends.totalPeriodCount).toBe(6);
    expect(trends.activePeriodCount).toBe(4);
    expect(trends.inactivePeriodCount).toBe(2);
    expect(trends.longestConsecutiveActivePeriods).toBe(3);
    expect(trends.latestConsecutiveActivePeriods).toBe(1);
  });
});

describe("buildWatchActivityTrends determinism and input safety", () => {
  it("never mutates the supplied event array", () => {
    const events = eventsInMonths([2, 0, 3]);
    const snapshot = structuredClone(events);

    buildWatchActivityTrends(events, "month");

    expect(events).toEqual(snapshot);
  });

  it("returns identical output when invoked repeatedly", () => {
    const events = eventsInMonths([1, 0, 2, 2]);

    expect(buildWatchActivityTrends(events, "month")).toEqual(
      buildWatchActivityTrends(events, "month"),
    );
  });

  it("is independent of the order events are supplied in", () => {
    const events = eventsInMonths([2, 0, 3, 1]);

    expect(buildWatchActivityTrends([...events].reverse(), "month")).toEqual(
      buildWatchActivityTrends(events, "month"),
    );
  });
});

describe("buildWatchActivityTrends window boundaries", () => {
  it("covers the full natural window rather than inheriting the timeline cap", () => {
    // 150 daily periods span well beyond the timeline projection's 120-bucket
    // presentation cap, which would retain only the most recent 120.
    const trends = buildWatchActivityTrends(dailyEvents(150), "day");

    expect(trends.totalPeriodCount).toBe(150);
    expect(trends.activePeriodCount).toBe(150);
    expect(trends.inactivePeriodCount).toBe(0);
    expect(trends.longestConsecutiveActivePeriods).toBe(150);
    expect(trends.latestConsecutiveActivePeriods).toBe(150);
  });

  it("keeps runs longer than the timeline cap intact", () => {
    const trends = buildWatchActivityTrends(dailyEvents(130), "day");

    expect(trends.longestConsecutiveActivePeriods).toBe(130);
    expect(trends.activePeriodCount).toBe(130);
  });
});
