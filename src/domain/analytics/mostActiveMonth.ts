/**
 * Pure most-active-month analytics derived from recorded watch history.
 *
 * This module answers "which calendar month was most active?" within the
 * trailing 12-month Statistics period. It ranks months by recorded watch
 * event count using the event's local calendar month.
 *
 * On a tie, the result is deterministic: `isTie` is true and the label is
 * "Multiple months" rather than inventing a secondary business rule.
 *
 * Every function here is a total, deterministic derivation over in-memory
 * event data:
 *
 * - No IndexedDB access, no repository imports, no React, no network, no writes.
 * - The trailing 12-month window is anchored to the supplied `now`, matching
 *   the existing `buildTrailingYearDayActivity` window semantics.
 * - Input arrays are never mutated.
 * - Empty input (or no events in the window) yields `isAvailable: false`.
 */

import type { WatchActivityEvent } from "./types";
import {
  getPeriodEnd,
  getPeriodStart,
  isWithinPeriod,
} from "./watchPeriods";

/** The result of computing the most active calendar month. */
export interface MostActiveMonthResult {
  readonly label: string;
  readonly eventCount: number;
  readonly isTie: boolean;
  readonly isAvailable: boolean;
}

/**
 * Builds the most-active-month result for the trailing 12 months ending on
 * the month that contains `now`.
 *
 * Months are ranked by recorded watch-event count. On a tie, `isTie` is true
 * and the label is "Multiple months". When there are no events in the window,
 * `isAvailable` is false and the label is "No activity".
 */
export function buildMostActiveMonth(
  events: readonly WatchActivityEvent[],
  now: Date,
): MostActiveMonthResult {
  const windowEnd = getPeriodEnd(now, "month");
  const windowEndMonthStart = getPeriodStart(windowEnd, "month");
  const windowStart = getPeriodStart(
    new Date(
      windowEndMonthStart.getFullYear() - 1,
      windowEndMonthStart.getMonth(),
      1,
    ),
    "day",
  );

  const monthlyCounts = new Map<
    number,
    { periodStart: Date; eventCount: number }
  >();

  for (const event of events) {
    if (!isWithinPeriod(event.watchedAt, windowStart, windowEnd)) continue;

    const monthStart = new Date(
      event.watchedAt.getFullYear(),
      event.watchedAt.getMonth(),
      1,
    );
    const monthKey = monthStart.getFullYear() * 12 + monthStart.getMonth();

    const existing = monthlyCounts.get(monthKey);
    if (existing) {
      existing.eventCount += 1;
    } else {
      monthlyCounts.set(monthKey, { periodStart: monthStart, eventCount: 1 });
    }
  }

  const buckets = [...monthlyCounts.values()];
  if (buckets.length === 0) {
    return { label: "No activity", eventCount: 0, isTie: false, isAvailable: false };
  }

  const maxCount = Math.max(...buckets.map((bucket) => bucket.eventCount));
  const mostActive = buckets.filter((bucket) => bucket.eventCount === maxCount);
  const isTie = mostActive.length > 1;

  const label = isTie
    ? "Multiple months"
    : mostActive[0].periodStart.toLocaleString(undefined, {
        month: "short",
        year: "numeric",
      });

  return { label, eventCount: maxCount, isTie, isAvailable: true };
}