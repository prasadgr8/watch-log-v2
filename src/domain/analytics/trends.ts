/**
 * Pure recorded-activity trend analytics derived from `WatchActivityEvent` values.
 *
 * This is the A28 counterpart to `activity.ts`: where that module answers
 * "what was recorded, and when?", this one answers "how does recorded activity
 * compare across periods?". Both read the SAME storage-independent event shape,
 * so a caller can derive both halves of a section from one repository read.
 *
 * Every function here is a total, deterministic derivation over in-memory event
 * data:
 *
 * - No IndexedDB access, no repository imports, no React, no network, no writes.
 * - No clock. Nothing reads "now", so a given input always produces the same
 *   output and results stay safe to compute once and compare later.
 * - Calendar semantics are delegated to `watchPeriods` (`getPeriodStart` /
 *   `getPeriodEnd`), so local-calendar boundaries, ISO-8601 Monday weeks, and DST
 *   safety stay owned by exactly one module.
 * - Input arrays are never mutated, and no event is sorted: the metrics depend
 *   only on per-period counts, so they are order-independent by construction.
 *
 * SCOPE OF THE WORDING
 *
 * These values describe RECORDED activity only. `WatchHistory` is not an
 * immutable or complete viewing ledger: unwatching deletes history rows, a manual
 * re-watch does not create another event, TV Time import can collapse duplicate
 * or re-watch activity, and the store is episode-based so movies are absent.
 * Accordingly nothing here is named as a streak, a lifetime, or a complete
 * history — a "run" only ever means consecutive periods that CONTAIN RECORDED
 * ACTIVITY, which is exactly what the numbers describe.
 *
 * RELATIONSHIP TO THE TIMELINE PROJECTION
 *
 * `buildWatchActivityTimeline` caps its bucket axis at
 * `WATCH_ACTIVITY_TIMELINE_MAX_BUCKETS` for presentation. Trends deliberately do
 * NOT inherit that cap: it is a display bound, and applying it here would
 * silently understate history (a run longer than the cap would be truncated).
 * This module therefore walks the full natural window, from the first recorded
 * event's period through the last recorded event's period. The number of periods
 * walked is bounded by the recorded history itself rather than by any caller
 * input, so the walk cannot be driven arbitrarily long.
 *
 * Empty input is always defined, never an error: every count is zero, the
 * period-over-period comparison has no predecessor, and NO period is fabricated.
 */

import { getFirstWatchedAt, getLastWatchedAt } from "./activity";
import type { AnalyticsPeriod, WatchActivityEvent } from "./types";
import { getPeriodEnd, getPeriodStart } from "./watchPeriods";

/**
 * Change between the two most recent periods of the natural window.
 *
 * Every optional value is `null` for exactly one documented reason, so a
 * consumer never has to infer meaning from a sentinel number:
 *
 * - `previousEventCount`, `absoluteChange`, and `percentageChange` are `null`
 *   when `hasPredecessor` is `false` (fewer than two periods in the window).
 * - `percentageChange` is additionally `null` when the previous period held no
 *   recorded events, because no finite ratio exists (0 to N is not a percentage;
 *   treating it as one would require Infinity).
 *
 * `percentageChange` is therefore `number | null` and can never be `NaN` or
 * `Infinity`. It is an UNROUNDED signed ratio (`absoluteChange / previous`), in
 * keeping with `getEventsPerActiveDay`; formatting for display is the
 * presentation layer's responsibility.
 */
export interface PeriodOverPeriodChange {
  /** Whether the window contains a predecessor for the final period. */
  readonly hasPredecessor: boolean;
  /** Recorded events in the preceding period; `null` when there is none. */
  readonly previousEventCount: number | null;
  /** Recorded events in the final period of the window. */
  readonly currentEventCount: number;
  /**
   * `currentEventCount - previousEventCount`; `null` when there is no
   * predecessor.
   */
  readonly absoluteChange: number | null;
  /**
   * `absoluteChange / previousEventCount`, unrounded; `null` when there is no
   * predecessor or when the previous period recorded no events.
   */
  readonly percentageChange: number | null;
}

/**
 * Recorded-activity trends over the full natural gap-free period window.
 *
 * The window runs from the period containing the first recorded event through
 * the period containing the last recorded event, inclusive of both. Every period
 * in that range participates — including periods with no recorded events — so
 * `activePeriodCount + inactivePeriodCount === totalPeriodCount` always holds.
 *
 * A period is ACTIVE when it holds at least one recorded event, and INACTIVE
 * otherwise. Both halves describe recorded activity only.
 */
export interface WatchActivityTrends {
  /** The granularity these trends were computed at. */
  readonly period: AnalyticsPeriod;
  /**
   * Periods in the natural window; equals `activePeriodCount +
   * inactivePeriodCount`.
   */
  readonly totalPeriodCount: number;
  /** Periods holding at least one recorded event. */
  readonly activePeriodCount: number;
  /** Periods holding no recorded events. */
  readonly inactivePeriodCount: number;
  /** Longest run of consecutive periods with recorded activity in the window. */
  readonly longestConsecutiveActivePeriods: number;
  /**
   * Run of consecutive periods with recorded activity ending at the FINAL period
   * of the window; `0` when that final period is inactive.
   */
  readonly latestConsecutiveActivePeriods: number;
  /** Comparison of the final two periods, with `null` wherever undefined. */
  readonly periodOverPeriod: PeriodOverPeriodChange;
}

