/**
 * Pure genre-count analytics derived from recorded watch history and media.
 *
 * This module answers "how many distinct genres are represented by titles
 * that have recorded watch events?" by:
 *
 * - Considering only attributed watch events (those with a `mediaId`).
 * - Counting each title's genres at most once, regardless of how many events
 *   the title has.
 * - Counting each distinct genre across all such titles at most once.
 * - Excluding legacy/unattributed events (no `mediaId`).
 * - Leaving missing genre metadata missing (no synthetic "Unknown" genre).
 *
 * Every function here is a total, deterministic derivation over in-memory
 * data:
 *
 * - No IndexedDB access, no repository imports, no React, no network, no writes.
 * - No clock.
 * - Input arrays are never mutated.
 * - Empty event input yields `isAvailable: false`.
 */

import type { Media } from "../../types";
import type { WatchActivityEvent } from "./types";

/** The result of counting distinct genres across titles with watch events. */
export interface GenreCountResult {
  readonly count: number;
  readonly isAvailable: boolean;
}

/**
 * Counts distinct genres represented by titles that have recorded watch
 * events.
 *
 * A title contributes each of its genres at most once, and multiple watch
 * events for the same title do not inflate the count. Legacy unattributed
 * events (no `mediaId`) are excluded. Titles with missing genres contribute
 * nothing; no synthetic "Unknown" genre is created.
 *
 * Returns `isAvailable: false` when there are no recorded watch events.
 */
export function countDistinctGenres(
  events: readonly WatchActivityEvent[],
  media: readonly Media[],
): GenreCountResult {
  const isAvailable = events.length > 0;
  if (!isAvailable) {
    return { count: 0, isAvailable: false };
  }

  // Collect the distinct media ids referenced by attributed watch events.
  const attributedMediaIds = new Set<number>();
  for (const event of events) {
    if (event.mediaId !== undefined) {
      attributedMediaIds.add(event.mediaId);
    }
  }

  // Index media by id for lookup.
  const mediaById = new Map<number, Media>();
  for (const item of media) {
    if (item.id !== undefined) {
      mediaById.set(item.id, item);
    }
  }

  // Collect distinct genres from attributed titles. Missing genres are
  // simply skipped; no synthetic genre is invented.
  const genres = new Set<string>();
  for (const mediaId of attributedMediaIds) {
    const item = mediaById.get(mediaId);
    if (item?.genres) {
      for (const genre of item.genres) {
        genres.add(genre);
      }
    }
  }

  return { count: genres.size, isAvailable: true };
}