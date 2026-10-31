/**
 * Milestone analytics derived from the watch events currently supplied.
 *
 * These values describe recorded events that are still present in WatchLog,
 * not a complete or lifetime viewing history. Episode and movie totals use
 * explicit media attribution and count recorded events (including a recorded
 * rewatch as another event). The viewing streak reuses the existing
 * current-streak semantics and is anchored to the latest event day in the
 * supplied data.
 *
 * This module is a pure in-memory projection. It does not read storage, the
 * clock, or UI state, and it never mutates its input.
 */

import type { WatchActivityEvent } from "./types";
import { getCurrentStreak } from "./viewingStreak";

/**
 * Recorded watch-event milestones currently represented by the input data.
 */
export interface MilestonesAnalytics {
  /** Explicitly attributed TV episode watch events still present in the data. */
  readonly episodesWatched: number;
  /** Explicitly attributed movie watch events still present in the data. */
  readonly moviesWatched: number;
  /** Consecutive local viewing days ending on the latest recorded viewing day. */
  readonly currentViewingStreak: number;
}

/** Derives milestone values from the supplied recorded watch events. */
export function calculateMilestones(
  events: readonly WatchActivityEvent[],
): MilestonesAnalytics {
  return {
    episodesWatched: events.filter(
      (event) =>
        event.mediaType === "tv" &&
        typeof event.episodeId === "number" &&
        Number.isInteger(event.episodeId) &&
        event.episodeId > 0,
    ).length,
    moviesWatched: events.filter(
      (event) => event.mediaType === "movie" && event.episodeId === null,
    ).length,
    currentViewingStreak: getCurrentStreak(events),
  };
}