/**
 * Counts recorded events by the start instant of their calendar period.
 *
 * Only counts are retained, not event arrays: trends need frequencies, and
 * holding references to events would make memory grow with history for no added
 * value. Period semantics come entirely from `getPeriodStart`, so the map keys
 * align exactly with the axis walked in `buildWatchActivityTrends`. The input is
 * iterated directly and is never mutated or sorted.
 */
function countEventsByPeriodStart(
  events: readonly WatchActivityEvent[],
  period: AnalyticsPeriod,
): Map<number, number> {
  const countsByPeriodStart = new Map<number, number>();

  for (const event of events) {
    const periodStart = getPeriodStart(event.watchedAt, period).getTime();

    countsByPeriodStart.set(
      periodStart,
      (countsByPeriodStart.get(periodStart) ?? 0) + 1,
    );
  }

  return countsByPeriodStart;
}

/**
 * Builds the period-over-period comparison from the final two periods of the
 * window.
 *
 * Both counts are passed in so this stays a total function with no implicit
 * state: with fewer than two periods the caller passes `hasPredecessor: false`
 * and every optional value becomes `null`.
 */
function toPeriodOverPeriodChange(
  hasPredecessor: boolean,
  previousEventCount: number | null,
  currentEventCount: number,
): PeriodOverPeriodChange {
  if (!hasPredecessor || previousEventCount === null) {
    return {
      hasPredecessor: false,
      previousEventCount: null,
      currentEventCount,
      absoluteChange: null,
      percentageChange: null,
    };
  }

  const absoluteChange = currentEventCount - previousEventCount;

  return {
    hasPredecessor: true,
    previousEventCount,
    currentEventCount,
    absoluteChange,
    percentageChange:
      previousEventCount === 0 ? null : absoluteChange / previousEventCount,
  };
}

/**
 * Derives recorded-activity trends for one granularity from watch events.
 *
 * The natural window is taken from the events themselves: the period containing
 * the first recorded event through the period containing the last one. The axis
 * is walked once using the same DST-safe helpers `enumeratePeriods` uses, and it
 * is never materialized into an array — each period is classified and discarded,
 * which keeps auxiliary memory constant and the whole pass linear in the number
 * of events plus the number of periods actually spanned.
 *
 * Empty input yields an all-zero projection with no fabricated period, matching
 * `buildWatchActivityTimeline`'s empty behaviour. Deterministic and
 * order-independent; no clock is read and the input array is never mutated.
 */
export function buildWatchActivityTrends(
  events: readonly WatchActivityEvent[],
  period: AnalyticsPeriod,
): WatchActivityTrends {
  const firstWatchedAt = getFirstWatchedAt(events);
  const lastWatchedAt = getLastWatchedAt(events);

  if (firstWatchedAt === undefined || lastWatchedAt === undefined) {
    return {
      period,
      totalPeriodCount: 0,
      activePeriodCount: 0,
      inactivePeriodCount: 0,
      longestConsecutiveActivePeriods: 0,
      latestConsecutiveActivePeriods: 0,
      periodOverPeriod: toPeriodOverPeriodChange(false, null, 0),
    };
  }

  const countsByPeriodStart = countEventsByPeriodStart(events, period);
  const windowEnd = getPeriodEnd(lastWatchedAt, period).getTime();

  let totalPeriodCount = 0;
  let activePeriodCount = 0;
  let consecutiveActivePeriods = 0;
  let longestConsecutiveActivePeriods = 0;
  let previousPeriodCount: number | null = null;
  let currentPeriodCount = 0;

  let cursor = getPeriodStart(firstWatchedAt, period);

  while (cursor.getTime() < windowEnd) {
    const nextPeriodCount = countsByPeriodStart.get(cursor.getTime()) ?? 0;

    // The predecessor is the PREVIOUS iteration's count, so it is captured
    // before the current period overwrites the running pair.
    previousPeriodCount = currentPeriodCount;
    currentPeriodCount = nextPeriodCount;
    totalPeriodCount += 1;

    if (currentPeriodCount > 0) {
      activePeriodCount += 1;
      consecutiveActivePeriods += 1;

      if (consecutiveActivePeriods > longestConsecutiveActivePeriods) {
        longestConsecutiveActivePeriods = consecutiveActivePeriods;
      }
    } else {
      consecutiveActivePeriods = 0;
    }

    cursor = getPeriodEnd(cursor, period);
  }

  const hasPredecessor = totalPeriodCount > 1;

  return {
    period,
    totalPeriodCount,
    activePeriodCount,
    inactivePeriodCount: totalPeriodCount - activePeriodCount,
    longestConsecutiveActivePeriods,
    latestConsecutiveActivePeriods: consecutiveActivePeriods,
    periodOverPeriod: toPeriodOverPeriodChange(
      hasPredecessor,
      hasPredecessor ? previousPeriodCount : null,
      currentPeriodCount,
    ),
  };
}
