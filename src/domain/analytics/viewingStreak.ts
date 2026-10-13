/**
 * Current viewing streak derived from recorded watch history.
 *
 * A "viewing day" is a local calendar day that contains at least one watch
 * event. The current streak is the number of consecutive viewing days ending on
 * the most recent viewing day — the trailing run of back-to-back active days.
 *
 * The derivation is deterministic and clock-free: the run is anchored to the
 * latest event day present in the supplied history, never to "today", so the
 * same history always yields the same streak and a history whose most recent
 * viewing day was in the past ends exactly on that day rather than silently
 * continuing to the present. An empty history yields 0.
 *
 * Day identity reuses the domain's canonical local-calendar `getLocalDayNumber`
 * (the same helper the rest of the analytics domain buckets by), so no new
 * timezone or date policy is introduced here and a viewing day is always the
 * user's own local day.
 *
 * This module is storage-, repository-, and UI-free: it performs no I/O, reads
 * no clock, and never mutates the supplied events. It intentionally computes
 * only the CURRENT streak; no longest-streak or historical-run value is
 * produced here.
 */

import type { WatchActivityEvent } from "./types";
import { getLocalDayNumber } from "./watchPeriods";

/**
 * The current viewing streak in consecutive local calendar days.
 *
 * Steps:
 * 1. Collapse events onto their distinct local day numbers.
 * 2. Anchor on the greatest (most recent) viewing day.
 * 3. Walk backward one day at a time while each preceding day is also a viewing
 *    day, counting the run.
 *
 * A single non-consecutive historical day never inflates the run, because the
 * walk stops at the first missing day. Multiple events on one day count once.
 */
export function getCurrentStreak(
  events: readonly WatchActivityEvent[],
): number {
  if (events.length === 0) {
    return 0;
  }

  const activeDays = new Set<number>();

  for (const event of events) {
    activeDays.add(getLocalDayNumber(event.watchedAt));
  }

  let latestDay = Number.NEGATIVE_INFINITY;

  for (const day of activeDays) {
    if (day > latestDay) {
      latestDay = day;
    }
  }

  let streak = 0;
  let day = latestDay;

  while (activeDays.has(day)) {
    streak += 1;
    day -= 1;
  }

  return streak;
}
