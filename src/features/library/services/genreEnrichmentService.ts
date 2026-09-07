import { mediaRepository } from "../../../database/repositories";

import {
  mapTmdbGenreIdsToNames,
  tmdbMovieService,
  tmdbTvService,
} from "../../../services/tmdb";

import type { Media, PersistedMedia } from "../../../types";

export interface GenreEnrichmentFailure {
  title: string;
  reason: string;
}

export interface GenreEnrichmentResult {
  updatedCount: number;
  noGenresCount: number;
  failedCount: number;
  skippedNoTmdbIdCount: number;
  failures: GenreEnrichmentFailure[];
}

export interface GenreEnrichmentProgress {
  completed: number;
  total: number;
}

export interface EnrichLibraryGenresOptions {
  canUseNetwork?: () => boolean;
  onProgress?: (progress: GenreEnrichmentProgress) => void;
}

type GenreEnrichmentCandidate = PersistedMedia & { tmdbId: number };

function getDefaultNetworkAvailability(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/*
 * Enrichment candidates are records that carry a TMDB ID but have never had
 * their genres populated. `genres: []` is the persistent marker for "checked
 * but no usable genres", so those records are never re-fetched, and records
 * that already have genres are never overwritten.
 */
function isEnrichmentCandidate(
  media: Media,
): media is GenreEnrichmentCandidate {
  return (
    media.id !== undefined &&
    media.tmdbId !== undefined &&
    media.genres === undefined
  );
}

export async function enrichLibraryGenres(
  options: EnrichLibraryGenresOptions = {},
): Promise<GenreEnrichmentResult> {
  const canUseNetwork = options.canUseNetwork ?? getDefaultNetworkAvailability;

  const allMedia = await mediaRepository.getAll();

  const candidates = allMedia.filter(isEnrichmentCandidate);

  const result: GenreEnrichmentResult = {
    updatedCount: 0,
    noGenresCount: 0,
    failedCount: 0,
    skippedNoTmdbIdCount: allMedia.filter(
      (media) => media.genres === undefined && media.tmdbId === undefined,
    ).length,
    failures: [],
  };

  if (!canUseNetwork()) {
    throw new Error(
      "Syncing TMDB genres requires an internet connection. Please go online and try again.",
    );
  }

  const total = candidates.length;
  let completed = 0;

  for (const media of candidates) {
    try {
      const details =
        media.mediaType === "movie"
          ? await tmdbMovieService.getMovieDetails(media.tmdbId)
          : await tmdbTvService.getTvDetails(media.tmdbId);

      const genreIds = (details.genres ?? []).map((genre) => genre.id);
      const genreNames = mapTmdbGenreIdsToNames(genreIds, media.mediaType);

      await mediaRepository.update(media.id, { genres: genreNames });

      if (genreNames.length > 0) {
        result.updatedCount += 1;
      } else {
        result.noGenresCount += 1;
      }
    } catch (enrichError) {
      result.failedCount += 1;
      result.failures.push({
        title: media.title,
        reason:
          enrichError instanceof Error
            ? enrichError.message
            : String(enrichError),
      });
    } finally {
      completed += 1;
      options.onProgress?.({ completed, total });
    }
  }

  return result;
}
