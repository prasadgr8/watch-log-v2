/**
 * Pure media-composition analytics derived from recorded watch events.
 *
 * This module answers "what kind of events were recorded, and how many distinct
 * titles do they span?" -- the media-type and title-identity breakdown of a set
 * of `WatchActivityEvent` values. It is the media counterpart to `activity.ts`
 * (calendar/period aggregations) and `trends.ts` (period-over-period trends):
 * those describe WHEN activity happened, while this describes WHAT it was
 * recorded against.
 *
 * Every function here is a total, deterministic derivation over in-memory event
 * data:
 *
 * - No IndexedDB access, no repository imports, no React, no network, no writes.
 * - No clock. Nothing reads "now", so a given input always produces the same
 *   output.
 * - Input arrays are never mutated, and no event is sorted.
 * - Empty input is always defined, never an error: every count is zero.
 *
 * ATTRIBUTION IS EXPLICIT, NEVER INFERRED
 * A unified event attributes itself to a library title through `mediaType`
 * (`"tv"` / `"movie"`) and `mediaId` (the media-table identity). A legacy event
 * that predates the unified model carries NEITHER. Accordingly:
 *
 * - The TV and movie counts are decided by `mediaType` alone. A legacy episode
 *   event (a numeric `episodeId` with no `mediaType`) is NOT counted as TV: the
 *   kind is never inferred from the presence of an episode id.
 * - The unique-title count is decided by the authoritative `mediaId`. Legacy
 *   unattributed events (no `mediaId`) are excluded, and episode ids are never
 *   treated as titles.
 *
 * These counts describe *recorded watch events that are still present* (see the
 * durability note in `types.ts`), not a complete viewing ledger, and they never
 * consult current library state -- only the supplied events.
 */

import type { WatchActivityEvent } from "./types";

/**
 * Counts attributed unified TV episode events (`mediaType === "tv"`).
 *
 * The decision is made by `mediaType`, never by `episodeId`: a legacy episode
 * event carries a numeric `episodeId` but no `mediaType`, so it is NOT counted
 * here. A movie event (`mediaType === "movie"`, `episodeId === null`) is also
 * not counted. Empty input, or input with no attributed TV events, yields 0.
 */
export function countTvEpisodeEvents(
  events: readonly WatchActivityEvent[],
): number {
  let count = 0;

  for (const event of events) {
    if (event.mediaType === "tv") {
      count += 1;
    }
  }

  return count;
}

/**
 * Counts attributed unified movie events (`mediaType === "movie"`).
 *
 * The decision is made by `mediaType`, never by a null `episodeId`: a legacy
 * unattributed row is not counted even though it too lacks a movie marker. A
 * movie event is self-describing through `mediaType === "movie"` (it carries
 * `episodeId === null`), so this counts exactly those attributed movie events.
 * Empty input, or input with no attributed movie events, yields 0.
 */
export function countMovieEvents(
  events: readonly WatchActivityEvent[],
): number {
  let count = 0;

  for (const event of events) {
    if (event.mediaType === "movie") {
      count += 1;
    }
  }

  return count;
}

/**
 * Counts distinct library titles (media ids) the supplied events were recorded
 * against.
 *
 * Identity is the authoritative `mediaId` -- the media-table row for the owning
 * TV show or the movie -- so:
 *
 * - Many episode events from the same show share one `mediaId` and count once.
 * - Repeated movie events for the same movie share one `mediaId` and count once.
 * - Different shows, and a show versus a movie, carry different `mediaId`s and
 *   count separately.
 * - Legacy unattributed events carry no `mediaId` and are excluded; episode ids
 *   are never treated as titles.
 *
 * The value is derived only from the supplied events, never from current library
 * state, so a title that still has recorded events continues to be counted by
 * its events. Empty input yields 0.
 */
export function countUniqueMedia(
  events: readonly WatchActivityEvent[],
): number {
  const mediaIds = new Set<number>();

  for (const event of events) {
    if (event.mediaId !== undefined) {
      mediaIds.add(event.mediaId);
    }
  }

  return mediaIds.size;
}