/**
 * Pure watch-activity aggregations derived from recorded watch history.
 *
 * This module is the second half of the analytics domain: `watchPeriods`
 * defines the calendar primitives, and this module turns a list of
 * `WatchActivityEvent` values into viewing-activity intelligence.
 *
 * Every function here is a total, deterministic derivation over
 * storage-independent event data. Specifically:
 *
 * - No IndexedDB access, no repository imports, no React, no network, no
 *   writes. `watchActivityService` owns reading; this module owns arithmetic.
 * - No clock. Nothing reads "now", so a given input always produces the same
 *   output and results stay safe to compute once and compare later.
 * - Period semantics are delegated to `watchPeriods` rather than reimplemented,
 *   so local-calendar boundaries, ISO Monday weeks, and DST safety stay owned
 *   by exactly one module.
 * - Input arrays are never mutated.
 *
 * Empty input is always defined, never an error: counts are zero and
 * "no value" results are `undefined` (or `null` where a ratio is implied).
 *
 * NAMING
 * These are HISTORY-derived values computed from `WatchHistory`. They are
 * deliberately distinct from the existing current-state statistics concepts in
 * `statisticsService`, whose `recentActivity.firstWatchDate` /
 * `lastWatchDate` come from the `Episode` watch-state cache and become `null`
 * when an episode is unwatched. Nothing here is named `firstWatchDate`,
 * `lastWatchDate`, or `watchEventCount`.
 */

import type {
  AnalyticsPeriod,
  WatchActivityBucket,
  WatchActivityEvent,
  WatchActivityTimeline,
  WatchHistorySource,
} from "./types";
import { getLocalDayNumber, groupEventsByPeriod } from "./watchPeriods";

/**
 * Watch-event counts split by how the event was recorded.
 *
 * Both sources are always present so consumers never handle a missing bucket.
 * These describe how events were *captured*, not how the user chose to watch.
 */
export interface SourceEventCounts {
  readonly manual: number;
  readonly import: number;
}

/**
 * The single calendar period containing the most watch events.
 *
 * `periodStart` is inclusive and `periodEnd` exclusive, matching the
 * `watchPeriods` conventions.
 */
export interface MostActivePeriod {
  readonly period: AnalyticsPeriod;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly eventCount: number;
}
/**
 * Aggregate viewing-activity intelligence for one period granularity.
 *
 * Every field derives from the supplied events alone. `firstWatchedAt` /
 * `lastWatchedAt` are omitted (rather than `null`) when there are no events,
 * keeping the shape structurally distinct from the existing current-state
 * statistics that use `null`.
 */
export interface ViewingActivitySummary {
  /** Granularity used for the period-oriented fields. */
  readonly period: AnalyticsPeriod;
  /** Recorded watch events across every period. */
  readonly totalEventCount: number;
  /** Distinct episodes appearing in the supplied events. */
  readonly totalDistinctEpisodeCount: number;
  /** Distinct local calendar days containing at least one event. */
  readonly activeDayCount: number;
  /** `totalEventCount / activeDayCount`, unrounded; null when there are none. */
  readonly eventsPerActiveDay: number | null;
  /** Event counts per recorded source. */
  readonly sourceEventCounts: SourceEventCounts;
  /** Earliest recorded watched instant, omitted when there are no events. */
  readonly firstWatchedAt?: Date;
  /** Latest recorded watched instant, omitted when there are no events. */
  readonly lastWatchedAt?: Date;
  /** Busiest period, omitted when there are no events. */
  readonly mostActivePeriod?: MostActivePeriod;
}

/**
 * Counts distinct local calendar days containing at least one event.
 *
 * Uses local-calendar day numbers (not UTC days and not rolling 24-hour
 * windows), so two events an hour apart across midnight remain one active day,
 * and a DST transition can never merge or split a day. Granularity is fixed to
 * the calendar day: an "active day" is always a local date.
 */
export function getActiveViewingDays(
  events: readonly WatchActivityEvent[],
): number {
  return new Set(events.map((event) => getLocalDayNumber(event.watchedAt)))
    .size;
}

/**
 * Mean recorded events per active local calendar day.
 *
 * Returned unrounded so no precision is invented, and `null` when there are no
 * events so callers distinguish "no activity" from "zero per day".
 */
export function getEventsPerActiveDay(
  events: readonly WatchActivityEvent[],
): number | null {
  const activeDayCount = getActiveViewingDays(events);

  if (activeDayCount === 0) {
    return null;
  }

  return events.length / activeDayCount;
}

/**
 * Counts events by recording source.
 *
 * Total over both sources for every input, including empty input.
 */
