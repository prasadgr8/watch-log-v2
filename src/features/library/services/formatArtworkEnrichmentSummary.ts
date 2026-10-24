/**
 * Library artwork enrichment — result summary formatting.
 *
 * Pure helper that renders an {@link ArtworkEnrichmentResult} as a human
 * readable completion summary. Singular/plural agreement is handled here so
 * consuming UI code (for example, `LibraryPage`) stays focused on orchestration.
 *
 * Export location: shared across the feature so unit tests and the UI handler
 * always format results the same way.
 */

import type { ArtworkEnrichmentResult } from "./artworkEnrichmentService";

/**
 * Formats an artwork enrichment result into a completion summary string.
 *
 * - Every category with a nonzero count is included in the returned summary.
 * - Categories with zero counts are omitted from the summary text.
 * - Singular/plural agreement is applied to each category label.
 * - When all counts are zero, a dedicated "up to date" message is returned so
 *   callers can surface that the artwork state is already complete.
 *
 * @param result - The enrichment result produced by
 *   {@link enrichMediaArtwork}.
 * @returns A single-space-joined summary string covering every applicable
 *   outcome, or the all-up-to-date message when all counts are zero.
 */
export function formatArtworkEnrichmentSummary(result: ArtworkEnrichmentResult): string {
  const parts: string[] = [];

  if (result.updatedCount > 0) {
    parts.push(
      `Updated artwork for ${result.updatedCount} ${result.updatedCount === 1 ? "item" : "items"}.`,
    );
  }

  if (result.noArtworkCount > 0) {
    parts.push(
      `${result.noArtworkCount} ${result.noArtworkCount === 1 ? "item has" : "items have"} no artwork.`,
    );
  }

  if (result.skippedNoTmdbIdCount > 0) {
    parts.push(
      `${result.skippedNoTmdbIdCount} ${result.skippedNoTmdbIdCount === 1 ? "item skipped" : "items skipped"} - no TMDB ID.`,
    );
  }

  if (result.failedCount > 0) {
    parts.push(
      `${result.failedCount} ${result.failedCount === 1 ? "record failed" : "records failed"} to sync.`,
    );
  }

  return parts.length > 0 ? parts.join(" ") : "No artwork missing. All records are up to date.";
}
