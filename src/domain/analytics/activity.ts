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
import {
  enumeratePeriods,
  getLocalDayNumber,
  getPeriodEnd,
  getPeriodStart,
  groupEventsByPeriod,
} from "./watchPeriods";

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
 * Maximum number of buckets a timeline projection may return.
 *
 * The approved cap for the visible timeline window. When the natural
 * historical window is larger, only the NEWEST buckets are retained and the
 * omission is reported explicitly through the projection's truncation
 * metadata, so history is never silently discarded.
 */
export const WATCH_ACTIVITY_TIMELINE_MAX_BUCKETS = 120;

/**
 * One bucket of the gap-free timeline projection.
 *
 * Complements the sparse `WatchActivityBucket` vocabulary with everything the
 * future timeline UI needs per period: a deterministic bucket identity, the
 * local active-day count, and how the bucket's events were recorded. Periods
 * with no recorded events still appear, with zero counts.
 */
export interface WatchActivityTimelineBucket {
  /** The granularity this bucket aggregates. */
  readonly period: AnalyticsPeriod;
  /**
   * Deterministic bucket identity, `"<period>:<localDayNumber>"`, where the
   * day number is the local calendar day of `periodStart`.
   *
   * Machine-derived and never a formatted or locale-dependent label, stable
   * across runs and timezones, and unique within a timeline because distinct
   * periods never share a `periodStart`.
   */
  readonly key: string;
  /** Inclusive local-calendar start of the bucket's period. */
  readonly periodStart: Date;
  /** Exclusive local-calendar end of the bucket's period. */
  readonly periodEnd: Date;
  /** Recorded watch events in the bucket; zero for gap-filled periods. */
  readonly eventCount: number;
  /** Distinct episodes appearing in the bucket's events. */
  readonly distinctEpisodeCount: number;
  /** Distinct local calendar days containing at least one bucket event. */
  readonly activeDayCount: number;
  /** The bucket's events split by recording source. */
  readonly sourceEventCounts: SourceEventCounts;
}

/**
 * Gap-free, capped per-period timeline derived from watch history.
 *
 * `buckets` contains EVERY period between the periodized first and last
 * watched instants — zero-filled where no events were recorded — ascending by
 * `periodStart` and deterministic for equivalent inputs, capped at
 * `WATCH_ACTIVITY_TIMELINE_MAX_BUCKETS` with the most recent buckets retained.
 *
 * Truncation metadata is explicit rather than implied by array length:
 *
 * - `naturalBucketCount` — buckets the natural window contains before capping.
 * - `omittedBucketCount` — earlier buckets dropped by the cap; 0 when intact.
 * - `truncated` — true exactly when earlier buckets were omitted.
 * - `windowStart` / `windowEnd` — the NATURAL periodized window (inclusive
 *   start, exclusive end), so a UI can communicate the full range next to the
 *   retained slice. Both are omitted when history is empty, so no date range
 *   is ever fabricated for zero history.
 */
export interface WatchActivityTimelineProjection {
  readonly period: AnalyticsPeriod;
  /** Ascending, gap-free, capped buckets. */
  readonly buckets: readonly WatchActivityTimelineBucket[];
  /** Buckets in the natural window before the cap was applied. */
  readonly naturalBucketCount: number;
  /** Earlier buckets omitted from `buckets` by the cap. */
  readonly omittedBucketCount: number;
  /** Whether earlier buckets were omitted by the cap. */
  readonly truncated: boolean;
  /** Inclusive start of the natural window; omitted for empty history. */
  readonly windowStart?: Date;
  /** Exclusive end of the natural window; omitted for empty history. */
  readonly windowEnd?: Date;
}

/**
 * One consistent snapshot of history-derived watch activity at a granularity.
 *
 * Both halves derive from the SAME event snapshot, so `summary` and `timeline`
 * can never disagree the way results of independent reads could.
 */