export function countEventsBySource(
  events: readonly WatchActivityEvent[],
): SourceEventCounts {
  let manualCount = 0;
  let importCount = 0;

  for (const event of events) {
    if (event.source === "manual") {
      manualCount += 1;
    } else {
      importCount += 1;
    }
  }

  return { manual: manualCount, import: importCount };
}

/**
 * Earliest recorded watched instant, or `undefined` when there are no events.
 *
 * Scans every event rather than trusting input order, so the result is
 * independent of the order events are supplied in.
 */
export function getFirstWatchedAt(
  events: readonly WatchActivityEvent[],
): Date | undefined {
  return getExtremeWatchedAt(
    events,
    (candidate, current) => candidate < current,
  );
}

/**
 * Latest recorded watched instant, or `undefined` when there are no events.
 *
 * Scans every event rather than trusting input order.
 */
export function getLastWatchedAt(
  events: readonly WatchActivityEvent[],
): Date | undefined {
  return getExtremeWatchedAt(
    events,
    (candidate, current) => candidate > current,
  );
}

function getExtremeWatchedAt(
  events: readonly WatchActivityEvent[],
  isPreferred: (candidate: number, current: number) => boolean,
): Date | undefined {
  let extreme: Date | undefined;

  for (const event of events) {
    if (
      extreme === undefined ||
      isPreferred(event.watchedAt.getTime(), extreme.getTime())
    ) {
      extreme = event.watchedAt;
    }
  }

  return extreme;
}

/**
 * Selects the busiest bucket, or `undefined` when there are none.
 *
 * Buckets arrive ascending by period start and only a strictly greater count
 * replaces the incumbent, so ties resolve to the EARLIEST period. That keeps
 * the answer deterministic for any input ordering.
 */
function findMostActiveBucket(
  buckets: readonly WatchActivityBucket[],
): WatchActivityBucket | undefined {
  return buckets.reduce<WatchActivityBucket | undefined>(
    (incumbent, bucket) =>
      incumbent === undefined || bucket.eventCount > incumbent.eventCount
        ? bucket
        : incumbent,
    undefined,
  );
}

function toMostActivePeriod(
  bucket: WatchActivityBucket | undefined,
): MostActivePeriod | undefined {
  if (bucket === undefined) {
    return undefined;
  }

  return {
    period: bucket.period,
    periodStart: bucket.periodStart,
    periodEnd: bucket.periodEnd,
    eventCount: bucket.eventCount,
  };
}

/**
 * Busiest period by recorded event count, or `undefined` when there are none.
 *
 * Ties resolve to the earliest period start.
 */
export function getMostActivePeriod(
  events: readonly WatchActivityEvent[],
  period: AnalyticsPeriod,
): MostActivePeriod | undefined {
  return toMostActivePeriod(
    findMostActiveBucket(groupEventsByPeriod(events, period).buckets),
  );
}

/**
 * Per-period watch-event timeline.
 *
 * An explicit pass-through to the Step 1 primitive so Step 2 consumers have a
 * single entry point into the analytics domain, without duplicating period
 * logic here.
 */
export function getWatchActivityTimeline(
  events: readonly WatchActivityEvent[],
  period: AnalyticsPeriod,
): WatchActivityTimeline {
  return groupEventsByPeriod(events, period);
}

/**
 * Full viewing-activity summary at one granularity.
 *
 * Delegates period work to `watchPeriods` and computes only the history-level
 * aggregations here. Deterministic and order-independent; the input array is
 * never mutated.
 */
export function summarizeWatchActivity(
  events: readonly WatchActivityEvent[],
  period: AnalyticsPeriod,
): ViewingActivitySummary {
  const timeline = groupEventsByPeriod(events, period);
  const firstWatchedAt = getFirstWatchedAt(events);
  const lastWatchedAt = getLastWatchedAt(events);
  const mostActivePeriod = toMostActivePeriod(
    findMostActiveBucket(timeline.buckets),
  );

  return {
    period,
    totalEventCount: timeline.totalEventCount,
    totalDistinctEpisodeCount: timeline.totalDistinctEpisodeCount,
    activeDayCount: getActiveViewingDays(events),
    eventsPerActiveDay: getEventsPerActiveDay(events),
    sourceEventCounts: countEventsBySource(events),
    ...(firstWatchedAt === undefined ? {} : { firstWatchedAt }),
    ...(lastWatchedAt === undefined ? {} : { lastWatchedAt }),
    ...(mostActivePeriod === undefined ? {} : { mostActivePeriod }),
  };
}

/**
 * Re-exported so consumers can narrow a recorded source without a second
 * import path into the analytics domain.
 */
export type { WatchHistorySource };
