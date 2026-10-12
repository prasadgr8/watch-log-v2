/**
 * Pure trailing-12-month calendar-day activity derived from watch history.
 *
 * This module answers "how did recorded activity distribute across the last
 * twelve calendar months?" as a gap-free, per-day series suitable for a
 * contribution-style calendar heatmap. It is a thin, deterministic composition
 * over the EXISTING approved primitives -- it introduces no new period math,
 * no threshold, and no activity scoring of its own:
 *
 * - The window bounds come from `getPeriodStart` / `getPeriodEnd`
 *   (`watchPeriods`), so calendar alignment, local-calendar semantics, ISO
 *   Monday weeks, and DST safety stay owned by exactly one module.
 * - The gap-free daily axis is `enumeratePeriods(..., "day")`.
 * - Per-day counts are `groupEventsByPeriod(..., "day")`.
 *
 * These are the same building blocks `buildWatchActivityTimeline` composes;
 * this module only fixes the window to a trailing twelve months and returns a
 * day-granular series, which that capped (120-bucket) timeline deliberately
 * does not. No analytics semantics are redefined here.
 *
 * THE WINDOW IS "LAST 12 MONTHS", ANCHORED TO `now`
 * The trailing twelve months END on the calendar month that contains the
 * supplied `now`, so the window matches the "Last 12 months" period a viewer
 * sees -- NOT the twelve months ending at the most recent watch event. For
 * example, with `now` in October 2026 the window covers November 2025 through
 * October 2026 regardless of when the last event was recorded.
 *
 * `now` is a REQUIRED parameter rather than a hidden clock read, which keeps
 * this function pure and deterministic (the same `now` + events always yields
 * the same series) and fully testable. Reading the current instant is the
 * caller's responsibility -- `statisticsService` passes `new Date()`, exactly
 * as the repository/service layer reads the clock elsewhere. The window is
 * defined by `now` alone, so it is always a full twelve months even when the
 * history is empty or has no events inside it (those days are simply zero).
 *
 * Pure and storage-free: no IndexedDB, no repository, no React, no network, no
 * internal clock read, and the input array is never mutated.
 */

import type { WatchActivityEvent } from "./types";
import {
  enumeratePeriods,
  getPeriodEnd,
  getPeriodStart,
  groupEventsByPeriod,
} from "./watchPeriods";

/** One calendar day in the trailing-year series. */
export interface CalendarDayActivity {
  /** Inclusive local-calendar start of the day. */
  readonly periodStart: Date;
  /** Recorded watch events on that local day; zero for gap-filled days. */
  readonly eventCount: number;
}

/**
 * A gap-free, ascending trailing-twelve-month daily activity series.
 *
 * `days` contains EVERY local calendar day in `[windowStart, windowEnd)`,
 * zero-filled where no events were recorded, so a caller can render a stable
 * calendar axis. `windowStart`/`windowEnd` are the inclusive/exclusive local
 * calendar bounds of the trailing twelve months ending on the month of `now`.
 */
export interface TrailingYearActivity {
  readonly windowStart: Date;
  readonly windowEnd: Date;
  readonly days: readonly CalendarDayActivity[];
}

/**
 * Builds the trailing-twelve-month, gap-free daily activity series.
 *
 * The window is the twelve calendar months ENDING on the month that contains
 * `now`: `windowEnd` is the exclusive end of that month, and `windowStart` is
 * the inclusive start of the same month one calendar year earlier. Both bounds
 * are derived with the existing `getPeriodEnd` / `getPeriodStart` ("month",
 * then "day") helpers, so alignment is calendar-correct and DST-safe, and the
 * window is a full twelve months even when no events fall inside it.
 *
 * Day counts are overlaid from `groupEventsByPeriod(..., "day")`, and the axis
 * is the gap-free `enumeratePeriods(..., "day")` -- identical composition to
 * `buildWatchActivityTimeline`, minus that projection's 120-bucket cap.
 *
 * Leap years are handled by the calendar arithmetic: the month-start minus one
 * year is normalized through `getPeriodStart(..., "day")`, so a February 29
 * reference lands on a valid local date.
 */
export function buildTrailingYearDayActivity(
  events: readonly WatchActivityEvent[],
  now: Date,
): TrailingYearActivity {
  // Exclusive end of the month containing `now`.
  const windowEnd = getPeriodEnd(now, "month");
  // Same month-start one calendar year earlier -> exactly twelve months back.
  const windowEndMonthStart = getPeriodStart(windowEnd, "month");
  const windowStart = getPeriodStart(
    new Date(
      windowEndMonthStart.getFullYear() - 1,
      windowEndMonthStart.getMonth(),
      1,
    ),
    "day",
  );

  const countsByDayStart = new Map<number, number>();
  for (const bucket of groupEventsByPeriod(events, "day").buckets) {
    countsByDayStart.set(bucket.periodStart.getTime(), bucket.eventCount);
  }

  const days = enumeratePeriods(windowStart, windowEnd, "day").map(
    (axisBucket): CalendarDayActivity => ({
      periodStart: axisBucket.periodStart,
      eventCount: countsByDayStart.get(axisBucket.periodStart.getTime()) ?? 0,
    }),
  );

  return { windowStart, windowEnd, days };
}
