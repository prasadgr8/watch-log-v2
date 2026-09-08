import { mediaRepository } from "../../../database/repositories";

import { tmdbMovieService, type TmdbMovieDetails } from "../../../services/tmdb";

import type { Media, Movie, PersistedMedia, WatchStatus } from "../../../types";

export interface MovieStatusChange {
  userStatus: WatchStatus;
  rating?: number;
  notes?: string;
  watchedAt?: Date | null;
}

export interface MovieDetailsResult {
  media: PersistedMedia & Movie;
  movieDetails: TmdbMovieDetails | null;
  fromLocal: boolean;
}

/*
 * Canonical implementation of movie watchedAt transition semantics.
 * Both LibraryPage and MovieDetailsPage call this function to ensure
 * consistent behavior. Returns the exact Partial<Media> to pass to
 * mediaRepository.update().
 *
 * Semantics:
 * - Becoming completed: assign current time if no watchedAt already exists
 * - Staying completed (no explicit edit): preserve existing watchedAt
 * - Explicit watchedAt edit: persist supplied date (null clears to undefined)
 * - Leaving completed: clear watchedAt (always undefined, never null)
 * - Non-completed states: watchedAt is always undefined
 */
export function applyMovieStatusChange(
  media: Movie,
  change: MovieStatusChange,
): Partial<Media> & { watchedAt?: Date } {
  const changes: Partial<Media> & { watchedAt?: Date } = {
    userStatus: change.userStatus,
  };

  if (change.rating !== undefined) {
    changes.rating = change.rating;
  }

  if (change.notes !== undefined) {
    changes.notes = change.notes;
  }

  const wasCompleted = media.userStatus === "completed";
  const isCompleted = change.userStatus === "completed";

  if (isCompleted) {
    if (change.watchedAt !== undefined) {
      // Explicit edit: persist supplied date (null -> undefined)
      changes.watchedAt = change.watchedAt ?? undefined;
    } else if (!wasCompleted) {
      // Becoming completed: default to now if no existing watchedAt
      changes.watchedAt = media.watchedAt ?? new Date();
    }
    // else: staying completed with no explicit edit -> preserve existing
  } else {
    // Non-completed states: watchedAt is always undefined
    changes.watchedAt = undefined;
  }

  return changes;
}

function getDefaultNetworkAvailability(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function assertValidMovie(
  media: Media | undefined,
): asserts media is PersistedMedia & Movie {
  if (!media || media.id === undefined) {
    throw new Error("Movie was not found in the Library.");
  }

  if (media.mediaType !== "movie") {
    throw new Error("The selected Library item is not a movie.");
  }
}

export interface LoadMovieDetailsOptions {
  canUseNetwork?: () => boolean;
  onLocalData?: (result: MovieDetailsResult) => void;
}

/*
 * Loads movie details offline-first: local IndexedDB data is returned
 * immediately, and optional TMDB enrichment runs when online.
 * TMDB failure never surfaces an error — the local data is returned.
 */
export async function loadMovieDetails(
  mediaId: number,
  options: LoadMovieDetailsOptions = {},
): Promise<MovieDetailsResult> {
  const canUseNetwork = options.canUseNetwork ?? getDefaultNetworkAvailability;

  const storedMedia = await mediaRepository.getById(mediaId);

  assertValidMovie(storedMedia);

  const localResult: MovieDetailsResult = {
    media: storedMedia,
    movieDetails: null,
    fromLocal: true,
  };

  if (options.onLocalData) {
    options.onLocalData(localResult);
  }

  if (!canUseNetwork() || storedMedia.tmdbId === undefined) {
    return localResult;
  }

  try {
    const movieDetails = await tmdbMovieService.getMovieDetails(
      storedMedia.tmdbId,
    );

    return {
      media: storedMedia,
      movieDetails,
      fromLocal: false,
    };
  } catch (loadError) {
    console.error("Failed to refresh movie details from TMDB:", loadError);

    return localResult;
  }
}
