/**
 * Deterministic date and period primitives for watch-activity analytics.
 *
 * These are pure derivations over watch events. They are free of database,
 * network, and UI dependencies, and they never read the current clock: every
 * function that would otherwise need "now" receives the instant it operates on
 * as a parameter, so behavior is reproducible and testable.
 *
 * Calendar semantics follow the conventions established in
 * `src/domain/dates/airDate.ts`:
 *
 * - Period boundaries are LOCAL calendar boundaries. The user's "day" is their
 *   own local day, not a UTC day, so a watch at 23:30 local belongs to that
 *   local date even though `toISOString()` would report the following day.
 * - Calendar arithmetic is integer-only, so DST transitions and timezone
 *   changes can never shift a boundary by a day or drop an event into the
 *   wrong period.
 * - The `week` granularity is the ISO-8601 week: weeks start on Monday, and
 *   week 1 is the week containing the year's first Thursday.
 *
 * Nothing here is persisted. Analytics remains a read-time projection over the
 * existing watch-history store.
 */

import type {
  AnalyticsPeriod,
  WatchActivityBucket,
  WatchActivityEvent,
  WatchActivityTimeline,
} from "./types";

/**
 * Days from the Unix epoch, matching `airDate`'s day numbering (1970-01-01 is
 * day 0) so the two date domains stay comparable.
 */
const EPOCH_DAY_NUMBER = 0;

/**
 * Days from the Unix epoch to the given local calendar date, via integer-only
 * civil-date arithmetic.
 *
 * Precondition: `month` is 1-12 and `day` is a real calendar day for that
 * month. Only calendar components participate, so the result is exact and is
 * never shifted by a DST transition.
 */
function toLocalDayNumber(year: number, month: number, day: number): number {
  // Shift the year so the year starts in March (leap day falls at the end),
  // then count days with 400/100/4-year era arithmetic.
  const shiftedYear = month <= 2 ? year - 1 : year;
  const era = Math.floor(shiftedYear / 400);
  const yearOfEra = shiftedYear - era * 400;
  const dayOfYear =
    Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear;

  return era * 146097 + dayOfEra - EPOCH_DAY_NUMBER - 719468;
}

/**
 * ISO weekday for a local day number: 1 = Monday ... 7 = Sunday.
 *
 * Day 0 (1970-01-01) was a Thursday (ISO weekday 4), so a day number `n` has
 * ISO weekday `((n + 3) % 7) + 1`. The modulo is normalized into 0-6 first so
 * pre-1970 day numbers (negative) resolve correctly too.
 */
function getIsoWeekday(dayNumber: number): number {
  return ((((dayNumber - EPOCH_DAY_NUMBER + 3) % 7) + 7) % 7) + 1;
}

/**
 * Local midnight for a calendar date.
 *
 * Local calendar components are used, so this is the user's own midnight and
 * never a UTC-converted one. Out-of-range component values (day 0, month 13)
 * normalize the way `Date` already normalizes them.
 */
function localMidnight(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Inclusive start of the calendar period containing `date`.
 *
 * `week` boundaries are ISO-8601 (Monday start, week 1 contains the first
 * Thursday of the year).
 */
export function getPeriodStart(date: Date, period: AnalyticsPeriod): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (period === "year") {
    return localMidnight(year, 1, 1);
  }

  if (period === "month") {
    return localMidnight(year, month, 1);
  }

  if (period === "week") {
    const daysSinceMonday =
      getIsoWeekday(toLocalDayNumber(year, month, day)) - 1;

    return localMidnight(year, month, day - daysSinceMonday);
  }

  return localMidnight(year, month, day);
}

/**
 * Exclusive end of the calendar period containing `date`.
 *
 * Always strictly later than `getPeriodStart` for the same input, including
 * across month, year, and leap-day boundaries. Boundaries come from calendar
 * components rather than millisecond addition, so a DST transition can never
 * produce a boundary an hour short or long.
 */
export function getPeriodEnd(date: Date, period: AnalyticsPeriod): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (period === "year") {
    return localMidnight(year + 1, 1, 1);
  }

  if (period === "month") {
    return localMidnight(year, month + 1, 1);
  }

  const end = new Date(getPeriodStart(date, period));
  end.setDate(end.getDate() + (period === "week" ? 7 : 1));

  return end;
}

/**
 * True when `date` falls inside the half-open period `[start, end)` produced
 * by `getPeriodStart` / `getPeriodEnd` for the same granularity.
 */
export function isWithinPeriod(date: Date, start: Date, end: Date): boolean {
  const timestamp = date.getTime();

  return timestamp >= start.getTime() && timestamp < end.getTime();
}