export interface WatchActivitySection {
  readonly summary: ViewingActivitySummary;
  readonly timeline: WatchActivityTimelineProjection;
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
 * logic here. Returns only the periods that contain events; use
 * `buildWatchActivityTimeline` for the gap-free, capped projection.
 */
export function getWatchActivityTimeline(
  events: readonly WatchActivityEvent[],
  period: AnalyticsPeriod,
): WatchActivityTimeline {
  return groupEventsByPeriod(events, period);
}

/**
 * Groups events by the start instant of their calendar period.
 *
 * Period semantics are delegated entirely to `getPeriodStart`, so the map's
 * keys align exactly with the axis produced by `enumeratePeriods`. The input
 * array is never mutated.
 */
function groupEventsByPeriodStart(
  events: readonly WatchActivityEvent[],
  period: AnalyticsPeriod,
): Map<number, WatchActivityEvent[]> {
  const eventsByPeriodStart = new Map<number, WatchActivityEvent[]>();

  for (const event of events) {
    const periodStart = getPeriodStart(event.watchedAt, period).getTime();
    const bucketEvents = eventsByPeriodStart.get(periodStart);

    if (bucketEvents === undefined) {
      eventsByPeriodStart.set(periodStart, [event]);
    } else {
      bucketEvents.push(event);
    }
  }

  return eventsByPeriodStart;
}

/**
 * Enriches one gap-free axis bucket with the counts of its events.
 *
 * An axis bucket without recorded events keeps every count at zero. All
 * metrics are order-independent, so the bucket's value does not depend on the
 * order its events were supplied in.
 */
function toTimelineBucket(
  axisBucket: WatchActivityBucket,
  bucketEvents: readonly WatchActivityEvent[],
): WatchActivityTimelineBucket {
  return {
    period: axisBucket.period,
    key: `${axisBucket.period}:${getLocalDayNumber(axisBucket.periodStart)}`,
    periodStart: axisBucket.periodStart,
    periodEnd: axisBucket.periodEnd,
    eventCount: bucketEvents.length,
    distinctEpisodeCount: new Set(
      bucketEvents.map((event) => event.episodeId),
    ).size,
    activeDayCount: getActiveViewingDays(bucketEvents),
    sourceEventCounts: countEventsBySource(bucketEvents),
  };
}

/**
 * Builds the gap-free, capped watch-activity timeline for one granularity.
 *
 * The natural window is derived purely from the events themselves: both
 * endpoints are periodized with the existing local-calendar, DST-safe
 * helpers, every period between them is enumerated (zero-filled where no
 * events were recorded), and the observed counts are overlaid. The window is
 * then capped at `WATCH_ACTIVITY_TIMELINE_MAX_BUCKETS`, retaining the MOST
 * RECENT buckets and reporting the omission in the projection's truncation
 * metadata instead of discarding history silently.
 *
 * Deterministic and order-independent; the input array is never mutated, no
 * clock is read, and empty input yields an empty projection with deterministic
 * metadata rather than a fabricated date range.
 */
export function buildWatchActivityTimeline(
  events: readonly WatchActivityEvent[],
  period: AnalyticsPeriod,
): WatchActivityTimelineProjection {
  const firstWatchedAt = getFirstWatchedAt(events);
  const lastWatchedAt = getLastWatchedAt(events);

  if (firstWatchedAt === undefined || lastWatchedAt === undefined) {
    return {
      period,
      buckets: [],
      naturalBucketCount: 0,
      omittedBucketCount: 0,
      truncated: false,
    };
  }

  const windowStart = getPeriodStart(firstWatchedAt, period);
  const windowEnd = getPeriodEnd(lastWatchedAt, period);
  const eventsByPeriodStart = groupEventsByPeriodStart(events, period);
  const naturalBuckets = enumeratePeriods(windowStart, windowEnd, period);
  const omittedBucketCount = Math.max(
    0,
    naturalBuckets.length - WATCH_ACTIVITY_TIMELINE_MAX_BUCKETS,
  );
  const retainedBuckets =
    omittedBucketCount > 0
      ? naturalBuckets.slice(omittedBucketCount)
      : naturalBuckets;

  return {
    period,
    buckets: retainedBuckets.map((bucket) =>
      toTimelineBucket(
        bucket,
        eventsByPeriodStart.get(bucket.periodStart.getTime()) ?? [],
      ),
    ),
    naturalBucketCount: naturalBuckets.length,
    omittedBucketCount,
    truncated: omittedBucketCount > 0,
    windowStart,
    windowEnd,
  };
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
 * Derives the full watch-activity section (summary + timeline) from ONE event
 * snapshot.
 *
 * Both halves are computed from the same supplied array, which is what keeps
 * them mutually consistent: callers map a single repository read into events
 * once and pass the result here, so the summary and the timeline can never
 * describe different reads.
 */
export function buildWatchActivitySection(
  events: readonly WatchActivityEvent[],
  period: AnalyticsPeriod,
): WatchActivitySection {
  return {
    summary: summarizeWatchActivity(events, period),
    timeline: buildWatchActivityTimeline(events, period),
  };
}

/**
 * Re-exported so consumers can narrow a recorded source without a second
 * import path into the analytics domain.
 */
export type { WatchHistorySource };
