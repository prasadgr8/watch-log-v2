/**
 * Pure viewing-rhythm analytics derived from recorded watch history.
 *
 * This module answers "when during the day and week does recorded activity
 * happen?" -- the hour-of-day and day-of-week distribution of a set of
 * `WatchActivityEvent` values. It is the temporal-pattern counterpart to
 * `activity.ts` (calendar-period aggregations): where that buckets by calendar
 * PERIOD (day/week/month/year), this buckets by the clock hour and the weekday
 * WITHIN a day.
 *
 * Every function here is a total, deterministic derivation over in-memory event
 * data:
 *
 * - No IndexedDB access, no repository imports, no React, no network, no writes.
 * - No clock. Every value is derived from each event `watchedAt` alone, so a
 *   given input always produces the same output.
 * - Input arrays are never mutated, and no event is sorted: counts are order-
 *   independent by construction.
 *
 * LOCAL-CALENDAR SEMANTICS, NO NEW TIMEZONE POLICY
 * Both buckets are computed from the user LOCAL calendar, matching the rest of
 * the analytics domain (which buckets by local day via `getLocalDayNumber`):
 *
 * - Hour of day is the local hour `0..23` (`Date.prototype.getHours`).
 * - Day of week is the ISO weekday `1..7` (Monday=1 ... Sunday=7), derived from
 *   the SAME local day number the rest of the domain uses, so a late-evening
 *   event stays in its own local day rather than rolling into the next UTC day.
 *
 * No UTC conversion, offset math, or new timezone behavior is introduced here.
 *
 * CHART-READY, GAP-FREE STRUCTURE
 * Each function returns a fixed-length, ascending array with an entry for every
 * bucket (hours 0..23, weekdays 1..7), including zero-count buckets, so a chart
 * can render a stable axis without inferring missing buckets. Empty input yields
 * all-zero buckets. These shapes are data only: no UI, rendering, or formatting
 * lives here.
 */

import type { WatchActivityEvent } from "./types";
import { getLocalDayNumber } from "./watchPeriods";

/**
 * ISO weekday (1 = Monday ... 7 = Sunday) for a local day number.
 *
 * This mirrors the domain internal weekday derivation in `watchPeriods`
 * (`getIsoWeekday`) so the two agree by construction: day 0 (1970-01-01) was a
 * Thursday (ISO weekday 4), so day number `n` has ISO weekday
 * `((n + 3) % 7) + 1`, with the modulo normalized to 0-6 first so pre-1970
 * (negative) day numbers resolve correctly.
 */
export function toIsoWeekday(localDayNumber: number): number {
  return ((((localDayNumber + 3) % 7) + 7) % 7) + 1;
}

/**
 * One hour-of-day bucket: the local clock hour and how many events fall in it.
 *
 * `hour` is the local hour `0..23`; `eventCount` is the number of events whose
 * `watchedAt` has that local hour.
 */
export interface HourOfDayBucket {
  readonly hour: number;
  readonly eventCount: number;
}

/**
 * One day-of-week bucket: the ISO weekday and how many events fall on it.
 *
 * `isoWeekday` is `1..7` (Monday=1 ... Sunday=7); `eventCount` is the number of
 * events whose `watchedAt` local calendar day is that weekday.
 */
export interface DayOfWeekBucket {
  readonly isoWeekday: number;
  readonly eventCount: number;
}

/**
 * The number of hours in a day, so the hour axis is always a fixed 24 slots.
 */
const HOURS_IN_DAY = 24;

/**
 * The number of ISO weekdays in a week, so the weekday axis is always 7 slots.
 */
const ISO_WEEKDAYS_IN_WEEK = 7;

/**
 * Buckets events by the LOCAL hour of day of their `watchedAt`.
 *
 * Returns a fixed, ascending array of 24 buckets (hours `0..23`), each carrying
 * the count of events in that local hour, including zero-count hours. The hour
 * is read directly from the event instant with no timezone conversion, matching
 * the domain local-calendar convention. Deterministic and order-independent:
 * permuting the input permutes nothing. Empty input yields 24 zero buckets.
 */
export function bucketEventsByHourOfDay(
  events: readonly WatchActivityEvent[],
): HourOfDayBucket[] {
  const counts = new Array<number>(HOURS_IN_DAY).fill(0);

  for (const event of events) {
    counts[event.watchedAt.getHours()] += 1;
  }

  return counts.map((eventCount, hour) => ({ hour, eventCount }));
}

/**
 * Buckets events by the LOCAL ISO weekday of their `watchedAt`.
 *
 * Returns a fixed, ascending array of 7 buckets (ISO weekdays `1..7`,
 * Monday=1 ... Sunday=7), each carrying the count of events on that weekday,
 * including zero-count weekdays. The weekday is derived from the SAME local day
 * number the rest of the analytics domain uses, so an event keeps its own local
 * calendar day (a late-evening event is not rolled into the next UTC day) and no
 * timezone behavior is introduced. Deterministic and order-independent: the
 * counts depend only on the multiset of input weekdays. Empty input yields 7
 * zero buckets.
 */
export function bucketEventsByDayOfWeek(
  events: readonly WatchActivityEvent[],
): DayOfWeekBucket[] {
  const counts = new Array<number>(ISO_WEEKDAYS_IN_WEEK).fill(0);

  for (const event of events) {
    const isoWeekday = toIsoWeekday(getLocalDayNumber(event.watchedAt));
    counts[isoWeekday - 1] += 1;
  }

  return counts.map((eventCount, index) => ({
    isoWeekday: index + 1,
    eventCount,
  }));
}