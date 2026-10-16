/**
 * Configurable Dashboard — Your Library at a Glance widget data (Step 3).
 *
 * Compact overview of the user's local collection: total titles, TV shows,
 * movies, and distinct genres. Reuses the existing media repository and the
 * shared `calculateLibraryStatistics` projection rather than duplicating
 * collection logic. This is not the full Library screen — "View All" leads
 * there.
 *
 * No IndexedDB access beyond repository reads, no network, no writes.
 */

import {
  calculateLibraryStatistics,
  type LibraryStatistics,
} from "../../../features/statistics/services/statisticsService";

import { mediaRepository } from "../../../database/repositories";

import type { PersistedMedia } from "../../../types";

/** Maximum distinct genres surfaced in the compact widget. */
export const LIBRARY_AT_A_GLANCE_GENRE_LIMIT = 6 as const;

export interface LibraryAtAGlanceData {
  /** Total titles in the local collection. */
  totalTitles: number;
  /** TV shows in the collection. */
  tvShows: number;
  /** Movies in the collection. */
  movies: number;
  /** Distinct genres across the collection. */
  genres: number;
}

function isPersistedMedia(media: { id?: number }): media is PersistedMedia {
  return media.id !== undefined;
}

/**
 * Returns the compact collection snapshot. Empty collection yields zeros.
 */
export async function getLibraryAtAGlanceData(): Promise<LibraryAtAGlanceData> {
  const media = await mediaRepository.getAll();

  const persistedMedia = media.filter(isPersistedMedia);
  const statistics = calculateLibraryStatistics(persistedMedia);

  const allGenres = new Set<string>();
  for (const record of persistedMedia) {
    const genres = record.genres;
    if (genres) {
      for (const genre of genres) {
        allGenres.add(genre);
      }
    }
  }

  return {
    totalTitles: statistics.total,
    tvShows: statistics.tvShows,
    movies: statistics.movies,
    genres: allGenres.size,
  };
}

export { type LibraryStatistics };
