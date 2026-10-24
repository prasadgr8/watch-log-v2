/**
 * Pure weekend-viewing analytics derived from recorded watch history.
 *
 * This module answers "what share of recorded viewing happens on weekends?"
 * by computing:
 *
 *   Saturday events + Sunday events
 *   ---------------------------------
 *   all recorded events
 *
 * The result is a percentage rounded to the nearest whole percent.
 *
 * Every function here is a total, deterministic derivation over in-memory
 * event data:
 *
 * - No IndexedDB access, no repository imports, no React, no network, no writes.
 * - No clock. Every value is derived from each event `watchedAt` alone.
 * - Input arrays are never mutated.
 * - Empty input yields `isAvailable: false` and a zero percentage.
 */

import type { WatchActivityEvent } from "./types";
import { getLocalDayNumber } from "./watchPeriods";
import { toIsoWeekday } from "./viewingRhythm";

/** ISO weekdays that are weekend days: Saturday (6) and Sunday (7). */
const WEEKEND_ISO_WEEKDAYS = new Set([6, 7]);

/** The result of computing the weekend viewing share. */
export interface WeekendViewingResult {
  readonly weekendEvents: number;
  readonly totalEvents: number;
  readonly percentage: number;
  readonly isAvailable: boolean;
}

/**
 * Computes the share of recorded watch events that fall on a Saturday or
 * Sunday, using the event's local calendar day.
 *
 * Returns the weekend event count, total event count, the percentage rounded
 * to the nearest whole percent, and whether any events were available to
 * analyze. Empty input yields `isAvailable: false`.
 */
export function calculateWeekendViewing(
  events: readonly WatchActivityEvent[],
): WeekendViewingResult {
  let totalEvents = 0;
  let weekendEvents = 0;

  for (const event of events) {
    totalEvents += 1;
    const isoWeekday = toIsoWeekday(getLocalDayNumber(event.watchedAt));
    if (WEEKEND_ISO_WEEKDAYS.has(isoWeekday)) {
      weekendEvents += 1;
    }
  }

  const isAvailable = totalEvents > 0;
  const percentage = isAvailable
    ? Math.round((weekendEvents / totalEvents) * 100)
    : 0;

  return { weekendEvents, totalEvents, percentage, isAvailable };
}