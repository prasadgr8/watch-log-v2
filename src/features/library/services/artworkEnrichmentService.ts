/**
 * Library — artwork enrichment service.
 *
 * Repairs missing TMDB artwork metadata on existing persisted Media records so
 * widgets such as Continue Watching can display locally stored artwork.
 *
 * Reuses the existing media repository and TMDB movie/TV detail services.
 * Network access occurs only when this enrichment operation is explicitly
 * invoked; it is never triggered during Dashboard rendering.
 *
 * Follows the established `genreEnrichmentService` conventions: injectable
 * network availability, per-candidate failure isolation, and a compact result
 * contract.
 */

import { mediaRepository } from "../../../database/repositories";

import { tmdbMovieService, tmdbTvService } from "../../../services/tmdb";

import type { Media, PersistedMedia } from "../../../types";

export interface ArtworkEnrichmentFailure {
  /** Title of the media record that could not be enriched. */
  title: string;
  /** Useful reason describing why enrichment failed. */
  reason: string;
}

export interface ArtworkEnrichmentResult {
  /** Records for which at least one missing artwork field was populated. */
  updatedCount: number;
  /** Records for which TMDB supplied no usable artwork for any missing field. */
  noArtworkCount: number;
  /** Records whose TMDB request failed. */
  failedCount: number;
  /** Records missing artwork that also lack a tmdbId (cannot be fetched). */
  skippedNoTmdbIdCount: number;
  /** Per-record failure details. */
  failures: ArtworkEnrichmentFailure[];
}

export interface EnrichMediaArtworkOptions {
  /** Injectible network availability check. Defaults to browser online status. */
  canUseNetwork?: () => boolean;
  /** Optional progress callback invoked after each candidate is processed. */
  onProgress?: (progress: { completed: number; total: number }) => void;
}

type ArtworkEnrichmentCandidate = PersistedMedia & { tmdbId: number };

function getDefaultNetworkAvailability(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function isArtworkEnrichmentCandidate(
  media: Media,
): media is ArtworkEnrichmentCandidate {
  return (
    media.id !== undefined &&
    media.tmdbId !== undefined &&
    (media.posterPath === undefined || media.backdropPath === undefined)
  );
}

/**
 * Enriches existing persisted Media records with missing artwork metadata from
 * TMDB.
 *
 * Existing artwork is never overwritten: if only `posterPath` is missing, only
 * `posterPath` is attempted; if only `backdropPath` is missing, only
 * `backdropPath` is attempted. Records with both fields populated are not
 * fetched. Records without a `tmdbId` are skipped.
 */
export async function enrichMediaArtwork(
  options: EnrichMediaArtworkOptions = {},
): Promise<ArtworkEnrichmentResult> {
  const allMedia = await mediaRepository.getAll();

  const candidates = allMedia.filter(isArtworkEnrichmentCandidate);

  // If no candidates need enrichment, return early without network check.
  // This allows zero-candidate scenarios to succeed offline.
  if (candidates.length === 0) {
    const skippedNoTmdbIdCount = allMedia.filter(
      (media) =>
        (media.posterPath === undefined || media.backdropPath === undefined) &&
        media.tmdbId === undefined,
    ).length;

    return {
      updatedCount: 0,
      noArtworkCount: 0,
      failedCount: 0,
      skippedNoTmdbIdCount,
      failures: [],
    };
  }

  const canUseNetwork = options.canUseNetwork ?? getDefaultNetworkAvailability;

  if (!canUseNetwork()) {
    throw new Error(
      "Syncing TMDB artwork requires an internet connection. Please go online and try again.",
    );
  }

  const total = candidates.length;
  let completed = 0;

  const skippedNoTmdbIdCount = allMedia.filter(
      (media) =>
        (media.posterPath === undefined || media.backdropPath === undefined) &&
        media.tmdbId === undefined,
    ).length;

  const result: ArtworkEnrichmentResult = {
    updatedCount: 0,
    noArtworkCount: 0,
    failedCount: 0,
    skippedNoTmdbIdCount,
    failures: [],
  };

  for (const media of candidates) {
    try {
      const details =
        media.mediaType === "movie"
          ? await tmdbMovieService.getMovieDetails(media.tmdbId)
          : await tmdbTvService.getTvDetails(media.tmdbId);

      // Only populate fields that are missing locally and available from TMDB.
      // TMDB `null` means artwork is unavailable: we never write `null` into
      // the local optional artwork fields.
      const changes: Partial<Media> = {};
      if (media.posterPath === undefined && details.poster_path) {
        changes.posterPath = details.poster_path;
      }
      if (media.backdropPath === undefined && details.backdrop_path) {
        changes.backdropPath = details.backdrop_path;
      }

      if (Object.keys(changes).length > 0) {
        await mediaRepository.update(media.id, changes);
        result.updatedCount += 1;
      } else {
        result.noArtworkCount += 1;
      }
    } catch (enrichError) {
      // One failed candidate must not prevent the rest from being processed.
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