/**
 * Compares two optional persisted ids.
 *
 * Deterministic and never `NaN`: when both ids are present the comparison is
 * the numeric difference, and when either is absent the events are treated as
 * equal so the caller's earlier criteria decide. Events without ids remain
 * orderable, just not strictly ordered against each other.
 */
function compareOptionalIds(
  firstId: number | undefined,
  secondId: number | undefined,
): number {
  if (firstId === undefined || secondId === undefined) {
    return 0;
  }

  return firstId - secondId;
}

/**
 * Deterministic total order for watch events: watched time, then episode id,
 * then persisted id.
 *
 * Watched times are not unique (a bulk mark-watched or an import can stamp
 * several events with one instant), so the episode-id and persisted-id
 * tie-breakers make the order total and therefore reproducible regardless of
 * input order. The persisted-id tier mirrors the repository's own historical
 * read order, so domain and storage agree on which event is "first".
 */
function compareWatchEvents(
  firstEvent: WatchActivityEvent,
  secondEvent: WatchActivityEvent,
): number {
  const watchedAtDifference =
    firstEvent.watchedAt.getTime() - secondEvent.watchedAt.getTime();

  if (watchedAtDifference !== 0) {
    return watchedAtDifference;
  }

  const episodeIdDifference = firstEvent.episodeId - secondEvent.episodeId;

  if (episodeIdDifference !== 0) {
    return episodeIdDifference;
  }

  return compareOptionalIds(firstEvent.id, secondEvent.id);
}

/**
 * Groups watch events into calendar-period buckets at the given granularity.
 *
 * Deterministic and side-effect free: the input array is never mutated,
 * events are ordered by `compareWatchEvents` before grouping, and buckets are
 * returned ascending by period start. Buckets exist only for periods that
 * actually contain events, so an empty input yields an empty timeline rather
 * than a synthetic zero range (use `enumeratePeriods` for a gap-free axis).
 */
export function groupEventsByPeriod(
  events: readonly WatchActivityEvent[],
  period: AnalyticsPeriod,
): WatchActivityTimeline {
  const orderedEvents = [...events].sort(compareWatchEvents);
  const eventsByPeriodStart = new Map<number, WatchActivityEvent[]>();

  for (const event of orderedEvents) {
    const periodStart = getPeriodStart(event.watchedAt, period).getTime();
    const bucketEvents = eventsByPeriodStart.get(periodStart);

    if (bucketEvents === undefined) {
      eventsByPeriodStart.set(periodStart, [event]);
    } else {
      bucketEvents.push(event);
    }
  }

  const buckets: WatchActivityBucket[] = [...eventsByPeriodStart.keys()]
    .sort((firstStart, secondStart) => firstStart - secondStart)
    .map((periodStart) => {
      const bucketEvents = eventsByPeriodStart.get(periodStart) ?? [];
      const startDate = new Date(periodStart);

      return {
        period,
        periodStart: startDate,
        periodEnd: getPeriodEnd(startDate, period),
        eventCount: bucketEvents.length,
        distinctEpisodeCount: new Set(
          bucketEvents.map((event) => event.episodeId),
        ).size,
      };
    });

  const firstWatchedAt = orderedEvents.at(0)?.watchedAt;
  const lastWatchedAt = orderedEvents.at(-1)?.watchedAt;

  return {
    period,
    buckets,
    totalEventCount: orderedEvents.length,
    totalDistinctEpisodeCount: new Set(
      orderedEvents.map((event) => event.episodeId),
    ).size,
    ...(firstWatchedAt === undefined ? {} : { firstWatchedAt }),
    ...(lastWatchedAt === undefined ? {} : { lastWatchedAt }),
  };
}

/**
 * Builds a gap-free series of empty periods covering `[from, to)`.
 *
 * Each returned bucket carries zero counts, so a caller can overlay observed
 * activity on a continuous axis instead of collapsing periods that had no
 * viewing activity. An inverted or empty range yields no buckets.
 */
export function enumeratePeriods(
  from: Date,
  to: Date,
  period: AnalyticsPeriod,
): WatchActivityBucket[] {
  const buckets: WatchActivityBucket[] = [];

  if (from.getTime() >= to.getTime()) {
    return buckets;
  }

  let cursor = getPeriodStart(from, period);

  while (cursor.getTime() < to.getTime()) {
    const periodEnd = getPeriodEnd(cursor, period);

    buckets.push({
      period,
      periodStart: cursor,
      periodEnd,
      eventCount: 0,
      distinctEpisodeCount: 0,
    });

    cursor = periodEnd;
  }

  return buckets;
}

/**
 * Local calendar day number (days since the Unix epoch) for `date`.
 *
 * Exposed for callers that bucket or compare events by day without building or
 * formatting `Date` strings.
 */
export function getLocalDayNumber(date: Date): number {
  return toLocalDayNumber(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}
