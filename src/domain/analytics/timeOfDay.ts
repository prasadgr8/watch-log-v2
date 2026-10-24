/**
 * Pure time-of-day analytics derived from recorded watch history.
 *
 * This module answers "when during the day does recorded activity happen?"
 * by bucketing each event's local hour into one of four fixed buckets:
 *
 * - Morning: 05:00–11:59
 * - Afternoon: 12:00–16:59
 * - Evening: 17:00–20:59
 * - Night: 21:00–04:59
 *
 * Every event belongs to exactly one bucket. Midnight through 04:59 belongs
 * to Night. Bucket order is deterministic: Morning, Afternoon, Evening, Night.
 *
 * Every function here is a total, deterministic derivation over in-memory
 * event data:
 *
 * - No IndexedDB access, no repository imports, no React, no network, no writes.
 * - No clock. Every value is derived from each event `watchedAt` alone, so a
 *   given input always produces the same output.
 * - Input arrays are never mutated.
 * - Empty input yields four zero buckets with `isAvailable: false`.
 */

import type { WatchActivityEvent } from "./types";

/** The four approved time-of-day buckets, in deterministic display order. */
export const TIME_OF_DAY_BUCKETS: readonly TimeOfDayBucketName[] = [
  "Morning",
  "Afternoon",
  "Evening",
  "Night",
];

/** One of the four fixed time-of-day buckets. */
export type TimeOfDayBucketName = "Morning" | "Afternoon" | "Evening" | "Night";

/** One time-of-day bucket with its event count and share of all events. */
export interface TimeOfDayBucket {
  readonly bucket: TimeOfDayBucketName;
  readonly eventCount: number;
  readonly percentage: number;
}

/** The result of bucketing events by time of day. */
export interface TimeOfDayResult {
  readonly buckets: readonly TimeOfDayBucket[];
  readonly totalEvents: number;
  readonly isAvailable: boolean;
}

/** Maps a local clock hour (0..23) to its fixed time-of-day bucket. */
function timeOfDayBucketForHour(hour: number): TimeOfDayBucketName {
  if (hour >= 5 && hour <= 11) return "Morning";
  if (hour >= 12 && hour <= 16) return "Afternoon";
  if (hour >= 17 && hour <= 20) return "Evening";
  return "Night";
}

/**
 * Buckets events by the local time of day of their `watchedAt`.
 *
 * Returns all four fixed buckets in deterministic order, each with its event
 * count and percentage of all events (rounded to the nearest whole percent).
 * Empty input yields four zero buckets with `isAvailable: false`.
 */
export function bucketEventsByTimeOfDay(
  events: readonly WatchActivityEvent[],
): TimeOfDayResult {
  const counts = new Map<TimeOfDayBucketName, number>();
  for (const name of TIME_OF_DAY_BUCKETS) {
    counts.set(name, 0);
  }

  let totalEvents = 0;
  for (const event of events) {
    totalEvents += 1;
    const bucket = timeOfDayBucketForHour(event.watchedAt.getHours());
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  const isAvailable = totalEvents > 0;
  const buckets: TimeOfDayBucket[] = TIME_OF_DAY_BUCKETS.map((name) => {
    const eventCount = counts.get(name) ?? 0;
    const percentage = isAvailable
      ? Math.round((eventCount / totalEvents) * 100)
      : 0;
    return { bucket: name, eventCount, percentage };
  });

  return { buckets, totalEvents, isAvailable };
}